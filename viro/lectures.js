import { wav, joinWav, clock } from './lecture-audio.js';
import { collection, doc, setDoc, getDoc, getDocs, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { ref, uploadBytes, getBlob } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-storage.js';
import { httpsCallable } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js';

const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const database = new Promise((resolve, reject) => {
  const req = indexedDB.open('viro-lecture-audio', 1);
  req.onupgradeneeded = () => req.result.createObjectStore('items', { keyPath: 'key' });
  req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
});
async function local(mode, action) {
  const db = await database;
  return new Promise((resolve, reject) => {
    const tx = db.transaction('items', mode), req = action(tx.objectStore('items'));
    tx.oncomplete = () => resolve(req.result); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
  });
}
const put = item => local('readwrite', s => s.put(item));
const get = key => local('readonly', s => s.get(key));

export function initLectures({ auth, db, storage, functions }) {
  const root = document.querySelector('#lecture-studio');
  const call = httpsCallable(functions, 'transcribeLecture', { timeout: 310000 });
  let uid, items = [], selected, active, unsubscribe, detailUnsub, sections = [];
  let saving = Promise.resolve(), uploading = false, processing = false, enabled = false, url, wake, pendingSync, forceThrough = 0;
  let message = '', error = '', working = false, microphonePending = false;
  const prefix = id => `${uid}/${id}`;
  const recordRef = id => doc(db, 'users', uid, 'lectures', id);
  const path = (id, i) => ref(storage, `users/${uid}/lectures/${id}/${i}.wav`);
  const localMeta = meta => put({ key: `meta/${prefix(meta.id)}`, uid, meta });
  const updateStatus = () => {
    const status = root.querySelector('[data-status]');
    if (status) status.textContent = error || message || 'Ready when you are.';
    const timer = root.querySelector('[data-timer]');
    if (timer && active) timer.textContent = clock(active.meta.seconds + (active.context.currentTime - active.lastTime));
  };
  function render() {
    const meta = active?.meta || items.find(i => i.id === selected);
    root.innerHTML = `<div class="lecture-heading"><div><span class="lecture-eyebrow">LECTURE STUDIO</span><h3>Listen now. Understand later.</h3><p>Record your class, then turn it into notes you can study.</p></div><span class="lecture-badge">${active ? '● Recording' : 'Audio + AI notes'}</span></div>
      <div class="lecture-controls">
      ${!active ? `<label>Lecture title<input data-title maxlength="180" placeholder="e.g. Physiology · Cardiac cycle" /></label><label>Class<input data-class maxlength="100" placeholder="e.g. BI 315" /></label><button class="button primary" data-action="record" ${microphonePending ? 'disabled' : ''}>${microphonePending ? 'Opening microphone…' : '● Record lecture'}</button>` : `<div class="lecture-live"><strong>${escape(active.meta.title)}</strong><span data-timer>${clock(active.meta.seconds)}</span><small>Microphone recording · Keep this tab open and your device awake.</small></div><button class="button ghost" data-action="transcribe">${enabled ? 'Update notes now' : 'Start transcribing'}</button><button class="button primary" data-action="finish">Finish lecture</button>`}
      </div><p class="lecture-status" data-status role="status" aria-live="polite"></p>
      <p class="lecture-hint">Audio saves on this device every 10 seconds and syncs when connected. Start transcribing at any point; recording continues. Record only when you have permission.</p>
      <div class="lecture-library"><div class="lecture-recordings"><label>Find a lecture<input data-search type="search" placeholder="Search title or class…" /></label><div data-list>${listHtml(items)}</div></div>
      <div class="lecture-detail">${meta ? `<div class="lecture-detail-heading"><div><h4>${escape(meta.title)}</h4><p>${escape(meta.className || 'Lecture')} · ${clock(meta.seconds)} · ${meta.uploadedCount || 0}/${meta.count} audio segments synced</p></div></div>
      <div class="lecture-actions"><button class="button ghost" data-action="play">Load audio</button><button class="button ghost" data-action="download">Download WAV</button><button class="button ghost" data-action="retry">${processing ? 'Processing…' : 'Sync & transcribe'}</button><button class="button ghost" data-action="export">Export notes</button></div><audio controls preload="none" data-player ${url ? `src="${url}"` : ''}></audio>
      <div class="lecture-reading"><h4>Study notes</h4><p>Timestamped sections build as audio is processed. Check uncertain details against the recording.</p><div data-sections></div></div>` : `<div class="lecture-empty"><span class="material-symbols-outlined">graphic_eq</span><h4>Your lectures, ready for review.</h4><p>Saved audio, a full transcript, and organized study notes stay together here.</p></div>`}</div></div>`;
    renderSections(); updateStatus();
  }
  function listHtml(list) {
    return list.length ? list.map(m => `<button type="button" class="lecture-item ${m.id === selected ? 'selected' : ''}" data-select="${escape(m.id)}"><strong>${escape(m.title)}</strong><span>${escape(m.className || 'Lecture')} · ${new Date(m.createdAt).toLocaleDateString()}</span><small>${clock(m.seconds)} · ${m.finished ? 'Finished' : active?.meta.id === m.id ? 'Recording' : 'Interrupted · saved audio recoverable'}</small></button>`).join('') : '<p class="lecture-hint">No recordings yet.</p>';
  }
  function renderSections() {
    const el = root.querySelector('[data-sections]'); if (!el) return;
    let seconds = 0;
    el.innerHTML = sections.map(s => {
      const start = seconds; seconds += s.duration || 0;
      return `<article class="lecture-section"><button class="lecture-timestamp" data-seek="${start}">${clock(start)} – ${clock(seconds)}</button><div class="lecture-notes">${escape(s.notes || 'Transcript saved. Retry to generate notes.')}</div><details><summary>Read transcript</summary><p class="lecture-transcript">${escape(s.transcript)}</p></details></article>`;
    }).join('') || '<p class="lecture-hint">Press Start transcribing during class, or Finish lecture when you’re done. Notes appear here as each section completes.</p>';
  }
  async function loadUser() {
    const next = auth.currentUser?.uid;
    if (uid === next) return;
    if (active && uid !== next) { const a = active; active = null; a.source.disconnect(); a.stream.getTracks().forEach(t => t.stop()); a.context.close(); wake?.release(); }
    enabled = false;
    unsubscribe?.(); detailUnsub?.(); uid = next; items = []; selected = null; sections = []; error = '';
    if (!uid) { render(); return; }
    const cached = await local('readonly', s => s.getAll());
    items = cached.filter(x => x.key.startsWith('meta/') && x.uid === uid).map(x => x.meta);
    unsubscribe = onSnapshot(collection(db, 'users', uid, 'lectures'), snap => {
      const merged = new Map(items.map(m => [m.id, m]));
      snap.docs.forEach(d => {
        const remote = { ...d.data(), id: d.id }, old = merged.get(d.id);
        merged.set(d.id, old && old.count > remote.count ? { ...remote, ...old, uploadedCount: remote.uploadedCount } : remote);
      });
      items = [...merged.values()].sort((a, b) => b.createdAt - a.createdAt);
      if (!selected && items.length) select(items[0].id); else if (!active) render();
    }, err => { error = `Cloud storage unavailable: ${err.message}. Local recordings remain on this device.`; updateStatus(); });
    if (items.length) select(items[0].id); else render();
  }
  function select(id) {
    if (active && active.meta.id !== id) { message = 'Finish the current lecture before opening another.'; updateStatus(); return; }
    selected = id; sections = []; if (url) URL.revokeObjectURL(url); url = null;
    detailUnsub?.(); detailUnsub = onSnapshot(collection(recordRef(id), 'sections'), snap => {
      sections = snap.docs.map(d => d.data()).sort((a, b) => a.start - b.start); renderSections();
    }, err => { error = `Could not load notes: ${err.message}`; updateStatus(); });
    render();
  }
  async function record() {
    if (active || microphonePending) return;
    if (!uid) throw new Error('Sign in before recording.');
    if (!navigator.mediaDevices?.getUserMedia || !window.AudioWorkletNode) throw new Error('Recording needs HTTPS and a browser with AudioWorklet support. Try current Chrome or Safari.');
    const title = root.querySelector('[data-title]').value.trim() || `Lecture · ${new Date().toLocaleDateString()}`;
    const className = root.querySelector('[data-class]').value.trim();
    microphonePending = true; render();
    let stream, context;
    try {
      await database;
      stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true }, video: false });
      context = new AudioContext({ sampleRate: 16000 });
      await context.audioWorklet.addModule(new URL('./lecture-worklet.js', import.meta.url));
      await context.resume();
      const node = new AudioWorkletNode(context, 'lecture-capture');
      const meta = { id: crypto.randomUUID(), title, className, createdAt: Date.now(), count: 0, seconds: 0, rate: context.sampleRate, uploadedCount: 0, finished: false };
      await localMeta(meta);
      const source = context.createMediaStreamSource(stream);
      active = { meta, stream, context, node, source, lastTime: context.currentTime };
      node.port.onmessage = ({ data }) => {
        if (data.flushed) { active?.flushed?.(); return; }
        const a = active; if (!a || !data.pcm) return;
        const index = a.meta.count++, blob = wav(data.pcm, data.rate);
        a.meta.seconds += data.pcm.length / data.rate; a.lastTime = context.currentTime;
        const snapshot = { ...a.meta };
        saving = saving.then(async () => {
          await put({ key: `audio/${prefix(meta.id)}/${index}`, blob }); await localMeta(snapshot);
        }).catch(err => {
          error = `Audio could not be saved (${err.message}). Recording stopped to protect the saved portion.`;
          a.source.disconnect(); a.stream.getTracks().forEach(t => t.stop()); a.context.close(); active = null; wake?.release(); render();
          throw err;
        });
        saving.then(() => sync(meta)).catch(() => {});
      };
      source.connect(node); node.connect(context.destination); // Worklet outputs silence, so no microphone feedback.
      stream.getAudioTracks()[0].addEventListener('ended', () => {
        if (active) finish().catch(showError);
      });
      context.onstatechange = () => {
        if (active && context.state === 'suspended') { error = 'Audio capture is suspended. Return to this tab and click Resume microphone.'; updateStatus(); const b = document.createElement('button'); b.className = 'button ghost'; b.textContent = 'Resume microphone'; b.onclick = () => context.resume().then(() => { error = ''; b.remove(); }); root.querySelector('.lecture-controls').append(b); }
      };
      items.unshift(meta); enabled = false; forceThrough = 0; error = ''; message = 'Recording. Audio saves every 10 seconds.'; select(meta.id);
      navigator.storage?.persist?.().catch(() => {});
      try { wake = await navigator.wakeLock?.request('screen'); } catch {}
    } catch (err) { stream?.getTracks().forEach(t => t.stop()); context?.close(); throw err; }
    finally { microphonePending = false; render(); }
  }
  async function flush() {
    if (!active) return;
    const a = active;
    if (a.context.state === 'suspended') await a.context.resume();
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Microphone did not respond. Previously saved audio is safe; resume the microphone and retry.')), 8000);
      a.flushed = () => { clearTimeout(timeout); resolve(); };
      a.node.port.postMessage('flush');
    });
    await saving;
  }
  async function finish() {
    if (!active) return;
    await flush(); const a = active;
    a.source.disconnect(); active = null; a.stream.getTracks().forEach(t => t.stop()); await a.context.close();
    await wake?.release(); a.meta.finished = true; await localMeta(a.meta);
    enabled = true; error = ''; message = 'Recording finished. Syncing audio and preparing notes…'; render();
    await sync(a.meta);
  }
  async function sync(meta) {
    if (!uid) return;
    if (uploading) { pendingSync = meta; return; }
    uploading = true;
    try {
      const remote = await getDoc(recordRef(meta.id));
      let uploaded = remote.data()?.uploadedCount || 0;
      // Metadata is persisted before uploading; no long recording is kept in RAM.
      const { title, className, createdAt, count, seconds, rate, finished } = meta;
      await setDoc(recordRef(meta.id), { title, className, createdAt, count, seconds, rate, finished, uploadedCount: uploaded }, { merge: true });
      while (uploaded < meta.count) {
        const chunk = await get(`audio/${prefix(meta.id)}/${uploaded}`);
        if (!chunk) throw new Error(`Local audio segment ${uploaded + 1} is missing. Recover on the original recording device.`);
        await uploadBytes(path(meta.id, uploaded), chunk.blob, { contentType: 'audio/wav' });
        uploaded++; meta.uploadedCount = uploaded;
        await setDoc(recordRef(meta.id), { uploadedCount: uploaded, count: meta.count, seconds: meta.seconds, finished: meta.finished }, { merge: true });
      }
      await localMeta(meta); message = `${clock(meta.seconds)} saved · ${uploaded} audio segments synced.`;
    } catch (err) { error = `Sync paused: ${err.message}. Saved local audio is available; use Sync & transcribe to retry.`; }
    finally { uploading = false; updateStatus(); }
    if (pendingSync) { const next = pendingSync; pendingSync = null; void sync(next); }
    if (enabled && !error) void process(meta);
  }
  async function process(meta) {
    if (processing) return;
    processing = true;
    try {
      while (enabled) {
        const remote = (await getDoc(recordRef(meta.id))).data();
        const start = remote?.processedCount || 0, available = remote?.uploadedCount || 0;
        if (active && available - start < 12 && forceThrough <= start) break;
        const end = Math.min(start + 12, available, forceThrough > start ? forceThrough : Infinity);
        if (end <= start) break;
        message = `AI is processing saved audio (${start + 1}–${end} of ${remote.uploadedCount} segments).${active ? ' Recording continues.' : ''}`; updateStatus();
        await call({ lectureId: meta.id, start, end });
      }
      message = active ? 'Notes are up to date with synced audio. Recording continues.' : 'All synced audio has been transcribed. Your study notes are ready.';
    } catch (err) { enabled = false; error = `AI processing paused: ${err.message}. Audio is saved. Click Sync & transcribe to retry.`; }
    finally { processing = false; updateStatus(); }
  }
  async function audioBlob() {
    const meta = active?.meta || items.find(m => m.id === selected);
    if (!meta?.count) throw new Error('No saved audio yet. Wait a few seconds.');
    message = 'Preparing full recording…'; updateStatus();
    const blobs = [];
    for (let i = 0; i < meta.count; i++) {
      const cached = await get(`audio/${prefix(meta.id)}/${i}`);
      blobs.push(cached?.blob || await getBlob(path(meta.id, i), 4000044));
    }
    return joinWav(blobs, meta.rate);
  }
  function download(blob, extension) {
    const link = document.createElement('a'), objectUrl = URL.createObjectURL(blob);
    const meta = items.find(m => m.id === selected);
    link.href = objectUrl; link.download = `${(meta?.title || 'lecture').replace(/[^a-z0-9 _-]/gi, '').slice(0, 100)}.${extension}`; link.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
  }
  function showError(err) { error = err.message || 'Something went wrong. Saved audio is retained.'; updateStatus(); }
  root.addEventListener('input', e => {
    if (e.target.matches('[data-search]')) root.querySelector('[data-list]').innerHTML = listHtml(items.filter(m => `${m.title} ${m.className}`.toLowerCase().includes(e.target.value.toLowerCase())));
  });
  root.addEventListener('click', async e => {
    const selectButton = e.target.closest('[data-select]'); if (selectButton) return select(selectButton.dataset.select);
    const seek = e.target.closest('[data-seek]');
    if (seek) { const player = root.querySelector('audio'); if (player?.src) { player.currentTime = Number(seek.dataset.seek); player.play().catch(showError); } else { message = 'Load audio first, then click a timestamp.'; updateStatus(); } return; }
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (!action || working) return;
    working = true; error = '';
    try {
      if (action === 'record') { if (processing || uploading) throw new Error('Wait for the previous lecture to finish syncing and processing.'); await record(); }
      if (action === 'finish') await finish();
      if (action === 'transcribe' || action === 'retry') { enabled = true; await flush(); const meta = active?.meta || items.find(m => m.id === selected); if (meta) { forceThrough = meta.count; await sync(meta); } }
      if (action === 'play' || action === 'download') {
        const blob = await audioBlob();
        if (action === 'download') download(blob, 'wav');
        else { if (url) URL.revokeObjectURL(url); url = URL.createObjectURL(blob); root.querySelector('audio').src = url; }
        message = 'Full saved recording is ready.';
      }
      if (action === 'export') {
        if (!sections.length) throw new Error('Transcribe the lecture before exporting notes.');
        let time = 0;
        const content = sections.map(s => { const range = `${clock(time)} – ${clock(time + s.duration)}`; time += s.duration; return `## ${range}\n\n${s.notes || ''}\n\n### Transcript\n\n${s.transcript}`; }).join('\n\n');
        download(new Blob([`# ${items.find(m => m.id === selected)?.title}\n\n${content}`], { type: 'text/markdown' }), 'md');
      }
    } catch (err) { showError(err); }
    finally { working = false; updateStatus(); }
  });
  window.addEventListener('beforeunload', e => { if (active || uploading) { e.preventDefault(); e.returnValue = ''; } });
  window.addEventListener('online', () => { error = ''; const meta = active?.meta || items.find(m => m.id === selected); if (meta) sync(meta); });
  document.addEventListener('visibilitychange', async () => { if (!document.hidden && active) { try { wake = await navigator.wakeLock?.request('screen'); } catch {} } });
  setInterval(updateStatus, 1000);
  // The existing portal owns authentication. Polling only detects account transitions.
  setInterval(() => loadUser().catch(showError), 1000);
  render(); loadUser().catch(showError);
  return { isRecording: () => Boolean(active || microphonePending), isBusy: () => Boolean(active || microphonePending || processing || uploading) };
}
