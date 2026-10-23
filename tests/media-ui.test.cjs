const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const flush=async()=>{for(let i=0;i<12;i++)await new Promise(setImmediate);};
async function setup(){
 const dom=new JSDOM('<body></body>',{url:'https://aidenyue.com/viro/',runScripts:'outside-only'}),w=dom.window,context=dom.getInternalVMContext(),renders=[],saved=[];let cancelled=0,fail=false;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.dispatchEvent(new w.Event('close'))};w.confirm=()=>true;
 for(const name of ['load','pause'])w.HTMLMediaElement.prototype[name]=function(){};
 w.HTMLMediaElement.prototype.play=async function(){};Object.defineProperty(w.HTMLMediaElement.prototype,'readyState',{get:()=>1});
 w.URL.createObjectURL=()=> 'blob:'+Math.random();w.URL.revokeObjectURL=()=>{};w.File=File;w.Blob=Blob;
 const model=new vm.SourceTextModule(fs.readFileSync('viro/media-model.js','utf8'),{context});await model.link(()=>{});await model.evaluate();
 const engine=new vm.SyntheticModule(['MediaEngine'],function(){this.setExport('MediaEngine',class{async probe(){return{duration:10,hasAudio:true,hasVideo:false}}async render(clips,sources,format){if(fail)throw Error('Simulated decoder failure');renders.push(JSON.parse(JSON.stringify({clips,format})));return new Uint8Array([1,2,3])}cancel(){cancelled++}})},{context});
 const editor=new vm.SourceTextModule(fs.readFileSync('viro/media-editor.js','utf8'),{context});await editor.link(s=>s.includes('engine')?engine:model);await editor.evaluate();await editor.namespace.openMediaEditor({saveCopy:async f=>saved.push(f)});
 const q=s=>w.document.querySelector(s),click=action=>q(`[data-action="${action}"]`).click();
 async function add(...names){const input=q('#me-import');Object.defineProperty(input,'files',{value:names.map(n=>new File(['original'],n)),configurable:true});input.dispatchEvent(new w.Event('change'));await flush();}
 return{dom,w,q,click,add,renders,saved,editor,fail:()=>fail=true,cancelled:()=>cancelled};
}
test('import, trim, split, reorder, undo, export and save produce a new copy',async()=>{const s=await setup();try{
 await s.add('my original.wav');assert.equal(s.q('#me-format').value,'wav');
 const start=s.q('[data-field="start"]');start.value='2';start.dispatchEvent(new s.w.Event('change',{bubbles:true}));
 s.q('#me-player').currentTime=6;s.click('split');assert.equal(s.w.document.querySelectorAll('[data-clip]').length,2);
 s.q('[data-row="down"]').click();assert.equal(s.q('[data-field="start"]').value,'6.00');
 s.click('undo');assert.equal(s.q('[data-field="start"]').value,'2.00');s.click('redo');
 s.click('export');await flush();assert.equal(s.renders.length,1);assert.deepEqual(s.renders[0].clips.map(c=>[c.start,c.end]),[[6,10],[2,6]]);assert.equal(s.q('#me-result').hidden,false);
 s.click('save');await flush();assert.equal(s.saved.length,1);assert.equal(s.saved[0].name,'my original-edited.wav');assert.equal(s.saved[0].size,3);
 await s.editor.namespace.openMediaEditor({});assert.equal(s.w.document.querySelectorAll('dialog').length,1);
 s.click('close');assert.equal(s.q('dialog'),null);assert.equal(s.cancelled(),1);
 }finally{s.dom.window.close();}});
test('invalid edits and failed exports preserve the timeline for retry',async()=>{const s=await setup();try{await s.add('a.mp3','b.flac');const start=s.q('[data-field="start"]');start.value='99';start.dispatchEvent(new s.w.Event('change',{bubbles:true}));assert.equal(s.q('[data-field="start"]').value,'0.00');assert.match(s.q('#me-status').textContent,/valid in\/out/);s.fail();s.click('export');await flush();assert.match(s.q('#me-status').textContent,/Simulated decoder failure/);assert.equal(s.w.document.querySelectorAll('[data-clip]').length,2);assert.equal(s.q('[data-action="export"]').disabled,false);assert.equal(s.q('#me-result').hidden,true);}finally{s.dom.window.close();}});
