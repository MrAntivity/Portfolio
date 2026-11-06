const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {refreshGoogleToken}=require('../functions/calendar-oauth');
const base={refreshToken:'test-refresh',clientId:'test-client',clientSecret:'test-secret',wait:async()=>{}};
const response=(status,data)=>({status,ok:status===200,json:async()=>data});
test('revoked refresh token requests reauthorization without useless retries',async()=>{
 let calls=0;await assert.rejects(refreshGoogleToken({...base,fetchImpl:async()=>{calls++;return response(400,{error:'invalid_grant'});}}),e=>e.code==='failed-precondition'&&e.reason==='reconnect-required');assert.equal(calls,1);
});
test('OAuth configuration failures are not presented as user disconnections',async()=>{
 await assert.rejects(refreshGoogleToken({...base,fetchImpl:async()=>response(401,{error:'invalid_client'})}),e=>e.reason==='oauth-configuration');
});
test('temporary Google failure retries once then returns a working token',async()=>{
 let calls=0;const result=await refreshGoogleToken({...base,fetchImpl:async()=>++calls===1?response(503,{}):response(200,{access_token:'test-access',expires_in:3600})});assert.equal(calls,2);assert.equal(result.access_token,'test-access');
});
test('network outages stop after two attempts with retry guidance',async()=>{
 let calls=0;await assert.rejects(refreshGoogleToken({...base,fetchImpl:async()=>{calls++;throw Error('network');}}),e=>e.code==='unavailable');assert.equal(calls,2);
});
test('refresh sends form credentials only to Google and returns no token body on failure',async()=>{
 await assert.rejects(refreshGoogleToken({...base,fetchImpl:async(url,opts)=>{assert.equal(url,'https://oauth2.googleapis.com/token');assert.equal(opts.body.get('grant_type'),'refresh_token');assert.ok(opts.signal);return response(400,{error:'invalid_grant',refresh_token:'do-not-expose'});}}),e=>!e.message.includes('do-not-expose'));
});
test('popup code exchange uses the calling origin instead of legacy postmessage',()=>{
 const source=fs.readFileSync('viro/portal.js','utf8');assert.match(source,/callGoogleCalendarConnect\(\{ code: response.code, redirectUri: location.origin \}\)/);
 const backend=fs.readFileSync('functions/index.js','utf8');assert.doesNotMatch(backend,/redirect_uri:.*postmessage/);
});
