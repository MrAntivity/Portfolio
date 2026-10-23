const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {Writable,Readable}=require('node:stream');
const core=require('../functions/file-sharing-core');
function setup(){
 const records=new Map();let downloads=0;
 const snap=(path)=>({id:path.split('/').at(-1),exists:records.has(path),data:()=>records.get(path)});
 const doc=path=>({path,get:async()=>snap(path),create:async data=>{if(records.has(path))throw Error('exists');records.set(path,data);},update:async data=>records.set(path,{...records.get(path),...data}),collection:name=>collection(path+'/'+name)});
 const collection=(path,filters=[],max=Infinity)=>({doc:id=>doc(path+'/'+id),where:(key,op,value)=>collection(path,[...filters,[key,value]],max),limit:n=>collection(path,filters,n),get:async()=>{const docs=[...records.keys()].filter(p=>p.startsWith(path+'/')&&p.slice(path.length+1).indexOf('/')<0&&filters.every(([k,v])=>records.get(p)[k]===v)).slice(0,max).map(snap);return{docs,size:docs.length};}});
 const db={doc,collection,runTransaction:async fn=>fn({get:ref=>ref.get(),set:(ref,data)=>records.set(ref.path,data)})};
 const firestore=()=>db;firestore.Timestamp={fromMillis:n=>n};
 const admin={firestore,storage:()=>({bucket:()=>({file:()=>({getMetadata:async()=>[{size:4}],createReadStream:()=>{downloads++;return Readable.from(['file']);}})})})};
 class HttpsError extends Error{constructor(code,msg){super(msg);this.code=code;}}
 const exports={};vm.runInNewContext(fs.readFileSync('functions/file-sharing.js','utf8'),{exports,require:name=>name==='firebase-functions/v2/https'?{onCall:(o,f)=>f,onRequest:(o,f)=>f,HttpsError}:name==='firebase-admin'?admin:name==='./portal-auth'?{assertPortalOwner:r=>{if(r.auth?.token?.email!=='aiden@viro.local')throw new HttpsError('permission-denied','Owner only');}}:core,Date,console});
 const owner={uid:'owner',token:{email:'aiden@viro.local'}};
 const manage=data=>exports.manageFileShares({auth:owner,data});
 async function access(body){
  let data,code=200,bytes='';const res=new Writable({write(chunk,enc,cb){bytes+=chunk.toString();cb();}});res.headersSent=false;res.set=()=>res;res.status=n=>{code=n;return res;};res.json=d=>{data=d;res.end();return res;};
  const finished=new Promise(resolve=>res.on('finish',resolve));
  await exports.fileShareAccess({method:'POST',body,ip:'127.0.0.1',on:()=>{}},res);await finished;return{code,data,bytes};
 }
 records.set('users/owner/folders/root',{name:'Shared root'});records.set('users/owner/folders/child',{name:'Inside',parentId:'root'});records.set('users/owner/folders/other',{name:'Private'});
 records.set('users/owner/files/a',{name:'File A',folderId:'child',pages:[{fileName:'a.pdf',storagePath:'users/owner/files/a',downloadURL:'SECRET_DOWNLOAD_TOKEN',size:4}]});
 records.set('users/owner/files/b',{name:'Private B',folderId:'other',storagePath:'users/owner/files/b'});
 return {records,manage,access,downloads:()=>downloads,exports};
}
test('PIN changes invalidate unlocked sessions; revoke blocks listing and download',async()=>{
 const x=setup(),share=await x.manage({action:'create',kind:'folder',targetId:'root',pin:'123456'});
 assert.equal(share.hasPin,true);assert.equal(JSON.stringify(share).includes('pinHash'),false);
 assert.equal((await x.access({action:'unlock',id:share.id,pin:'000000'})).code,401);
 const session=(await x.access({action:'unlock',id:share.id,pin:'123456'})).data.session;
 const listing=await x.access({action:'list',id:share.id,session});assert.equal(listing.data.files.length,1);assert.equal(JSON.stringify(listing.data).includes('SECRET'),false);assert.equal(JSON.stringify(listing.data).includes('storagePath'),false);
 assert.equal((await x.access({action:'download',id:share.id,session,fileId:'b',page:0})).code,404);
 assert.equal((await x.access({action:'download',id:share.id,session,fileId:'a',page:0})).bytes,'file');
 await x.manage({action:'pin',id:share.id,pin:'654321'});
 assert.equal((await x.access({action:'download',id:share.id,session,fileId:'a',page:0})).code,401);
 const next=(await x.access({action:'unlock',id:share.id,pin:'654321'})).data.session;
 await x.manage({action:'revoke',id:share.id});assert.equal((await x.access({action:'list',id:share.id,session:next})).code,404);
 assert.equal((await x.access({action:'download',id:share.id,session:next,fileId:'a',page:0})).code,404);assert.equal(x.downloads(),1);
});
test('revoke-all blocks every old link; new public links work without PIN',async()=>{
 const x=setup();const a=await x.manage({action:'create',kind:'file',targetId:'a',pin:''}),b=await x.manage({action:'create',kind:'folder',targetId:'root',pin:''});
 await x.manage({action:'revokeAll'});
 for(const s of [a,b])assert.equal((await x.access({action:'unlock',id:s.id})).code,404);
 const fresh=await x.manage({action:'create',kind:'file',targetId:'a',pin:''});assert.equal((await x.access({action:'unlock',id:fresh.id})).code,200);
 assert.equal((await x.manage({action:'list'})).shares.filter(s=>s.active).length,1);
});
test('folder membership is checked again on downloads, and private storage paths are rejected',async()=>{
 const x=setup(),s=await x.manage({action:'create',kind:'folder',targetId:'root',pin:''});const session=(await x.access({action:'unlock',id:s.id})).data.session;
 x.records.get('users/owner/files/a').folderId='other';assert.equal((await x.access({action:'download',id:s.id,session,fileId:'a',page:0})).code,404);
 x.records.get('users/owner/files/a').folderId='child';x.records.get('users/owner/files/a').pages[0].storagePath='users/someoneelse/files/secret';assert.equal((await x.access({action:'download',id:s.id,session,fileId:'a',page:0})).code,404);
 assert.equal(x.downloads(),0);
});
test('anonymous visitors cannot create shares; repeated unlock attempts are throttled',async()=>{
 const x=setup();await assert.rejects(()=>x.exports.manageFileShares({data:{action:'list'},auth:{uid:'guest',token:{}}}),{code:'permission-denied'});
 const s=await x.manage({action:'create',kind:'file',targetId:'a',pin:'1234'});
 for(let n=0;n<30;n++)assert.equal((await x.access({action:'unlock',id:s.id,pin:'9999'})).code,401);
 assert.equal((await x.access({action:'unlock',id:s.id,pin:'1234'})).code,429);
});
test('sessions expire and cannot be reused for another link',()=>{
 const s={id:'a',sessionKey:core.random()},now=Date.now(),token=core.session(s,now);
 assert.equal(core.validSession(token,s,now),true);assert.equal(core.validSession(token,s,now+3600001),false);assert.equal(core.validSession(token,{...s,id:'b'},now),false);
});
