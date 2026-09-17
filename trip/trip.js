import { escapeHtml as h, validateTrip, validateFiles, filterTrips, tripStats, dateLabel } from './model.js';
import { createMap, pinIcon, findPlaces } from './map.js';
import { preparePhoto } from './photos.js';

const $ = selector => document.querySelector(selector);
const form = $('#trip-form'), formDialog = $('#form-dialog'), tripDialog = $('#trip-dialog');
const demo = new URLSearchParams(location.search).get('demo') === '1';
let api, trips = [], visibleTrips = [], selectedTrip = null, photos = [], user = null;
let worldMap, pinLayer, pickerMap, pickerPin, locationResults = [];
let stopTrip, stopPhotos, photoLimit = 60, lightboxIndex = 0, busy = false, toastTimer;
let editId = null, formSavedId = null, tripFiles = [], moreFiles = [], uploadTarget = null;
const storage = { get(key) { try { return localStorage.getItem(key); } catch { return null; } }, set(key, value) { try { localStorage.setItem(key, value); } catch {} } };
const openers = new Map();
function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 5000); }
function showDialog(dialog) { if (!dialog.open) { openers.set(dialog.id, document.activeElement); dialog.showModal(); } }
function closeDialog(dialog) { if (busy && ['form-dialog', 'upload-dialog'].includes(dialog.id)) { toast('Let the upload finish before closing this window.'); return; } dialog.close(); }
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.addEventListener('cancel', e => { if (busy && ['form-dialog', 'upload-dialog'].includes(dialog.id)) e.preventDefault(); });
  dialog.addEventListener('close', () => {
    openers.get(dialog.id)?.focus?.();
    if (dialog.id === 'trip-dialog') { stopTrip?.(); stopPhotos?.(); if (location.hash.startsWith('#trip=')) history.replaceState(null, '', location.pathname + location.search + '#journal'); }
  });
}
document.addEventListener('click', e => {
  const close = e.target.closest('[data-close]'); if (close) closeDialog(document.getElementById(close.dataset.close));
  if (e.target.closest('[data-new-trip]')) openForm();
});
function setTheme(theme) {
  document.body.dataset.theme = theme; storage.set('aidenyue-theme-preference', theme);
  $('#theme-toggle').setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
  document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#090909' : '#f3f2ee';
}
setTheme(storage.get('aidenyue-theme-preference') === 'light' ? 'light' : 'dark');
$('#theme-toggle').onclick = () => setTheme(document.body.dataset.theme === 'dark' ? 'light' : 'dark');
function friendlyError(err) {
  const code = err?.code || '';
  if (code.includes('operation-not-allowed') || code.includes('admin-restricted-operation')) return 'Guest contributions aren’t enabled yet. The site owner needs to enable Anonymous sign-in in Firebase Authentication.';
  if (code.includes('permission-denied') || code.includes('unauthorized')) return 'The journal permissions aren’t ready yet. The site owner needs to publish the trip Firestore and Storage rules. Your form is still here.';
  if (code.includes('network') || code.includes('unavailable') || !navigator.onLine) return 'The connection dropped. Reconnect and try again; completed photos are already saved.';
  if (code.includes('quota')) return 'The storage or request limit was reached. Please try again later.';
  return err?.message || 'Something went wrong. Your form has been kept so you can retry.';
}
function connectionError(err) {
  $('#connection-status').hidden = false;
  $('#connection-status').textContent = friendlyError(err);
  $('#result-count').textContent = 'Journal unavailable';
  if (!trips.length) $('#trip-grid').innerHTML = '<div class="empty-state"><span class="empty-icon">↗</span><h3>The memory book is almost ready.</h3><p>The connection needs a little attention. Saved trips will appear here once it’s ready.</p><button class="button" id="retry-connection">Try again</button></div>';
  $('#retry-connection')?.addEventListener('click', () => location.reload());
}
async function fillImages(scope) {
  if (!api) return;
  await Promise.all([...scope.querySelectorAll('[data-photo-path]')].map(async img => {
    try { const src = await api.imageUrl(img.dataset.photoPath); if (img.isConnected) img.src = src; }
    catch { img.hidden = true; const fallback = img.parentElement?.querySelector('.cover-placeholder'); if (fallback) fallback.hidden = false; }
  }));
}
function cover(path, title, loading = 'lazy') {
  return `<div class="cover-placeholder" ${path ? 'hidden' : ''}><span>Somewhere good.</span><small>A STORY WAITING FOR ITS PHOTOS</small></div>${path ? `<img data-photo-path="${h(path)}" alt="${h(title)}" loading="${loading}" decoding="async" />` : ''}`;
}
function renderTrips() {
  const selectedYear = $('#year').value;
  const years = [...new Set(trips.map(t => t.startDate?.slice(0, 4)).filter(Boolean))].sort().reverse();
  $('#year').innerHTML = '<option value="">All years</option>' + years.map(y => `<option value="${h(y)}" ${y === selectedYear ? 'selected' : ''}>${h(y)}</option>`).join('');
  visibleTrips = filterTrips(trips, $('#search').value, $('#year').value);
  const stats = tripStats(trips);
  $('#trip-count').textContent = String(stats.trips).padStart(2, '0'); $('#place-count').textContent = String(stats.places).padStart(2, '0'); $('#friend-count').textContent = String(stats.friends).padStart(2, '0');
  $('#result-count').textContent = `${visibleTrips.length} ${visibleTrips.length === 1 ? 'memory' : 'memories'}`;
  $('#trip-grid').innerHTML = visibleTrips.map((t, i) => `<article class="trip-card"><button class="card-image" data-open-trip="${h(t.id)}" aria-label="Open ${h(t.title)}">${cover(t.coverPath, t.title)}<span class="card-index">MEMORY ${String(i + 1).padStart(2, '0')}</span><span class="card-arrow">↗</span></button><div class="card-meta"><span>${h(t.locationLabel)}</span><span>${h(t.startDate?.slice(0, 4))}</span></div><button class="card-title" data-open-trip="${h(t.id)}">${h(t.title)}</button><p class="card-description">${h(t.description)}</p><div class="card-people"><span class="avatars">${t.people.slice(0, 4).map(n => `<span class="avatar" title="${h(n)}">${h(n.split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase())}</span>`).join('')}</span><span>${h(t.people.slice(0, 3).join(', '))}${t.people.length > 3 ? ` +${t.people.length - 3}` : ''}</span></div></article>`).join('') || (trips.length ? '<div class="empty-state"><h3>No memories found.</h3><p>Try another name, place, or year.</p><button class="button" id="clear-filters">Clear filters</button></div>' : '<div class="empty-state"><span class="empty-icon">↗</span><h3>Every memory book starts somewhere.</h3><p>Add the first trip. The people, the photos, and the little things you don’t want to forget.</p><button class="button" data-new-trip>Add our first trip ↗</button></div>');
  $('#clear-filters')?.addEventListener('click', () => { $('#search').value = ''; $('#year').value = ''; renderTrips(); });
  fillImages($('#trip-grid')); renderPins();
}
$('#search').addEventListener('input', renderTrips); $('#year').addEventListener('change', renderTrips);
$('#trip-grid').addEventListener('click', e => { const button = e.target.closest('[data-open-trip]'); if (button) openTrip(button.dataset.openTrip); });
function renderPins() {
  if (!worldMap) return;
  pinLayer.clearLayers();
  const groups = new Map();
  visibleTrips.forEach(t => { const key = `${t.lat.toFixed(4)},${t.lng.toFixed(4)}`; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(t); });
  let index = 0;
  for (const group of groups.values()) {
    const t = group[0], popup = document.createElement('div'); popup.className = 'pin-popup';
    const label = document.createElement('strong'); label.textContent = t.locationLabel; popup.append(label);
    group.forEach(trip => { const button = document.createElement('button'); button.textContent = trip.title + ' ↗'; button.onclick = () => openTrip(trip.id); popup.append(button); });
    L.marker([t.lat, t.lng], { icon: pinIcon(++index), title: `${t.locationLabel}: ${group.length} trip(s)`, alt: t.locationLabel }).addTo(pinLayer).bindPopup(popup);
  }
  $('#map-empty').hidden = visibleTrips.length > 0;
  $('#map-empty').textContent = trips.length ? 'No pins match these filters.' : 'Your first trip puts a pin on the map.';
}
function fitMap() {
  if (!worldMap) return;
  if (visibleTrips.length) worldMap.fitBounds(visibleTrips.map(t => [t.lat, t.lng]), { padding: [55, 55], maxZoom: 6 });
  else worldMap.setView([24, 12], 2);
}
$('#map-reset').onclick = fitMap;
function initPicker() {
  if (!pickerMap) {
    pickerMap = createMap('picker-map');
    pickerMap.on('click', e => setPin(e.latlng.lat, e.latlng.wrap().lng));
  }
  pickerMap.invalidateSize();
  if (form.elements.lat.value !== '' && form.elements.lng.value !== '') setPin(Number(form.elements.lat.value), Number(form.elements.lng.value), true);
  else { pickerPin?.remove(); pickerPin = null; pickerMap.setView([24, 12], 2); }
}
function setPin(lat, lng, fly = false) {
  lat = Math.max(-85, Math.min(85, lat)); lng = ((lng + 180) % 360 + 360) % 360 - 180;
  form.elements.lat.value = lat.toFixed(6); form.elements.lng.value = lng.toFixed(6);
  if (pickerMap) {
    if (!pickerPin) { pickerPin = L.marker([lat, lng], { icon: pinIcon(), draggable: true, title: 'Drag to adjust trip location' }).addTo(pickerMap); pickerPin.on('dragend', () => { const p = pickerPin.getLatLng(); setPin(p.lat, p.lng); }); }
    else pickerPin.setLatLng([lat, lng]);
    if (fly) pickerMap.setView([lat, lng], 10);
  }
}
for (const name of ['lat', 'lng']) form.elements[name].addEventListener('change', () => {
  const lat = Number(form.elements.lat.value), lng = Number(form.elements.lng.value);
  if (Number.isFinite(lat) && Number.isFinite(lng)) setPin(lat, lng, true);
});
$('#find-location').onclick = async () => {
  const button = $('#find-location'); button.disabled = true; $('#location-results').textContent = 'Finding your place…';
  try { locationResults = await findPlaces(form.elements.locationQuery.value); $('#location-results').innerHTML = locationResults.length ? locationResults.map((p, i) => `<button type="button" data-place="${i}">${h(p.locationLabel)}<br /><small>${h(p.address)}</small></button>`).join('') + '<small>Search by Photon · © OpenStreetMap contributors</small>' : 'No matches. Try a nearby city or drop a pin on the map.'; }
  catch (err) { $('#location-results').textContent = err.name === 'TimeoutError' ? 'Search timed out. Drop a pin on the map or try again.' : err.message; }
  finally { button.disabled = false; }
};
$('#location-query').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#find-location').click(); } });
$('#location-results').onclick = e => { const button = e.target.closest('[data-place]'); if (!button) return; const p = locationResults[Number(button.dataset.place)]; for (const name of ['locationLabel', 'address', 'country']) form.elements[name].value = p[name]; setPin(p.lat, p.lng, true); $('#location-results').textContent = 'Location selected. Adjust the pin if needed.'; };
function openForm(trip = null) {
  if (!api) return toast('The journal is still connecting. Try again in a moment.');
  form.reset(); editId = trip?.id || null; formSavedId = null; tripFiles = [];
  $('#form-error').textContent = ''; $('#form-progress').hidden = true; $('#location-results').textContent = ''; $('#initial-file-count').textContent = '';
  $('#form-title').innerHTML = trip ? 'Keep the <em>story going.</em>' : 'Where did we <em>go?</em>';
  $('#save-trip').textContent = trip ? 'Save changes ↗' : 'Save this memory ↗';
  form.elements.authorName.value = storage.get('trip-contributor-name') || '';
  if (trip) for (const [name, value] of Object.entries(trip)) { if (form.elements[name] && !['people', 'excursions'].includes(name)) form.elements[name].value = value ?? ''; }
  if (trip) { form.elements.people.value = trip.people.join(', '); form.elements.excursions.value = trip.excursions.join('\n'); }
  showDialog(formDialog);
  requestAnimationFrame(() => { try { initPicker(); } catch (err) { $('#location-results').textContent = err.message; } });
}
function selectedFiles(input, label, assign) {
  const files = [...input.files];
  try { validateFiles(files); assign(files); label.textContent = files.length ? `${files.length} photos selected. Photos are optimized for the gallery before upload.` : ''; }
  catch (err) { input.value = ''; assign([]); label.textContent = err.message; }
}
$('#initial-photos').onchange = e => selectedFiles(e.target, $('#initial-file-count'), files => { tripFiles = files; });
$('#more-photos').onchange = e => selectedFiles(e.target, $('#more-file-count'), files => { moreFiles = files; });
async function uploadQueue(id, queue, name, caption, progress, label, canSetCover) {
  const total = queue.length; let done = 0;
  progress.hidden = false;
  while (queue.length) {
    const file = queue[0]; label.textContent = `Preparing photo ${done + 1} of ${total}…`;
    const photo = await preparePhoto(file);
    const result = await api.uploadPhoto(id, photo.blob, { name, caption, width: photo.width, height: photo.height }, fraction => {
      progress.value = Math.round(((done + fraction) / total) * 100); label.textContent = `Uploading photo ${done + 1} of ${total} · ${progress.value}%`;
    });
    queue.shift(); done++;
    if (canSetCover) { canSetCover = false; await api.setCover(id, result.storagePath).catch(() => toast('Photo saved. You can choose its cover later from the gallery.')); }
  }
  progress.hidden = true;
}
function formBusy(button, value) { busy = value; button.disabled = value; for (const el of button.form.elements) if (el !== button) el.disabled = value; }
form.addEventListener('submit', async e => {
  e.preventDefault(); if (busy) return;
  const button = $('#save-trip'); $('#form-error').textContent = '';
  try {
    const values = validateTrip(Object.fromEntries(new FormData(form))); validateFiles(tripFiles);
    formBusy(button, true); button.textContent = 'Saving the story…';
    user = await api.guest();
    const id = formSavedId || editId || api.newTripId();
    await api.saveTrip(id, values, Boolean(formSavedId || editId)); formSavedId = id;
    storage.set('trip-contributor-name', values.authorName);
    await uploadQueue(id, tripFiles, values.authorName, '', $('#form-progress'), button, !editId && !trips.find(t => t.id === id)?.coverPath);
    formBusy(button, false); formDialog.close(); toast(editId ? 'The story has been updated.' : 'One more memory, kept forever.'); openTrip(id);
  } catch (err) {
    $('#form-error').textContent = `${formSavedId ? 'The trip is saved. ' : ''}${friendlyError(err)}${tripFiles.length && formSavedId ? ` ${tripFiles.length} photo(s) are still waiting; retry to upload the remainder.` : ''}`;
  } finally { formBusy(button, false); button.textContent = formSavedId ? 'Save changes & retry remaining photos ↗' : editId ? 'Save changes ↗' : 'Save this memory ↗'; }
});
function openTrip(id, updateHash = true) {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id) || !api) return;
  stopTrip?.(); stopPhotos?.(); selectedTrip = null; photos = []; photoLimit = 60;
  $('#trip-detail').innerHTML = '<div class="detail-content"><p>Opening this memory…</p></div>'; showDialog(tripDialog);
  if (updateHash) history.pushState(null, '', `${location.pathname}${location.search}#trip=${encodeURIComponent(id)}`);
  stopTrip = api.watchTrip(id, trip => { selectedTrip = trip; if (!trip) { $('#trip-detail').innerHTML = '<div class="detail-content"><h2>That memory isn’t here.</h2><p>The link may be incorrect or the trip may have been removed.</p></div>'; return; } renderDetail(); }, err => { $('#trip-detail').innerHTML = `<div class="detail-content"><p class="error-message">${h(friendlyError(err))}</p></div>`; });
  watchGallery(id);
  api.currentGuest().then(u => { user = u; if (selectedTrip?.id === id) renderDetail(); }).catch(() => {});
}
function watchGallery(id) {
  stopPhotos?.(); stopPhotos = api.watchPhotos(id, photoLimit, data => { photos = data; if (selectedTrip?.id === id) renderGallery(); }, err => { const gallery = $('#gallery'); if (gallery) gallery.innerHTML = `<p class="error-message">${h(friendlyError(err))}</p>`; });
}
function renderDetail() {
  const t = selectedTrip; if (!t) return;
  const own = t.createdBy === user?.uid;
  $('#trip-detail').innerHTML = `<div class="detail-cover">${cover(t.coverPath, t.title, 'eager')}<span class="detail-cover-label">${h(dateLabel(t.startDate, t.endDate))}</span></div><div class="detail-content"><div class="detail-title-row"><h2 id="detail-title">${h(t.title)}</h2>${own ? '<button class="button small" id="edit-trip">Edit story ↗</button>' : ''}</div><p class="detail-location"><a href="https://www.openstreetmap.org/?mlat=${t.lat}&mlon=${t.lng}#map=13/${t.lat}/${t.lng}" target="_blank" rel="noopener noreferrer">${h(t.locationLabel)} ↗</a>${t.address ? ` · ${h(t.address)}` : ''}</p><div class="detail-info"><p class="detail-story">${h(t.description)}</p><aside><span class="eyebrow">THE GOOD COMPANY</span><div class="detail-friends">${t.people.map(n => `<span class="person-chip">${h(n)}</span>`).join('')}</div></aside></div>${t.excursions.length ? `<section class="excursions"><span class="eyebrow">THE LITTLE DETOURS</span><h3 style="margin-top:10px">Out & about.</h3><div class="excursion-list">${t.excursions.map((x, i) => `<div class="excursion"><span>${String(i + 1).padStart(2, '0')}</span><p>${h(x)}</p></div>`).join('')}</div></section>` : ''}<div class="gallery-heading"><div><h3>Through our lenses.</h3><p id="gallery-count">Everyone’s photos, all in one place.</p></div><button class="button" id="add-photos">＋ Add photos</button></div><div id="gallery"></div><button class="text-button detail-load-more" id="more-gallery" hidden>Load more photos ↓</button><div class="detail-share"><span>STORY ADDED BY ${h(t.authorName.toUpperCase())}</span><button class="text-button" id="share-trip">Copy trip link ↗</button></div></div>`;
  fillImages($('#trip-detail')); renderGallery();
  $('#edit-trip')?.addEventListener('click', () => openForm(t));
  $('#add-photos').onclick = () => { uploadTarget = t.id; $('#photo-form').reset(); moreFiles = []; $('#upload-error').textContent = ''; $('#more-file-count').textContent = ''; $('#upload-progress').hidden = true; $('#photo-form').elements.uploaderName.value = storage.get('trip-contributor-name') || ''; showDialog($('#upload-dialog')); };
  $('#share-trip').onclick = async () => {
    const url = `${location.origin}${location.pathname}${demo ? '?demo=1' : ''}#trip=${encodeURIComponent(t.id)}`;
    try { await navigator.clipboard.writeText(url); toast('Trip link copied. Send it to the group.'); } catch { toast('Copy this page’s address from your browser to share the trip.'); }
  };
  $('#more-gallery').onclick = () => { photoLimit += 60; watchGallery(t.id); };
}
function renderGallery() {
  const gallery = $('#gallery'); if (!gallery || !selectedTrip) return;
  $('#gallery-count').textContent = `${photos.length}${photos.length >= photoLimit ? '+' : ''} photos · Everyone’s point of view.`;
  gallery.className = photos.length ? 'gallery' : 'gallery-empty';
  gallery.innerHTML = photos.map((p, i) => `<figure class="gallery-photo"><button data-view-photo="${i}" aria-label="View photo ${i + 1} by ${h(p.uploaderName)}"><img data-photo-path="${h(p.storagePath)}" alt="${h(p.caption || `A moment from ${selectedTrip.title}, by ${p.uploaderName}`)}" width="${p.width}" height="${p.height}" loading="lazy" decoding="async" /></button><figcaption><span>${h(p.uploaderName)}</span><span>${selectedTrip.createdBy === user?.uid ? `<button data-cover-photo="${i}">${selectedTrip.coverPath === p.storagePath ? 'Cover' : 'Set cover'}</button> ` : ''}${p.uploaderId === user?.uid ? `<button data-remove-photo="${i}" aria-label="Remove your photo ${i + 1}">Remove</button>` : ''}</span></figcaption></figure>`).join('') || 'The best photos might still be on someone’s phone. Add the first ones.';
  $('#more-gallery').hidden = photos.length < photoLimit;
  fillImages(gallery);
}
$('#trip-detail').addEventListener('click', async e => {
  const view = e.target.closest('[data-view-photo]'); if (view) { lightboxIndex = Number(view.dataset.viewPhoto); showPhoto(); return; }
  const set = e.target.closest('[data-cover-photo]');
  if (set) { set.disabled = true; try { await api.setCover(selectedTrip.id, photos[Number(set.dataset.coverPhoto)].storagePath); toast('Cover photo updated.'); } catch (err) { toast(friendlyError(err)); set.disabled = false; } }
  const remove = e.target.closest('[data-remove-photo]');
  if (remove) {
    const photo = photos[Number(remove.dataset.removePhoto)], trip = selectedTrip;
    if (!confirm('Remove this photo from the shared gallery? This cannot be undone.')) return;
    remove.disabled = true;
    try { await api.removePhoto(trip.id, photo); if (trip.coverPath === photo.storagePath && trip.createdBy === user?.uid) await api.setCover(trip.id, ''); toast('Your photo was removed.'); }
    catch (err) { toast(friendlyError(err)); remove.disabled = false; }
  }
});
$('#photo-form').addEventListener('submit', async e => {
  e.preventDefault(); if (busy || !uploadTarget) return;
  const button = $('#upload-submit'), values = Object.fromEntries(new FormData(e.target)); $('#upload-error').textContent = '';
  try {
    if (!moreFiles.length) throw new Error('Choose at least one photo.'); validateFiles(moreFiles);
    const name = values.uploaderName.trim(), caption = values.caption.trim(); if (!name) throw new Error('Add your name for the photo credit.');
    formBusy(button, true); user = await api.guest(); storage.set('trip-contributor-name', name);
    await uploadQueue(uploadTarget, moreFiles, name, caption, $('#upload-progress'), button, selectedTrip?.id === uploadTarget && selectedTrip.createdBy === user.uid && !selectedTrip.coverPath);
    formBusy(button, false); $('#upload-dialog').close(); renderGallery(); toast('Your photos are in the memory book.');
  } catch (err) { $('#upload-error').textContent = `${friendlyError(err)}${moreFiles.length ? ` ${moreFiles.length} photo(s) remain to upload.` : ''}`; }
  finally { formBusy(button, false); button.textContent = 'Add to the gallery ↗'; }
});
let lightboxRequest = 0;
async function showPhoto() {
  if (!photos.length) return;
  lightboxIndex = (lightboxIndex + photos.length) % photos.length;
  const p = photos[lightboxIndex], request = ++lightboxRequest;
  $('#lightbox-image').removeAttribute('src'); $('#lightbox-image').alt = p.caption || `Photo by ${p.uploaderName}`;
  $('#photo-caption').textContent = `${p.caption ? p.caption + ' · ' : ''}Photo by ${p.uploaderName}`; $('#photo-position').textContent = `${lightboxIndex + 1} / ${photos.length}`;
  showDialog($('#lightbox'));
  try { const url = await api.imageUrl(p.storagePath); if (request === lightboxRequest) $('#lightbox-image').src = url; } catch { $('#photo-caption').textContent = 'This photo could not load. Close the viewer and try again.'; }
}
$('#previous-photo').onclick = () => { lightboxIndex--; showPhoto(); }; $('#next-photo').onclick = () => { lightboxIndex++; showPhoto(); };
$('#lightbox').addEventListener('keydown', e => { if (e.key === 'ArrowLeft') { e.preventDefault(); lightboxIndex--; showPhoto(); } if (e.key === 'ArrowRight') { e.preventDefault(); lightboxIndex++; showPhoto(); } });
function route() { const match = location.hash.match(/^#trip=([a-zA-Z0-9_-]{1,100})$/); if (match) openTrip(match[1], false); else if (tripDialog.open) tripDialog.close(); }
window.addEventListener('popstate', route); window.addEventListener('hashchange', route);
window.addEventListener('beforeunload', e => { if (busy) { e.preventDefault(); e.returnValue = ''; } });
window.addEventListener('offline', () => toast('You’re offline. Reconnect before saving a trip or adding photos.'));
try { worldMap = createMap('world-map'); pinLayer = L.layerGroup().addTo(worldMap); } catch (err) { $('#map-status').textContent = err.message; }
try {
  api = await import(demo ? './preview-data.js' : './firebase.js');
  if (demo) { $('#connection-status').hidden = false; $('#connection-status').textContent = 'DESIGN PREVIEW · These are sample trips, not Aiden’s travel history. Changes stay in this preview and are not uploaded to Firebase.'; }
  api.watchTrips(data => { trips = data; if (!demo) $('#connection-status').hidden = true; renderTrips(); }, connectionError);
  route();
} catch (err) { connectionError(err); }
