const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const {webcrypto}=require('node:crypto');const {JSDOM}=require('jsdom');
const source=fs.readFileSync('viro/portal.js','utf8');
const fn=n=>source.match(new RegExp('(?:async )?function '+n+'\\([^\\n]*\\) \\{[\\s\\S]*?\\n\\}'))[0];
test('hostile rich text drops scripts, event attributes, frames and executable links',async()=>{
 const dom=new JSDOM('',{runScripts:'outside-only'});const m=new vm.SourceTextModule(fs.readFileSync('viro/content-security.js','utf8'),{context:dom.getInternalVMContext()});await m.link(()=>{});await m.evaluate();
 const clean=m.namespace.sanitizeRichHtml('<p onclick="evil()">Hello <b>world</b></p><img src=x onerror="evil()"><svg onload="evil()"></svg><iframe srcdoc="bad"></iframe><a href="javascript:evil()">bad</a><a href="https://example.com">good</a>');
 assert.doesNotMatch(clean,/onclick|onerror|script:|<svg|<iframe|<img/);assert.match(clean,/<b>world<\/b>/);assert.match(clean,/rel="noopener noreferrer"/);
 for(const url of ['javascript:alert(1)','data:text/html,bad','file:///etc/passwd','//evil.test'])assert.equal(m.namespace.safeResourceUrl(url),'');dom.window.close();
});
test('vault key remains compatible with existing data but cannot be exported',async()=>{
 const ctx=vm.createContext({crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,window:{btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary')}});vm.runInContext(['bufToB64','b64ToBuf','deriveKey','encryptPayload','decryptPayload'].map(fn).join('\n'),ctx);
 const salt=Buffer.alloc(16,7).toString('base64'),key=await ctx.deriveKey('test-only-password',salt),encrypted=await ctx.encryptPayload(key,{secret:'sample'});const other=await ctx.deriveKey('test-only-password',salt);assert.equal((await ctx.decryptPayload(other,encrypted.iv,encrypted.ciphertext)).secret,'sample');await assert.rejects(webcrypto.subtle.exportKey('raw',key));
});
test('locking the vault destroys decrypted fields and memory references',()=>{
 const dom=new JSDOM('<div data-vault-fields="one">private sample</div>');const ctx=vm.createContext({document:dom.window.document,vaultUnlocked:true,encryptionKey:{},revealedVaultPayloads:new Map([['one',{secret:'sample'}]])});vm.runInContext(fn('lockVault'),ctx);ctx.lockVault();assert.equal(ctx.encryptionKey,null);assert.equal(ctx.vaultUnlocked,false);assert.equal(ctx.revealedVaultPayloads.size,0);assert.equal(dom.window.document.querySelector('div').textContent,'');dom.window.close();
});
