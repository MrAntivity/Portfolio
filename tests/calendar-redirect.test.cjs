const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {webcrypto} = require('node:crypto');
const source = fs.readFileSync('viro/calendar-redirect.js','utf8');
const modulePromise = import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
function setup(m) {
 const map = new Map(); const storage = {getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 const origin='https://aidenyue.com';
 const url=new URL(m.beginCalendarRedirect({origin,uid:'owner',clientId:'client',storage,crypto:webcrypto,now:1000}));
 const params=new URLSearchParams({state:url.searchParams.get('state'),code:'one-time-code'});
 return {storage,origin,params,uid:'owner',now:2000,url};
}
test('full-page OAuth requests offline consent with exact callback and consumes state once',async()=>{
 const m=await modulePromise;const s=setup(m);
 assert.equal(s.url.searchParams.get('access_type'),'offline');
 assert.equal(s.url.searchParams.get('redirect_uri'),'https://aidenyue.com/viro/calendar-connect/');
 assert.equal(s.url.searchParams.get('state').length,64);
 assert.deepEqual(m.consumeCalendarRedirect(s),{code:'one-time-code',redirectUri:'https://aidenyue.com/viro/calendar-connect/'});
 assert.throws(()=>m.consumeCalendarRedirect(s));
});
test('rejects expired, wrong-user, tampered state and origin callbacks before exchange',async()=>{
 const m=await modulePromise;
 for(const overrides of [{now:1000000},{uid:'other'},{uid:null},{origin:'https://evil.example'},{params:new URLSearchParams({code:'code',state:'wrong'})}]) assert.throws(()=>m.consumeCalendarRedirect({...setup(m),...overrides}));
});
test('Google denial and missing code cannot connect',async()=>{
 const m=await modulePromise;
 for(const denied of [true,false]) {const s=setup(m);s.params.delete('code');if(denied)s.params.set('error','access_denied');assert.throws(()=>m.consumeCalendarRedirect(s));}
});
test('callback scrubs URL before loading dependencies and guards owner',()=>{
 const html=fs.readFileSync('viro/calendar-connect/index.html','utf8');
 assert.ok(html.indexOf('history.replaceState')<html.indexOf('src="./callback.js"'));
 const js=fs.readFileSync('viro/calendar-connect/callback.js','utf8');
 assert.ok(js.indexOf('await auth.authStateReady()')<js.indexOf('consumeCalendarRedirect({'));
 assert.match(js,/user.email !== PORTAL_ACCOUNT_EMAIL/);
 assert.match(fs.readFileSync('functions/index.js','utf8'),/'https:\/\/aidenyue.com\/viro\/calendar-connect\/'/);
});
