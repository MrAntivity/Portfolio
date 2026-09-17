// DOM integration tests use sample data only; no production Firebase calls or browser profile.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
async function page({failSecondUpload = false} = {}) {
 const dom = new JSDOM(fs.readFileSync('trip/index.html','utf8'),{url:'https://preview.invalid/trip/?demo=1',runScripts:'outside-only',pretendToBeVisual:true});
 const w = dom.window, context = dom.getInternalVMContext();
 w.HTMLDialogElement.prototype.showModal = function() { this.open = true; };
 w.HTMLDialogElement.prototype.close = function() { this.open = false; this.dispatchEvent(new w.Event('close')); };
 let blobs=0; w.URL.createObjectURL = () => `blob:preview-${++blobs}`;
 const modules = new Map(); let uploads=0;
 async function load(filename) {
  const file = path.resolve(filename); if (modules.has(file)) return modules.get(file);
  if (file.endsWith('/photos.js')) {
   const m = new vm.SyntheticModule(['preparePhoto'], function(){ this.setExport('preparePhoto',async f=>({blob:f,width:100,height:100})); },{context}); modules.set(file,m); await m.link(()=>{}); return m;
  }
  const m = new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context,identifier:file,importModuleDynamically:async (specifier, parent) => {
   const imported = await load(path.resolve(path.dirname(parent.identifier),specifier)); if (imported.status === 'linked') await imported.evaluate();
   if (specifier === './preview-data.js' && failSecondUpload) {
    const wrapped = new vm.SyntheticModule(Object.keys(imported.namespace),function(){for (const key of Object.keys(imported.namespace)) this.setExport(key,key === 'uploadPhoto' ? async (...args)=>{if (++uploads === 2) throw new Error('Simulated interrupted upload'); return imported.namespace.uploadPhoto(...args);} : imported.namespace[key]);},{context}); await wrapped.link(()=>{}); await wrapped.evaluate(); return wrapped;
   }
   return imported;
  }}); modules.set(file,m); await m.link((specifier,parent)=>load(path.resolve(path.dirname(parent.identifier),specifier))); return m;
 }
 const main=await load('trip/trip.js'); await main.evaluate();
 return {w,dom,doc:w.document,async flush(){for(let i=0;i<20;i++) await new Promise(setImmediate);}};
}
function fillTrip(p, name) {
 const form=p.doc.querySelector('#trip-form');
 const values={title:name,authorName:'Test Friend',locationLabel:'Boston',address:'',country:'United States',lat:'42.36',lng:'-71.06',startDate:'2026-09-01',endDate:'2026-09-03',people:'Aiden, Test Friend',description:'A safe local test story.',excursions:'Harbor walk\nDinner'};
 for(const [key,value] of Object.entries(values)) form.elements[key].value=value;
 return form;
}
test('journal filters, opens details, shows excursions, navigates photos and themes',async()=>{
 const p=await page(); try {
  assert.equal(p.doc.querySelectorAll('.trip-card').length,3);
  const cover = p.doc.querySelector('.card-image img'); cover.dispatchEvent(new p.w.Event('error'));
  assert.equal(cover.hidden,true); assert.equal(cover.parentElement.querySelector('.cover-placeholder').hidden,false);
  const search=p.doc.querySelector('#search'); search.value='Kyoto'; search.dispatchEvent(new p.w.Event('input')); assert.equal(p.doc.querySelectorAll('.trip-card').length,1);
  p.doc.querySelector('[data-open-trip]').click(); await p.flush();
  assert.match(p.doc.querySelector('#detail-title').textContent,/long way/); assert.equal(p.doc.querySelectorAll('.excursion').length,2);
  p.doc.querySelector('[data-view-photo]').click(); await p.flush(); assert.equal(p.doc.querySelector('#lightbox').open,true); assert.equal(p.doc.querySelector('#photo-position').textContent,'1 / 4');
  p.doc.querySelector('#next-photo').click(); await p.flush(); assert.equal(p.doc.querySelector('#photo-position').textContent,'2 / 4');
  p.doc.querySelector('#theme-toggle').click(); assert.equal(p.doc.body.dataset.theme,'light');
 } finally {p.dom.window.close();}
});
test('a valid new trip enters the journal once and invalid dates preserve the form',async()=>{
 const p=await page(); try {
  p.doc.querySelector('[data-new-trip]').click();
  const emptyForm=p.doc.querySelector('#trip-form');
  emptyForm.elements.lat.value='42.36'; emptyForm.elements.lat.dispatchEvent(new p.w.Event('change'));
  assert.equal(emptyForm.elements.lng.value,'','Entering latitude must not turn blank longitude into zero');
  emptyForm.elements.lng.value='200'; emptyForm.elements.lng.dispatchEvent(new p.w.Event('change'));
  assert.equal(emptyForm.elements.lng.value,'200','Invalid manual coordinates must remain invalid rather than silently moving the pin');
  const form=fillTrip(p,'A test memory');
  form.elements.endDate.value='2026-08-01'; form.dispatchEvent(new p.w.Event('submit',{cancelable:true})); await p.flush();
  assert.match(p.doc.querySelector('#form-error').textContent,/dates/); assert.equal(p.doc.querySelectorAll('.trip-card').length,3);
  form.elements.endDate.value='2026-09-03'; form.dispatchEvent(new p.w.Event('submit',{cancelable:true})); await p.flush();
  assert.equal(p.doc.querySelectorAll('.trip-card').length,4); assert.equal(p.doc.querySelector('#detail-title').textContent,'A test memory'); assert.equal(p.doc.querySelectorAll('.person-chip').length,2);
 } finally {p.dom.window.close();}
});
test('partial photo failure keeps the trip and retries only remaining photos',async()=>{
 const p=await page({failSecondUpload:true}); try {
  p.doc.querySelector('[data-new-trip]').click(); const form=fillTrip(p,'Upload retry memory');
  const input=p.doc.querySelector('#initial-photos'); Object.defineProperty(input,'files',{value:[new p.w.File(['a'],'one.jpg',{type:'image/jpeg'}),new p.w.File(['b'],'two.jpg',{type:'image/jpeg'})]}); input.dispatchEvent(new p.w.Event('change'));
  form.dispatchEvent(new p.w.Event('submit',{cancelable:true})); await p.flush(); assert.match(p.doc.querySelector('#form-error').textContent,/trip is saved/); assert.equal(p.doc.querySelectorAll('.trip-card').length,4);
  form.dispatchEvent(new p.w.Event('submit',{cancelable:true})); await p.flush(); assert.equal(p.doc.querySelectorAll('.trip-card').length,4); assert.equal(p.doc.querySelectorAll('.gallery-photo').length,2);
 } finally {p.dom.window.close();}
});
function dropPhotos(p, target, files, type='drop') {
 const event=new p.w.Event(type,{bubbles:true,cancelable:true});
 Object.defineProperty(event,'dataTransfer',{value:{types:['Files'],files,dropEffect:'none'}});
 target.dispatchEvent(event); return event;
}
test('dropping onto a memory card opens upload and saves dropped HEIC without a file-picker selection',async()=>{
 const p=await page(); try {
  const card=p.doc.querySelector('.trip-card');
  const file=new p.w.File(['heic'],'IMG.HEIC',{type:''});
  dropPhotos(p,card,[file],'dragover'); assert.equal(card.classList.contains('drag-over'),true);
  assert.equal(dropPhotos(p,card,[file]).defaultPrevented,true);
  assert.equal(p.doc.querySelector('#upload-dialog').open,true);
  assert.equal(p.doc.querySelector('#more-photos').required,false);
  const form=p.doc.querySelector('#photo-form'); form.elements.uploaderName.value='Drop tester';
  assert.equal(form.checkValidity(),true);
  form.dispatchEvent(new p.w.Event('submit',{cancelable:true})); await p.flush();
  assert.equal(p.doc.querySelector('#upload-dialog').open,false);
  assert.equal(p.doc.querySelectorAll('.gallery-photo').length,5);
 } finally {p.dom.window.close();}
});
test('new-memory drops append files and invalid drops preserve the selected photos',async()=>{
 const p=await page(); try {
  p.doc.querySelector('[data-new-trip]').click(); const form=fillTrip(p,'Dropped memory');
  const zone=p.doc.querySelector('#initial-upload-box');
  dropPhotos(p,zone,[new p.w.File(['a'],'first.jpg',{type:'image/jpeg'})]);
  dropPhotos(p,zone,[new p.w.File(['b'],'second.png',{type:'image/png'})]);
  dropPhotos(p,zone,[new p.w.File(['bad'],'bad.pdf',{type:'application/pdf'})]);
  assert.match(p.doc.querySelector('#initial-file-count').textContent,/2 photos/);
  form.dispatchEvent(new p.w.Event('submit',{cancelable:true})); await p.flush();
  assert.equal(p.doc.querySelectorAll('.gallery-photo').length,2);
 } finally {p.dom.window.close();}
});
