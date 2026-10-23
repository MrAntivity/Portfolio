// Optional real codec test: FFMPEG_CORE_DIR=/path/to/@ffmpeg/core node --experimental-vm-modules --test tests/media-wasm.test.cjs
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
test('pinned WASM core probes and edits all four formats, splices and supplies silent-video audio',{skip:!process.env.FFMPEG_CORE_DIR,timeout:120000},async()=>{
 const dir=process.env.FFMPEG_CORE_DIR;global.self={location:{href:'file://'+path.join(dir,'dist/umd/ffmpeg-core.js')}};
 const core=await require(path.join(dir,'dist/umd/ffmpeg-core.js'))({wasmBinary:fs.readFileSync(path.join(dir,'dist/umd/ffmpeg-core.wasm'))});let logs=[];core.setLogger(({message})=>logs.push(message));
 function exec(args){core.reset();core.exec(...args);assert.equal(core.ret,0,logs.slice(-10).join('\n'));}
 exec(['-f','lavfi','-i','sine=frequency=440:duration=2','-y','original.wav']);
 for(const ext of ['mp3','flac'])exec(['-i','original.wav','-y','original.'+ext]);
 exec(['-f','lavfi','-i','color=c=red:s=160x90:r=30:d=2','-i','original.wav','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-shortest','-y','original.mp4']);
 exec(['-i','original.mp4','-an','-c:v','copy','-y','silent.mp4']);
 const context=vm.createContext({console,URL,Blob,File,AbortController,Uint8Array,TextEncoder});
 const m=new vm.SourceTextModule(fs.readFileSync('viro/media-model.js','utf8'),{context});await m.link(()=>{});await m.evaluate();
 const wrapper=new vm.SyntheticModule(['FFmpeg'],function(){this.setExport('FFmpeg',class{});},{context});
 const e=new vm.SourceTextModule(fs.readFileSync('viro/media-engine.js','utf8'),{context});await e.link(s=>s.includes('media-model')?m:wrapper);await e.evaluate();
 const engine=new e.namespace.MediaEngine(()=>{});engine.ffmpeg={loaded:true,on(){},off(){},async writeFile(p,d){core.FS.writeFile(p,d)},async readFile(p,encoding){return core.FS.readFile(p,{encoding:encoding||'binary'})},async deleteFile(p){core.FS.unlink(p)},async exec(args){exec(args);return 0},async ffprobe(args){core.reset();core.ffprobe(...args);return core.ret}};
 const sources=[];
 for(const name of ['original.wav','original.mp3','original.flac','original.mp4','silent.mp4']){const file=new File([core.FS.readFile(name)],name),info=await engine.probe(file);assert.ok(info.duration>=1.9);sources.push({id:name,file,...info});}
 const clip=(id,start,end,speed=1)=>({id,sourceId:id,start,end,speed,volume:.6,fadeIn:.1,fadeOut:.1});
 for(const format of ['wav','mp3','flac','mp4']){
  const clips=format==='mp4'?[clip('silent.mp4',.5,1.5),clip('original.mp4',0,1,2)]:[clip('original.flac',.5,1.5),clip('original.mp3',0,1,2),clip('original.wav',0,.5)];
  const bytes=await engine.render(clips,sources,format);assert.ok(bytes.length>500);const info=await engine.probe(new File([bytes],'edited.'+format));const expected=format==='mp4'?1.5:2;assert.ok(Math.abs(info.duration-expected)<.2,`${format}: duration ${info.duration}, expected ${expected}`);assert.equal(info.hasAudio,true);assert.equal(info.hasVideo,format==='mp4');
  console.log(`${format}: ${bytes.length} bytes, ${info.duration}s, verified tracks`);
 }
 assert.ok(!core.FS.readdir('/').some(p=>/^segment-|^source-|^edited\./.test(p)),'render working files cleaned');
});
