const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const flush=async()=>{for(let i=0;i<12;i++)await new Promise(setImmediate);};
test('owner can create a PIN link, copy, change PIN and revoke all from Files',async()=>{
 const dom=new JSDOM('<section id="tab-files"><button data-share-kind="file" data-share-target="a">Share</button><button id="manage-shares-btn">Shared links</button></section><div id="modal"></div>',{url:'https://aidenyue.com/viro/',runScripts:'outside-only'}),w=dom.window,requests=[];let shares=[];const id='a'.repeat(64);
 w.confirm=()=>true;w.navigator.clipboard={writeText:async value=>{assert.equal(value,`https://aidenyue.com/share/#${id}`);}};
 const m=new vm.SourceTextModule(fs.readFileSync('viro/file-sharing.js','utf8'),{context:dom.getInternalVMContext()});await m.link(()=>{});await m.evaluate();
 m.namespace.initFileSharing({call:async d=>{requests.push(d);if(d.action==='create')shares=[{id,kind:'file',targetId:'a',name:'Report',active:true,hasPin:true}];if(d.action==='revokeAll')shares[0].active=false;return{data:{shares}};},openModal:(html,fn)=>{const root=w.document.querySelector('#modal');root.innerHTML=html;fn(root);},escapeHtml:s=>s,getFiles:()=>[{id:'a',name:'Report'}],getFolders:()=>[]});
 try{
  w.document.querySelector('[data-share-kind]').click();await flush();
  const form=w.document.querySelector('#share-create');form.elements.pin.value='123456';form.dispatchEvent(new w.Event('submit',{cancelable:true}));await flush();assert.equal(requests.find(r=>r.action==='create').pin,'123456');
  w.document.querySelector('[data-copy]').click();await flush();assert.match(w.document.querySelector('#share-status').textContent,/copied/);
  w.document.querySelector('[data-pin]').click();const pinForm=w.document.querySelector('[data-pin-form]');assert.equal(pinForm.hidden,false);pinForm.elements.pin.value='654321';pinForm.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await flush();assert.equal(requests.find(r=>r.action==='pin').pin,'654321');
  w.document.querySelector('#share-revoke-all').click();await flush();assert.match(w.document.querySelector('#share-links').textContent,/Revoked/);
 }finally{w.close();}
});
test('recipient PIN challenge, safe file rendering and revoked download clear the page',async()=>{
 const id='b'.repeat(64),dom=new JSDOM(fs.readFileSync('share/index.html','utf8'),{url:`https://aidenyue.com/share/#${id}`,runScripts:'outside-only'}),w=dom.window;let unlocked=false;
 w.fetch=async(url,opts)=>{const d=JSON.parse(opts.body);assert.equal(d.id,id);let code=200,data;
  if(d.action==='unlock'){if(d.pin!=='1234'){code=401;data={needsPin:true,error:'Enter PIN'};}else{unlocked=true;data={session:'session'};}}
  if(d.action==='list'){assert.equal(unlocked,true);data={name:'Report',folders:[],files:[{id:'f',name:'<img src=x onerror=alert(1)>',pages:[{index:0,name:'report.pdf'}]}]};}
  if(d.action==='download'){code=404;data={error:'This link is unavailable or revoked.'};}
  return{ok:code===200,status:code,json:async()=>data};
 };
 const context=dom.getInternalVMContext(),config=new vm.SyntheticModule(['firebaseConfig'],function(){this.setExport('firebaseConfig',{projectId:'aidenyue'});},{context});await config.link(()=>{});
 const m=new vm.SourceTextModule(fs.readFileSync('share/share.js','utf8'),{context});await m.link(()=>config);await m.evaluate();
 try{
  const form=w.document.querySelector('#unlock');form.dispatchEvent(new w.Event('submit',{cancelable:true}));await flush();assert.equal(w.document.querySelector('#pin-label').hidden,false);
  w.document.querySelector('#pin').value='1234';form.dispatchEvent(new w.Event('submit',{cancelable:true}));await flush();assert.equal(form.hidden,true);assert.equal(w.document.querySelectorAll('#files img').length,0);assert.equal(w.document.querySelectorAll('#files button').length,1);
  w.document.querySelector('#files button').click();await flush();assert.equal(w.document.querySelector('#files').textContent,'');assert.match(w.document.querySelector('#status').textContent,/revoked/);
 }finally{w.close();}
});
