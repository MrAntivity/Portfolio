const {onCall,onRequest,HttpsError}=require('firebase-functions/v2/https');
const admin=require('firebase-admin');
const {assertPortalOwner}=require('./portal-auth');
const core=require('./file-sharing-core');
const db=()=>admin.firestore();
const shares=()=>db().collection('_fileShares');
const settings=uid=>db().doc(`_fileShareOwners/${uid}`);
const fail=(code,message)=>{throw new HttpsError(code,message);};
const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,128}$/.test(id);
async function epoch(uid){return (await settings(uid).get()).data()?.epoch||0;}
const summary=(id,s,current)=>({id,kind:s.kind,targetId:s.targetId,name:s.name,hasPin:!!s.pinHash,active:s.active&&s.epoch===current,createdAt:s.createdAt});
exports.manageFileShares=onCall({cors:true},async request=>{
  assertPortalOwner(request);
  const uid=request.auth.uid,d=request.data||{}, action=d.action;
  if(action==='revokeAll'){
    await db().runTransaction(async tx=>{const ref=settings(uid),snap=await tx.get(ref);tx.set(ref,{epoch:(snap.data()?.epoch||0)+1});});
    return {ok:true};
  }
  const current=await epoch(uid);
  if(action==='list'){
    const result=await shares().where('ownerId','==',uid).limit(501).get();
    if(result.size>500)fail('resource-exhausted','Too many share records. Contact the site owner.');
    return {shares:result.docs.map(s=>summary(s.id,s.data(),current)).sort((a,b)=>b.createdAt-a.createdAt)};
  }
  if(action==='create'){
    if(!['file','folder'].includes(d.kind)||!validId(d.targetId))fail('invalid-argument','Choose a file or folder.');
    const target=await db().doc(`users/${uid}/${d.kind==='file'?'files':'folders'}/${d.targetId}`).get();
    if(!target.exists)fail('not-found','This item no longer exists.');
    let pin;try{pin=await core.pinFields(d.pin??'');}catch(e){fail('invalid-argument',e.message);}
    const id=core.random(),s={ownerId:uid,kind:d.kind,targetId:d.targetId,name:String(target.data().name||'Shared files').slice(0,200),active:true,epoch:current,sessionKey:core.random(),...pin,createdAt:Date.now()};
    await shares().doc(id).create(s);return summary(id,s,current);
  }
  if(!/^[a-f0-9]{64}$/.test(d.id||''))fail('invalid-argument','Invalid share.');
  const ref=shares().doc(d.id), snap=await ref.get(),s=snap.data();
  if(!s||s.ownerId!==uid)fail('not-found','Share not found.');
  if(action==='revoke'){await ref.update({active:false,sessionKey:core.random()});return {ok:true};}
  if(action==='pin'){
    if(!s.active||s.epoch!==current)fail('failed-precondition','This link was revoked. Create a new share link.');
    let pin;try{pin=await core.pinFields(d.pin);}catch(e){fail('invalid-argument',e.message);}
    await ref.update({...pin,sessionKey:core.random()});return {ok:true};
  }
  fail('invalid-argument','Unknown sharing action.');
});
async function activeShare(id){
  if(!/^[a-f0-9]{64}$/.test(id||''))fail('not-found','This link is unavailable or revoked.');
  const s=(await shares().doc(id).get()).data();
  if(!s||!s.active||s.epoch!==await epoch(s.ownerId))fail('not-found','This link is unavailable or revoked.');
  return {...s,id};
}
async function rateLimit(ip){
  const key=core.digest(String(ip||'unknown')),ref=db().doc(`_fileShareAttempts/${key}`),now=Date.now();
  await db().runTransaction(async tx=>{
    const old=(await tx.get(ref)).data(),fresh=!old||old.until<=now;
    if(!fresh&&old.count>=30)fail('resource-exhausted','Too many attempts. Try again in 15 minutes.');
    tx.set(ref,{count:fresh?1:old.count+1,until:fresh?now+15*60*1000:old.until,expiresAt:admin.firestore.Timestamp.fromMillis(now+24*60*60*1000)});
  });
}
async function contents(s){
  const base=db().collection('users').doc(s.ownerId);
  if(s.kind==='file'){
    const f=await base.collection('files').doc(s.targetId).get();
    if(!f.exists)fail('not-found','This file no longer exists.');
    return {name:f.data().name,files:[{...f.data(),id:f.id}],folders:[]};
  }
  const [folderDocs,fileDocs]=await Promise.all([base.collection('folders').limit(2001).get(),base.collection('files').limit(2001).get()]);
  if(folderDocs.size>2000||fileDocs.size>2000)fail('resource-exhausted','This library is too large to share as a folder. Share individual files instead.');
  const folders=folderDocs.docs.map(f=>({...f.data(),id:f.id})),root=folders.find(f=>f.id===s.targetId);
  if(!root)fail('not-found','This folder no longer exists.');
  const scope=core.folderScope(root.id,folders);
  return {name:root.name,folders:folders.filter(f=>scope.has(f.id)),files:fileDocs.docs.map(f=>({...f.data(),id:f.id})).filter(f=>scope.has(f.folderId))};
}
exports.fileShareAccess=onRequest({cors:true,timeoutSeconds:300,memory:'512MiB',maxInstances:5},async(req,res)=>{
  res.set({'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});
  if(req.method!=='POST')return res.status(405).json({error:'Use POST.'});
  try{
    const d=req.body||{};
    if(!['unlock','list','download'].includes(d.action))fail('invalid-argument','Invalid action.');
    if(d.action==='unlock')await rateLimit(req.ip);
    const s=await activeShare(d.id);
    if(d.action==='unlock'){
      if(!await core.checkPin(d.pin,s))return res.status(401).json({error:'Enter the correct PIN to open this link.',needsPin:true});
      return res.json({session:core.session(s)});
    }
    if(!core.validSession(d.session,s))return res.status(401).json({error:'Access expired or the PIN changed. Unlock this link again.',needsPin:true});
    const data=await contents(s);
    if(d.action==='list')return res.json({name:data.name,folders:data.folders.map(f=>({id:f.id,name:f.name,parentId:f.parentId||null})),files:data.files.map(f=>({id:f.id,name:f.name,folderId:f.folderId||null,pages:core.pages(f).map((p,index)=>({index,name:p.fileName||f.name,size:p.size||0}))}))});
    const file=data.files.find(f=>f.id===d.fileId),page=file&&Number.isInteger(d.page)&&core.pages(file)[d.page];
    if(!page||!core.allowedPath(page.storagePath,s.ownerId))fail('not-found','File not available in this share.');
    // Re-check immediately before streaming, including a simultaneous PIN change or revoke.
    const latest=await activeShare(d.id);
    if(!core.validSession(d.session,latest))fail('permission-denied','Access changed. Unlock the link again.');
    const object=admin.storage().bucket('aidenyue.firebasestorage.app').file(page.storagePath);
    const [meta]=await object.getMetadata();
    const name=String(page.fileName||file.name||'download').replace(/[\r\n/\\]/g,'_');
    res.set({'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="download"; filename*=UTF-8''${encodeURIComponent(name).replace(/['()*]/g,c=>'%'+c.charCodeAt(0).toString(16))}`,'Content-Length':String(meta.size)});
    const stream=object.createReadStream();req.on('aborted',()=>stream.destroy());res.on('close',()=>stream.destroy());
    stream.on('error',()=>{if(!res.headersSent)res.status(404).json({error:'File unavailable.'});else res.destroy();});stream.pipe(res);
  }catch(e){
    const code={'not-found':404,'permission-denied':403,'invalid-argument':400,'resource-exhausted':429}[e.code]||500;
    if(!res.headersSent)res.status(code).json({error:code===500?'Sharing is temporarily unavailable. Please try again.':e.message});
  }
});
