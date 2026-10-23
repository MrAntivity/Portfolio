const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('viro/portal.js','utf8');
async function upload(file,{previewFails=false}={}){
 const {originalUploadMetadata}=await import('../shared/original-files.js');const writes=[],removed=[];
 const context={currentUser:{uid:'owner'},storage:{},crypto:{randomUUID:()=> 'test'},originalUploadMetadata,
  isHeicPhoto:f=>/\.heic$/i.test(f.name),convertHeicPhoto:async()=>{if(previewFails)throw Error('preview failed');return new File(['preview jpeg'],'preview.jpg',{type:'image/jpeg'});},
  storageRef:(_,path)=>({fullPath:path}),uploadBytesResumable:(ref,bytes,metadata)=>{writes.push({ref,bytes,metadata});return{on:(event,progress,reject,resolve)=>{progress?.({bytesTransferred:bytes.size,totalBytes:bytes.size});resolve();}};},
  getDownloadURL:async ref=>'https://storage.invalid/'+encodeURIComponent(ref.fullPath),deleteObject:async ref=>removed.push(ref.fullPath),console:{warn(){}}};
 vm.createContext(context);const start=source.indexOf('async function uploadPages('),end=source.indexOf('\nfunction openUploadModal(',start);vm.runInContext(source.slice(start,end),context);
 const pages=await context.uploadPages([file],()=>{});return{pages,writes,removed};
}
test('HEIC original bytes, Unicode filename and timestamp survive upload; JPEG is a separate preview',async()=>{
 const bytes=Buffer.from([0,1,2,255,128,69,88,73,70]),file=new File([bytes],'旅行 photo.HEIC',{type:'image/heic',lastModified:123456789});const result=await upload(file);
 assert.equal(result.writes[0].bytes,file);assert.deepEqual(Buffer.from(await result.writes[0].bytes.arrayBuffer()),bytes);
 assert.equal(result.pages[0].fileName,file.name);assert.equal(result.pages[0].originalLastModified,123456789);assert.equal(result.pages[0].contentType,'image/heic');
 assert.equal(result.writes[0].metadata.customMetadata.originalFileName,file.name);assert.equal(result.writes[0].metadata.customMetadata.originalLastModified,'123456789');
 assert.notEqual(result.pages[0].storagePath,result.pages[0].previewStoragePath);assert.match(result.pages[0].previewStoragePath,/preview.jpg$/);assert.equal(result.writes.length,2);
});
test('a failed HEIC preview still saves the untouched original; ordinary files have no conversion',async()=>{
 const heic=new File(['original'],'photo.heic',{type:'image/heic'}),result=await upload(heic,{previewFails:true});assert.equal(result.writes.length,1);assert.equal(result.writes[0].bytes,heic);assert.equal(result.pages[0].previewURL,undefined);assert.equal(result.pages[0].fileName,'photo.heic');
 const pdf=new File(['%PDF original metadata'],'report.pdf',{type:'application/pdf'}),normal=await upload(pdf);assert.equal(normal.writes.length,1);assert.equal(normal.writes[0].bytes,pdf);
});
test('download uses source bytes and original name, never rewrites the file',async()=>{
 const bytes=Buffer.from([0,255,80,68,70,128]);let clicked=false,chosenName,downloaded;
 const link={remove(){},click(){clicked=true;chosenName=this.download;}};
 const context=vm.createContext({fetch:async()=>({ok:true,blob:async()=>new Blob([bytes])}),URL:{createObjectURL:blob=>{downloaded=blob;assert.equal(blob.size,bytes.length);return'blob:original';},revokeObjectURL(){}},document:{createElement:()=>link,body:{append(){}}},setTimeout:()=>{},Blob});
 const m=new vm.SourceTextModule(fs.readFileSync('shared/original-files.js','utf8'),{context});await m.link(()=>{});await m.evaluate();await m.namespace.downloadOriginal('https://storage.invalid/original','旅行 report.pdf');assert.equal(clicked,true);assert.equal(chosenName,'旅行 report.pdf');assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()),bytes);
});
