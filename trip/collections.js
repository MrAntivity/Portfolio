import { escapeHtml as h, validateFiles } from './model.js';
import { validateCollection, validatePlace, sortPlaces } from './collections-model.js';
import { createMap, pinIcon, findPlaces } from './map.js';
import { preparePhoto } from './photos.js';

export function initCollections({ api, toast, showDialog }) {
  const $ = selector => document.querySelector(selector);
  let editing=false, busy=false, collections=[], selected=null, places=[], activePlace=null, gallery=[];
  let stopPlaces, stopPhotos, map, pins, picker, marker, results=[], sort='relevance';
  let collectionEditId=null, placeEditId=null, savedPlaceId=null, files=[], searchGeneration=0;
  const collectionDialog=$('#collection-dialog'), placeDialog=$('#place-dialog'), placeForm=$('#place-form'), collectionForm=$('#collection-form');
  const fail = error => error?.code?.includes('permission') ? 'Editing is locked. Unlock editing mode and try again.' : error?.message || 'Could not complete that change. Please try again.';
  const validId = id => /^[a-zA-Z0-9_-]{1,100}$/.test(id || '');
  function setView(view, updateUrl=true) {
    const isCollections=view==='collections';
    document.querySelectorAll('[data-trip-view]').forEach(el=>{el.hidden=isCollections;});
    $('#collections-view').hidden=!isCollections;
    $('#view-trips').setAttribute('aria-pressed',String(!isCollections));
    $('#view-collections').setAttribute('aria-pressed',String(isCollections));
    if(updateUrl) history.replaceState(null,'',location.pathname+location.search+(isCollections?'#collections':''));
    if(!isCollections) window.dispatchEvent(new Event('resize'));
  }
  $('#view-trips').onclick=()=>setView('trips'); $('#view-collections').onclick=()=>setView('collections');
  function editorControls() {document.querySelectorAll('[data-collection-editor]').forEach(el=>{el.hidden=!editing;});}
  function setEditing(user) {
    editing=Boolean(user); editorControls();
    $('#new-collection').hidden=!editing;
    if(!editing) {$('#collection-form-dialog').close();$('#place-form-dialog').close();}
    if(activePlace) renderGallery();
  }
  async function image(path, img) {
    try { const url=await api.collectionImageUrl(path);if(img.isConnected) img.src=url; } catch {img.hidden=true;}
  }
  function renderCollections() {
    $('#collections-status').textContent=collections.length ? `${collections.length} ${collections.length===1?'collection':'collections'}` : 'No collections yet.';
    $('#collection-grid').innerHTML=collections.map(c=>`<button type="button" class="collection-card" data-open-collection="${h(c.id)}"><span class="collection-card-top"><svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M3 6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/></svg><span>↗</span></span><h2>${h(c.title)}</h2><p>${h(c.description || 'Saved places, ratings, and notes.')}</p><span class="collection-card-footer">View collection</span></button>`).join('');
    if(selected) {
      const next=collections.find(c=>c.id===selected.id);
      if(next) {selected=next;$('#collection-title').textContent=next.title;$('#collection-description').textContent=next.description;}
      else {collectionDialog.close();placeDialog.close();selected=null;}
    }
  }
  function openCollectionForm(c=null) {
    if(!editing || busy) return;
    collectionEditId=c?.id || null;collectionForm.reset();
    collectionForm.elements.title.value=c?.title || '';collectionForm.elements.description.value=c?.description || '';
    $('#collection-form-title').textContent=c?'Edit collection':'New collection';$('#collection-form-error').textContent='';showDialog($('#collection-form-dialog'));
  }
  $('#new-collection').onclick=()=>openCollectionForm();
  $('#collection-edit').onclick=()=>openCollectionForm(selected);
  collectionForm.onsubmit=async event=>{
    event.preventDefault();if(!editing || busy) return;
    const button=collectionForm.querySelector('[type=submit]');
    try {const values=validateCollection(Object.fromEntries(new FormData(collectionForm)));busy=true;button.disabled=true;const id=collectionEditId || api.newCollectionId();await api.saveCollection(id,values,Boolean(collectionEditId));$('#collection-form-dialog').close();toast('Collection saved.');}
    catch(error){$('#collection-form-error').textContent=fail(error);}finally{busy=false;button.disabled=false;}
  };
  $('#collection-grid').onclick=event=>{const button=event.target.closest('[data-open-collection]');if(button) openCollection(button.dataset.openCollection);};
  function openCollection(id,updateUrl=true) {
    const c=collections.find(item=>item.id===id);if(!c) return;
    setView('collections',false);stopPlaces?.();selected=c;places=[];activePlace=null;
    $('#collection-title').textContent=c.title;$('#collection-description').textContent=c.description;
    $('#place-search').value='';sort='relevance';$('#places-status').textContent='Loading places…';$('#places-list').innerHTML='';
    editorControls();showDialog(collectionDialog);
    if(updateUrl) history.replaceState(null,'',location.pathname+location.search+'#collection='+encodeURIComponent(id));
    requestAnimationFrame(()=>{
      try {if(!map){map=createMap('collection-map');pins=L.layerGroup().addTo(map);}map.invalidateSize();renderPins(true);}catch(error){$('#places-status').textContent=fail(error);}
    });
    stopPlaces=api.watchPlaces(id,data=>{const first=places.length===0;places=data;renderPlaces();if(first) renderPins(true);if(activePlace){const next=places.find(p=>p.id===activePlace.id);if(next){activePlace=next;renderPlace();renderGallery();}else{placeDialog.close();activePlace=null;}}},error=>{$('#places-status').textContent=fail(error);});
  }
  collectionDialog.addEventListener('close',()=>{stopPlaces?.();stopPhotos?.();if(location.hash.startsWith('#collection=')) history.replaceState(null,'',location.pathname+location.search+'#collections');});
  placeDialog.addEventListener('close',()=>{stopPhotos?.();activePlace=null;});
  function renderPlaces() {
    const shown=sortPlaces(places,$('#place-search').value,sort);
    $('#places-status').textContent=`${shown.length} ${shown.length===1?'place':'places'}${sort==='relevance' && !$('#place-search').value.trim()?' · Recently added first':''}`;
    document.querySelectorAll('[data-place-sort]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.placeSort===sort)));
    $('#places-list').innerHTML=shown.map(p=>`<button class="place-card" type="button" data-open-place="${h(p.id)}">${p.coverPath?`<img data-place-image="${h(p.coverPath)}" alt="${h(p.name)}" loading="lazy" />`:'<span class="place-card-icon" aria-hidden="true">↗</span>'}<span class="place-card-copy"><span class="place-card-heading"><strong>${h(p.name)}</strong><span class="place-rating">${p.rating?`${p.rating} <span aria-label="out of 5 stars">★</span>`:'Unrated'}</span></span><span class="place-address">${h(p.address || `${Number(p.lat).toFixed(4)}, ${Number(p.lng).toFixed(4)}`)}</span>${p.notes?`<span class="place-note">${h(p.notes)}</span>`:''}</span></button>`).join('') || '<div class="empty-state"><h3>No places found.</h3><p>Try another search, or add a place in editing mode.</p></div>';
    document.querySelectorAll('[data-place-image]').forEach(img=>image(img.dataset.placeImage,img));renderPins();
  }
  function renderPins(fit=false) {
    if(!map || !pins) return;pins.clearLayers();
    const shown=sortPlaces(places,$('#place-search').value,sort);
    shown.forEach((p,i)=>{const popup=document.createElement('div');popup.className='pin-popup';const name=document.createElement('strong');name.textContent=p.name;popup.append(name);const rating=document.createElement('small');rating.textContent=p.rating?`${p.rating} / 5`:'Unrated';popup.append(rating);const button=document.createElement('button');button.textContent='View place';button.onclick=()=>openPlace(p.id);popup.append(button);L.marker([p.lat,p.lng],{icon:pinIcon(i+1),title:p.name,alt:p.name}).addTo(pins).bindPopup(popup);});
    if(fit) {if(shown.length) map.fitBounds(shown.map(p=>[p.lat,p.lng]),{padding:[45,45],maxZoom:13});else map.setView([33.9,-117.9],8);}
  }
  $('#collection-fit').onclick=()=>renderPins(true);
  $('#place-search').oninput=renderPlaces;
  document.querySelectorAll('[data-place-sort]').forEach(button=>{button.onclick=()=>{sort=button.dataset.placeSort;renderPlaces();};});
  $('#places-list').onclick=event=>{const button=event.target.closest('[data-open-place]');if(button)openPlace(button.dataset.openPlace);};
  function openPlace(id) {
    activePlace=places.find(p=>p.id===id);if(!activePlace || !selected) return;gallery=[];stopPhotos?.();renderPlace();renderGallery();showDialog(placeDialog);
    stopPhotos=api.watchPlacePhotos(selected.id,id,data=>{gallery=data;renderGallery();},error=>{$('#place-gallery-status').textContent=fail(error);});
  }
  function renderPlace() {
    if(!activePlace) return;const p=activePlace;
    $('#place-title').textContent=p.name;
    $('#place-info').innerHTML=`<p class="place-rating">${p.rating?`${p.rating} / 5 ★`:'Not rated yet'}</p><p class="place-address">${h(p.address)}</p><a class="place-map-link" href="https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=16/${p.lat}/${p.lng}" target="_blank" rel="noopener noreferrer">Open location ↗</a><p class="place-full-notes">${h(p.notes || 'No notes yet.')}</p>`;editorControls();
  }
  function renderGallery() {
    $('#place-gallery-status').textContent=gallery.length?`${gallery.length} photos`:'No photos yet.';
    $('#place-gallery').innerHTML=gallery.map(p=>`<figure><button type="button" class="place-photo" data-open-place-photo="${h(p.id)}" aria-label="Open photo of ${h(activePlace?.name)}"><img data-gallery-image="${h(p.storagePath)}" alt="${h(activePlace?.name)}" loading="lazy" /></button>${editing?`<figcaption><button class="text-button" data-place-cover="${h(p.id)}">${activePlace?.coverPath===p.storagePath?'Cover':'Set cover'}</button><button class="text-button danger" data-place-remove-photo="${h(p.id)}">Remove</button></figcaption>`:''}</figure>`).join('');
    document.querySelectorAll('[data-gallery-image]').forEach(img=>image(img.dataset.galleryImage,img));
  }
  async function mutation(action, message) {if(!editing || busy)return;busy=true;try{await action();toast(message);}catch(error){toast(fail(error));}finally{busy=false;}}
  $('#place-gallery').onclick=async event=>{
    const open=event.target.closest('[data-open-place-photo]');if(open){const photo=gallery.find(p=>p.id===open.dataset.openPlacePhoto);if(!photo)return;const img=$('#collection-photo-image');img.removeAttribute('src');showDialog($('#collection-photo-dialog'));try{img.src=await api.collectionImageUrl(photo.storagePath);}catch(error){toast(fail(error));}return;}
    if(!editing || !selected || !activePlace) return;const c=selected.id,p=activePlace.id;
    const cover=event.target.closest('[data-place-cover]');if(cover){const photo=gallery.find(x=>x.id===cover.dataset.placeCover);if(photo)await mutation(()=>api.setPlaceCover(c,p,photo.storagePath),'Cover updated.');}
    const remove=event.target.closest('[data-place-remove-photo]');if(remove && confirm('Delete this photo? This cannot be undone.')){const photo=gallery.find(x=>x.id===remove.dataset.placeRemovePhoto);if(photo)await mutation(()=>api.removePlacePhoto(c,p,photo),'Photo deleted.');}
  };
  $('#collection-delete').onclick=()=>{if(selected && editing && !busy && confirm('Delete this collection, all its places, and their photos? This cannot be undone.')){const id=selected.id;mutation(async()=>{await api.removeCollection(id);collectionDialog.close();},'Collection deleted.');}};
  $('#place-delete').onclick=()=>{if(selected && activePlace && editing && !busy && confirm('Delete this place and its photos? This cannot be undone.')){const c=selected.id,p=activePlace.id;mutation(async()=>{await api.removePlace(c,p);placeDialog.close();},'Place deleted.');}};
  function setPin(lat,lng,fly=false) {
    if(busy) return;
    lat=Math.max(-85,Math.min(85,lat));lng=((lng+180)%360+360)%360-180;
    placeForm.elements.lat.value=lat.toFixed(6);placeForm.elements.lng.value=lng.toFixed(6);
    if(!picker)return;
    if(!marker){marker=L.marker([lat,lng],{icon:pinIcon(),draggable:true,alt:'Saved place location'}).addTo(picker);marker.on('dragend',()=>{const p=marker.getLatLng();setPin(p.lat,p.lng);});}else marker.setLatLng([lat,lng]);
    if(fly)picker.setView([lat,lng],15);
  }
  function openPlaceForm(p=null) {
    if(!editing || busy || !selected)return;placeForm.reset();files=[];placeEditId=p?.id || null;savedPlaceId=null;searchGeneration++;
    $('#place-form-title').textContent=p?'Edit place':'Add place';$('#place-form-error').textContent='';$('#place-progress').hidden=true;$('#collection-location-query').value='';$('#collection-location-results').textContent='';
    if(p)for(const key of ['name','address','notes','lat','lng','rating'])placeForm.elements[key].value=p[key] ?? '';
    showDialog($('#place-form-dialog'));
    requestAnimationFrame(()=>{try{if(!picker){picker=createMap('collection-picker');picker.on('click',e=>setPin(e.latlng.lat,e.latlng.lng));}picker.invalidateSize();if(p)setPin(p.lat,p.lng,true);else{marker?.remove();marker=null;if(map)picker.setView(map.getCenter(),Math.max(map.getZoom(),8));else picker.setView([33.9,-117.9],8);}}catch(error){$('#collection-location-results').textContent=fail(error);}});
  }
  $('#collection-add-place').onclick=()=>openPlaceForm();$('#place-edit').onclick=()=>openPlaceForm(activePlace);
  for(const key of ['lat','lng'])placeForm.elements[key].addEventListener('change',()=>{const lat=placeForm.elements.lat.value,lng=placeForm.elements.lng.value;if(lat!==''&&lng!==''&&Number.isFinite(Number(lat))&&Number.isFinite(Number(lng)))setPin(Number(lat),Number(lng),true);});
  $('#collection-location-find').onclick=async()=>{
    if(!editing || busy)return;const generation=++searchGeneration,button=$('#collection-location-find');button.disabled=true;$('#collection-location-results').textContent='Searching…';
    try{results=await findPlaces($('#collection-location-query').value);if(generation!==searchGeneration)return;$('#collection-location-results').innerHTML=results.length?results.map((p,i)=>`<button type="button" data-location-result="${i}"><strong>${h(p.locationLabel)}</strong><br />${h(p.address)}<span class="search-result-action">Use this place ↗</span></button>`).join(''):'No results. Try a city or address, or drop a pin manually.';}
    catch(error){if(generation===searchGeneration)$('#collection-location-results').textContent=fail(error);}finally{button.disabled=false;}
  };
  $('#collection-location-query').onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();$('#collection-location-find').click();}};
  $('#collection-location-results').onclick=event=>{const button=event.target.closest('[data-location-result]');if(!button || !editing || busy)return;const p=results[Number(button.dataset.locationResult)];if(!p)return;placeForm.elements.name.value=p.name || p.locationLabel;placeForm.elements.address.value=p.address;setPin(p.lat,p.lng,true);$('#collection-location-results').textContent='Location selected. Adjust the name, pin, rating, or notes, then save.';};
  $('#place-files').onchange=event=>{try{const chosen=[...event.target.files];validateFiles(chosen);files=chosen;$('#place-form-error').textContent='';}catch(error){event.target.value='';files=[];$('#place-form-error').textContent=fail(error);}};
  placeForm.onsubmit=async event=>{
    event.preventDefault();if(!editing || busy || !selected)return;const button=$('#place-save'),id=selected.id;
    try{
      const values=validatePlace(Object.fromEntries(new FormData(placeForm)));validateFiles(files);busy=true;button.disabled=true;
      for(const el of placeForm.elements)el.disabled=true;
      const placeId=savedPlaceId || placeEditId || api.newPlaceId(id);await api.savePlace(id,placeId,values,Boolean(savedPlaceId || placeEditId));savedPlaceId=placeId;
      const total=files.length;let done=0;$('#place-progress').hidden=!total;
      while(files.length){button.textContent=`Uploading ${done+1} of ${total}…`;const photo=await preparePhoto(files[0]);await api.uploadPlacePhoto(id,placeId,photo.blob,photo,fraction=>{$('#place-progress').value=(done+fraction)/total*100;});files.shift();done++;}
      $('#place-form-dialog').close();toast('Place saved.');
    }catch(error){$('#place-form-error').textContent=`${savedPlaceId?'Place saved. ':''}${fail(error)}${files.length && savedPlaceId?' Retry to upload the remaining photos.':''}`;}
    finally{busy=false;for(const el of placeForm.elements)el.disabled=false;button.textContent='Save place';$('#place-progress').hidden=true;}
  };
  function route() {if(location.hash==='#journal' || location.hash.startsWith('#trip='))setView('trips',false);if(location.hash==='#collections')setView('collections',false);const match=location.hash.match(/^#collection=([a-zA-Z0-9_-]{1,100})$/);if(match && validId(match[1]) && (!collectionDialog.open || selected?.id!==match[1]))openCollection(match[1],false);}
  window.addEventListener('hashchange',route);window.addEventListener('popstate',route);
  api.watchCollections(data=>{collections=data;renderCollections();route();},error=>{$('#collections-status').textContent=fail(error);});route();
  return {setEditing,isBusy:()=>busy};
}
