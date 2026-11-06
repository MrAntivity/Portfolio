const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync('viro/portal.js', 'utf8');
const fn = name => source.match(new RegExp('function ' + name + '\\([^\\n]*\\) \\{[\\s\\S]*?\\n\\}'))[0];
const routes = ['overview','todos','birthdays','contacts','calendar','files','budget','vault'];
function harness(url, signedIn = true) {
 const dom = new JSDOM('', {url});
 const user = {uid:'owner', email:'owner@example.test'};
 const ctx = vm.createContext({location:dom.window.location,history:dom.window.history,PORTAL_TAB_NAMES:routes,PORTAL_ACCOUNT_EMAIL:user.email,currentUser:signedIn?user:null,auth:{currentUser:signedIn?user:null},vaultUnlocked:false,shown:[],switchTab:tab=>ctx.shown.push(tab)});
 vm.runInContext(['portalPath','hasPortalSession','pushTab','applyTabFromLocation'].map(fn).join('\n'),ctx);
 return {dom,ctx};
}
test('every direct route serves the same hidden, authenticated shell with stable asset URLs',()=>{
 const template = fs.readFileSync('viro/index.html','utf8');
 for (const route of routes) {
  const html = fs.readFileSync(`viro/${route}/index.html`,'utf8');assert.equal(html,template);
  const dom = new JSDOM(html,{url:`https://aidenyue.com/viro/${route}/`});
  assert.equal(dom.window.document.getElementById('portal').hidden,true);
  assert.equal(dom.window.document.querySelector('base').href,'https://aidenyue.com/viro/');dom.window.close();
 }
});
test('direct routes and legacy bookmarks normalize to clean paths',()=>{
 for(const [url,wanted] of [['/viro/contacts/','contacts'],['/viro/#contacts','contacts'],['/viro/','overview'],['/viro/vault/','overview']]){
  const {dom,ctx}=harness('https://aidenyue.com'+url);ctx.applyTabFromLocation(true);
  assert.equal(dom.window.location.pathname,'/viro/'+wanted);assert.equal(dom.window.location.hash,'');assert.equal(ctx.shown[0],wanted);dom.window.close();
 }
});
test('navigation creates real paths and restores a history route',()=>{
 const {dom,ctx}=harness('https://aidenyue.com/viro/overview');ctx.pushTab('contacts');assert.equal(dom.window.location.pathname,'/viro/contacts');
 dom.window.history.replaceState({},'','/viro/files');ctx.applyTabFromLocation(false);assert.equal(ctx.shown.at(-1),'files');dom.window.close();
});
test('signed-out, expired and wrong-account sessions cannot navigate to private panels',()=>{
 for(const state of ['signed-out','expired','wrong-account']){
  const {dom,ctx}=harness('https://aidenyue.com/viro/contacts',state!=='signed-out');
  if(state==='expired')ctx.auth.currentUser=null;
  if(state==='wrong-account')ctx.auth.currentUser={uid:'guest',email:'guest@example.test'};
  ctx.applyTabFromLocation(true);ctx.pushTab('files');assert.deepEqual(ctx.shown,[]);assert.equal(dom.window.location.pathname,'/viro/contacts');dom.window.close();
 }
});
test('sign-out during the greeting cannot reveal or start the portal',()=>{
 const user={uid:'owner'};const callbacks=[];
 const ctx=vm.createContext({hasPortalSession:()=>!!ctx.currentUser,currentUser:user,loginScreen:{},document:{getElementById:()=>({})},getGreeting:()=>'',greetingText:{},greetingLoader:{classList:{add(){}}},window:{matchMedia:()=>({matches:false}),setTimeout:f=>callbacks.push(f)},portalEl:{hidden:true},startPortal:()=>{throw Error('Must not start');}});
 vm.runInContext(fn('enterPortal'),ctx);ctx.enterPortal();ctx.currentUser=null;callbacks[0]();assert.equal(ctx.portalEl.hidden,true);
});
