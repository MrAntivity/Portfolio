import { MediaEngine } from './media-engine.js';
import { FORMATS, MAX_BYTES, MAX_CLIPS, validateMedia, validateClips, splitClip, exportName, mediaExtension } from './media-model.js';
const h = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time = n => `${Math.floor(n / 60)}:${(n % 60).toFixed(2).padStart(5, '0')}`;
export async function openMediaEditor({ initial, library = [], saveCopy }) {
  if (document.querySelector('dialog.media-editor')) return;
  const dialog = document.createElement('dialog'); dialog.className = 'media-editor'; dialog.setAttribute('aria-labelledby', 'media-title');
  dialog.innerHTML = `<header class="me-header"><div><p class="me-eyebrow">FILES / MEDIA STUDIO</p><h2 id="media-title">Make the cut.</h2></div><button type="button" data-action="close" class="button ghost" aria-label="Close media editor">Close ✕</button></header>
    <p class="me-hint">MP4 · MP3 · FLAC · WAV. Edits create a new copy. Original files stay intact.</p>
    <div class="me-import"><label class="button ghost">＋ Import media<input type="file" id="me-import" accept=".mp4,.mp3,.flac,.wav,video/mp4,audio/mpeg,audio/flac,audio/wav" multiple hidden></label>
    <select id="me-library" aria-label="Choose media from Files"><option value="">Choose from your Files…</option>${library.map((item,i)=>`<option value="${i}">${h(item.fileName)}</option>`).join('')}</select><button class="button ghost" data-action="library">Add selected file</button><span>or drop media here</span></div>
    <div class="me-workspace"><section class="me-viewer"><video id="me-player" controls playsinline preload="metadata"></video><p id="me-source-label">Import a file to begin.</p>
    <div class="me-controls"><button class="button ghost" data-action="play-clip">Play selected clip</button><button class="button ghost" data-action="play-timeline">Play timeline</button><button class="button ghost" data-action="stop">Stop</button></div>
    <div class="me-controls"><button class="button ghost" data-action="mark-in">Set in at playhead</button><button class="button ghost" data-action="mark-out">Set out at playhead</button><button class="button ghost" data-action="split">Split at playhead</button></div><p class="me-hint">The player shows the source file. Clip preview applies your cuts, speed, volume and fades. Volume boosts above 100% apply on export. Export preview shows the finished result.</p></section>
    <aside class="me-export"><h3>Export a copy</h3><label>File name<input id="me-name" value="edited-clip" maxlength="150"></label><label>Format<select id="me-format"><option value="mp4">MP4 video · 720p</option><option value="mp3">MP3 audio · 192 kbps</option><option value="flac">FLAC audio</option><option value="wav" selected>WAV audio</option></select></label><p class="me-hint">Audio exports: 48 kHz stereo. Video: 720p, 30 fps, fit with padding. Export re-encodes edits.</p><button class="button primary" data-action="export">Render edited clip ↗</button><button class="button ghost" data-action="cancel" hidden>Cancel processing</button><div id="me-result" hidden><p id="me-result-label"></p><button class="button primary" data-action="download">Download edited copy</button><button class="button ghost" data-action="save">Save copy to Files</button><video id="me-output" controls playsinline></video></div></aside></div>
    <section class="me-timeline"><div class="me-timeline-heading"><h3>Timeline <span id="me-duration">0:00.00</span></h3><div class="me-controls"><button class="button ghost" data-action="undo">Undo</button><button class="button ghost" data-action="redo">Redo</button></div></div><div id="me-track" aria-label="Clip timeline"></div><div id="me-clips"></div></section>
    <p id="me-status" role="status" aria-live="polite">Import up to 200 MB total, 30 clips, and 20 minutes per export. Keep this tab open while processing.</p>`;
  document.body.append(dialog); dialog.showModal();
  const $ = selector => dialog.querySelector(selector), player = $('#me-player');
  let sources = [], clips = [], selected = null, history = [], future = [], busy = false, cancelled = false, disposed = false, output = null, outputURL = '', playMode = '', importController;
  const engine = new MediaEngine(text => { if (!disposed) $('#me-status').textContent = text; });
  const say = text => { $('#me-status').textContent = text; };
  const getClip = () => clips.find(c => c.id === selected);
  const getSource = clip => sources.find(s => s.id === clip?.sourceId);
  function discardOutput() { if (outputURL) URL.revokeObjectURL(outputURL); outputURL = ''; output = null; $('#me-output').pause(); $('#me-output').removeAttribute('src'); $('#me-result').hidden = true; }
  function stop() { playMode = ''; player.pause(); }
  function remember() { history.push(clips.map(c => ({...c}))); if (history.length > 40) history.shift(); future = []; discardOutput(); }
  function render() {
    if (!clips.some(c => c.id === selected)) selected = clips[0]?.id || null;
    const duration = clips.reduce((n,c) => n + (c.end-c.start)/c.speed,0); $('#me-duration').textContent = time(duration);
    $('#me-track').innerHTML = clips.map((c,i)=>`<button data-select="${c.id}" class="${c.id===selected?'active':''}" style="flex-grow:${Math.max(.05,(c.end-c.start)/c.speed)}" title="${h(getSource(c).file.name)}">${i+1} · ${time((c.end-c.start)/c.speed)}</button>`).join('') || '<p>Drop files above to start your timeline.</p>';
    $('#me-clips').innerHTML = clips.map((c,i)=>`<article class="me-clip ${c.id===selected?'active':''}" data-clip="${c.id}"><div class="me-clip-heading"><button class="me-clip-title" data-select="${c.id}">${i+1}. ${h(getSource(c).file.name)}</button><div class="me-controls"><button data-row="up" aria-label="Move clip ${i+1} earlier" ${i===0?'disabled':''}>↑</button><button data-row="down" aria-label="Move clip ${i+1} later" ${i===clips.length-1?'disabled':''}>↓</button><button data-row="duplicate">Duplicate</button><button data-row="remove">Remove</button></div></div><div class="me-fields">
      <label>In (seconds)<input type="number" data-field="start" min="0" max="${getSource(c).duration}" step="0.01" value="${c.start.toFixed(2)}"></label><label>Out (seconds)<input type="number" data-field="end" min="0" max="${getSource(c).duration}" step="0.01" value="${c.end.toFixed(2)}"></label><label>Speed<select data-field="speed">${[.5,.75,1,1.25,1.5,2].map(v=>`<option value="${v}" ${c.speed===v?'selected':''}>${v}×</option>`).join('')}</select></label><label>Volume (%)<input type="number" data-field="volume" min="0" max="200" step="1" value="${Math.round(c.volume*100)}"></label><label>Audio fade in (sec)<input type="number" data-field="fadeIn" min="0" step="0.1" value="${c.fadeIn}"></label><label>Audio fade out (sec)<input type="number" data-field="fadeOut" min="0" step="0.1" value="${c.fadeOut}"></label></div></article>`).join('');
    $('[data-action="undo"]').disabled = !history.length || busy; $('[data-action="redo"]').disabled = !future.length || busy;
    $('#me-result').hidden = !output;
    if (busy) dialog.querySelectorAll('button,input,select').forEach(el => { if (el.dataset.action !== 'cancel') el.disabled = true; });
  }
  function setBusy(value) {
    busy = value; dialog.querySelectorAll('button,input,select').forEach(el => el.disabled = value);
    $('[data-action="cancel"]').hidden = !value; $('[data-action="cancel"]').disabled = false;
    if (!value) render();
  }
  async function run(fn, cancellable = true) {
    if (busy) return; stop(); cancelled = false; setBusy(true);
    if (!cancellable) $('[data-action="cancel"]').hidden = true;
    try { await fn(); }
    catch (error) { say(cancelled ? 'Processing cancelled. Your source files and edits are still here.' : error.message || 'Processing failed. Try smaller files or fewer clips.'); }
    finally { if (!disposed) setBusy(false); }
  }
  function checkedUpdate(next) {
    const kind = next.every(c => getSource(c)?.hasVideo) ? 'mp4' : 'wav';
    // An empty timeline is valid while editing, but never at export.
    if (next.length) validateClips(next,sources,kind,true);
    remember(); clips = next; stop(); render();
  }
  function selectClip(id, seek=true) {
    stop(); selected = id; const c=getClip(),s=getSource(c); if(!s)return;
    $('#me-source-label').textContent = `${s.file.name} · ${time(s.duration)} · source playhead`;
    player.muted = false; player.playbackRate=c.speed; player.volume=Math.min(1,c.volume);
    if(player.dataset.source!==s.id){player.dataset.source=s.id;player.src=s.url;player.load();}
    if(seek) { if(player.readyState>=1) player.currentTime=c.start; else player.onloadedmetadata=()=>{player.currentTime=c.start;}; }
    render();
  }
  async function playClip(mode='clip') {
    const c=getClip(),s=getSource(c);if(!c||!s)return say('Import and select a clip first.');
    playMode=mode;player.playbackRate=c.speed;player.volume=Math.min(1,c.volume);player.currentTime=c.start;
    try{await player.play();}catch{playMode='';say('Your browser cannot play this source codec. You can still try rendering an export.');}
  }
  player.addEventListener('timeupdate',()=>{
    if(!playMode)return;const c=getClip();if(!c)return;
    const elapsed=(player.currentTime-c.start)/c.speed,length=(c.end-c.start)/c.speed;
    let gain=c.volume;if(c.fadeIn)gain*=Math.min(1,Math.max(0,elapsed/c.fadeIn));if(c.fadeOut)gain*=Math.min(1,Math.max(0,(length-elapsed)/c.fadeOut));player.volume=Math.max(0,Math.min(1,gain));
    if(player.currentTime>=c.end-.02)advance();
  });
  function advance(){if(!playMode)return;const mode=playMode,index=clips.findIndex(c=>c.id===selected);stop();if(mode==='timeline'&&index+1<clips.length){selectClip(clips[index+1].id);if(player.readyState>=1)playClip(mode);else player.onloadedmetadata=()=>playClip(mode);}}
  player.addEventListener('ended',advance);
  player.addEventListener('error',()=>say('Source playback is unavailable for this codec. The editor can still attempt an export.'));
  async function importFiles(files) {
    for(const file of files){
      if(cancelled)throw Error('Cancelled');
      validateMedia(file,sources.reduce((n,s)=>n+s.file.size,0));
      if(clips.length>=MAX_CLIPS)throw Error('The timeline already has 30 clips. Remove a clip before adding another.');
      say(`Reading ${file.name}…`);const info=await engine.probe(file);if(cancelled)throw Error('Cancelled');
      if(!info.hasAudio&&!info.hasVideo)throw Error('No supported audio or video track was found.');
      const source={id:crypto.randomUUID(),file,url:URL.createObjectURL(file),...info};sources.push(source);remember();
      const clip={id:crypto.randomUUID(),sourceId:source.id,start:0,end:info.duration,speed:1,volume:1,fadeIn:0,fadeOut:0};clips.push(clip);selected=clip.id;
      if(clips.length===1){$('#me-format').value=info.hasVideo?'mp4':mediaExtension(file.name)==='mp4'?'wav':mediaExtension(file.name);$('#me-name').value=file.name.replace(/\.[^.]+$/,'')+'-edited';}
      selectClip(clip.id);say(`Added ${file.name}. Set in/out points or split at the playhead.`);
    }
  }
  async function fromLibrary(item) {
    if(!item)throw Error('Choose a file from your Files first.');
    validateMedia({name:item.fileName,size:item.size||1},sources.reduce((n,s)=>n+s.file.size,0));
    importController=new AbortController();say(`Downloading ${item.fileName} for editing…`);
    const response=await fetch(item.downloadURL,{signal:importController.signal,credentials:'omit'});if(!response.ok)throw Error('Could not load this file. Check your connection and Storage CORS settings.');
    const remaining=MAX_BYTES-sources.reduce((n,s)=>n+s.file.size,0);let bytes=0;const chunks=[];
    if(Number(response.headers.get('content-length'))>remaining)throw Error('This file exceeds the remaining 200 MB import limit.');
    const reader=response.body.getReader();
    try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>remaining)throw Error('This file exceeds the remaining 200 MB import limit.');chunks.push(value);}}
    finally{await reader.cancel().catch(()=>{});}
    await importFiles([new File(chunks,item.fileName,{type:item.contentType||FORMATS[mediaExtension(item.fileName)]})]);
  }
  $('#me-import').onchange=e=>{const files=[...e.target.files];e.target.value='';run(()=>importFiles(files));};
  dialog.addEventListener('dragover',e=>{if([...e.dataTransfer.types].includes('Files')){e.preventDefault();e.stopPropagation();dialog.classList.add('me-drag');}});
  dialog.addEventListener('dragleave',()=>dialog.classList.remove('me-drag'));
  dialog.addEventListener('drop',e=>{e.preventDefault();e.stopPropagation();dialog.classList.remove('me-drag');if(!busy)run(()=>importFiles([...e.dataTransfer.files]));});
  $('#me-format').onchange=()=>{discardOutput();render();};
  $('#me-clips').addEventListener('change',e=>{
    const field=e.target.dataset.field,id=e.target.closest('[data-clip]')?.dataset.clip;if(!field||!id||busy)return;
    try{if(e.target.value.trim()==='')throw Error('Enter a number.');const value=Number(e.target.value)/(field==='volume'?100:1);checkedUpdate(clips.map(c=>c.id===id?{...c,[field]:value}:c));say('Edit applied. Render to export your timeline.');}catch(error){say(error.message);render();}
  });
  dialog.addEventListener('click',e=>{
    const choice=e.target.closest('[data-select]');if(choice&&!busy){selectClip(choice.dataset.select);return;}
    const row=e.target.closest('[data-row]');
    if(row&&!busy){const index=clips.findIndex(c=>c.id===row.closest('[data-clip]').dataset.clip),next=clips.map(c=>({...c}));try{
      if(row.dataset.row==='remove')next.splice(index,1);
      if(row.dataset.row==='duplicate')next.splice(index+1,0,{...next[index],id:crypto.randomUUID()});
      if(row.dataset.row==='up'&&index>0)[next[index-1],next[index]]=[next[index],next[index-1]];
      if(row.dataset.row==='down'&&index<next.length-1)[next[index+1],next[index]]=[next[index],next[index+1]];
      checkedUpdate(next);if(selected)selectClip(selected);
    }catch(error){say(error.message);}return;}
    const action=e.target.closest('[data-action]')?.dataset.action;if(!action)return;
    if(action==='cancel'){cancelled=true;importController?.abort();engine.cancel();return;}
    if(action==='close'){requestClose();return;}
    if(busy)return;
    if(action==='library')return run(()=>fromLibrary(library[Number($('#me-library').value)] && $('#me-library').value!=='' ? library[Number($('#me-library').value)] : null));
    if(action==='stop')return stop();
    if(action==='play-clip')return playClip();
    if(action==='play-timeline'){if(!clips.length)return say('Import a clip first.');selectClip(clips[0].id);if(player.readyState>=1)return playClip('timeline');player.onloadedmetadata=()=>playClip('timeline');return;}
    if(action==='undo'||action==='redo'){
      const from=action==='undo'?history:future,to=action==='undo'?future:history;if(!from.length)return;to.push(clips.map(c=>({...c})));clips=from.pop();discardOutput();stop();render();if(selected)selectClip(selected);return;
    }
    if(['mark-in','mark-out','split'].includes(action)){
      const clip=getClip();if(!clip)return say('Select a clip first.');try{
        let next=clips.map(c=>({...c}));if(action==='split')next.splice(next.findIndex(c=>c.id===selected),1,...splitClip(clip,player.currentTime,crypto.randomUUID()));
        else next=next.map(c=>c.id===selected?{...c,[action==='mark-in'?'start':'end']:player.currentTime}:c);
        checkedUpdate(next);
      }catch(error){say(error.message);}return;
    }
    if(action==='export')return run(async()=>{const format=$('#me-format').value;validateClips(clips,sources,format);discardOutput();const bytes=await engine.render(clips,sources,format);if(cancelled)throw Error('Cancelled');output=new File([bytes],exportName($('#me-name').value,format),{type:FORMATS[format]});outputURL=URL.createObjectURL(output);$('#me-output').src=outputURL;$('#me-result-label').textContent=`${output.name} · ${(output.size/1024/1024).toFixed(1)} MB`;$('#me-result').hidden=false;say('Export ready. Preview it, download it, or save a copy to Files.');});
    if(action==='download'&&output){const link=document.createElement('a');link.href=outputURL;link.download=output.name;document.body.append(link);link.click();link.remove();return;}
    if(action==='save'&&output)return run(async()=>{say('Saving a new copy to Files…');await saveCopy(output);say('Edited copy saved to Files. Your original is unchanged.');}, false);
  });
  function requestClose(){if(busy)return say('Cancel processing before closing the editor.');if(clips.length&&!confirm('Close the editor? Download or save your edited copy first. The timeline will be discarded.'))return;dialog.close();}
  dialog.addEventListener('cancel',e=>{e.preventDefault();requestClose();});
  const beforeUnload=e=>{if(clips.length||busy){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',beforeUnload);
  dialog.addEventListener('close',()=>{disposed=true;stop();engine.cancel();importController?.abort();sources.forEach(s=>URL.revokeObjectURL(s.url));discardOutput();window.removeEventListener('beforeunload',beforeUnload);dialog.remove();});
  render();if(initial)await run(()=>fromLibrary(initial));
}
