export function initFileSharing({call,openModal,escapeHtml:h,getFiles,getFolders}) {
  const url=id=>`${location.origin}/share/#${id}`;
  const message=e=>e.code==='functions/not-found'||e.code==='functions/unavailable'?'Sharing is not active yet. Deploy the sharing functions in Firebase first.':e.message||'Sharing failed. Please try again.';
  async function manage(kind,targetId) {
    const target=(kind==='file'?getFiles():getFolders()).find(x=>x.id===targetId);
    openModal(`<h2>${target?'Share '+h(target.name):'Manage shared links'}</h2>
      <p>Recipients can view and download. Folder links include subfolders and future files added inside them.</p>
      ${target?`<form id="share-create"><label>Optional PIN<input name="pin" type="password" inputmode="numeric" pattern="[0-9]{4,12}" minlength="4" maxlength="12" autocomplete="new-password" placeholder="Leave blank for anyone with the link" /></label><button class="button primary">Create share link</button></form>`:''}
      <p class="form-error" id="share-status" role="status"></p><div id="share-links">Loading links…</div>
      <p>Revoking a link or changing its PIN blocks future downloads. Downloaded copies and downloads already in progress cannot be recalled.</p>
      <button class="button ghost" id="share-revoke-all">Revoke ALL shared links</button>`,root=>{
      const status=root.querySelector('#share-status'),list=root.querySelector('#share-links'); let working=false;
      async function run(fn){if(working)return;working=true;status.textContent='Working…';root.querySelectorAll('button').forEach(b=>b.disabled=true);try{await fn();}catch(e){status.textContent=message(e);}finally{working=false;root.querySelectorAll('button').forEach(b=>b.disabled=false);}}
      async function refresh(){const {data}=await call({action:'list'});const entries=data.shares.filter(s=>!target||(s.kind===kind&&s.targetId===targetId));
        list.innerHTML=entries.map(s=>`<section class="share-link-row" data-share="${h(s.id)}"><strong>${h(s.name)}</strong><p>${s.active?(s.hasPin?'PIN protected':'Anyone with link'):'Revoked'}</p>${s.active?`<label>Share link<input readonly value="${h(url(s.id))}" /></label><div class="share-controls"><button class="button ghost" data-copy>Copy link</button><button class="button ghost" data-pin>Change / remove PIN</button><button class="button ghost" data-revoke>Revoke link</button></div><form data-pin-form hidden><label>New PIN (leave blank to remove)<input name="pin" type="password" inputmode="numeric" pattern="[0-9]{4,12}" minlength="4" maxlength="12" autocomplete="new-password" /></label><button class="button primary">Save PIN settings</button></form>`:''}</section>`).join('')||'<p>No share links yet.</p>';
      }
      root.querySelector('#share-create')?.addEventListener('submit',e=>{e.preventDefault();const pin=e.target.elements.pin.value;run(async()=>{await call({action:'create',kind,targetId,pin});e.target.reset();await refresh();status.textContent='Link created. Copy it below.';});});
      list.addEventListener('click',e=>{const row=e.target.closest('[data-share]');if(!row)return;const id=row.dataset.share;
        if(e.target.closest('[data-copy]'))run(async()=>{try{await navigator.clipboard.writeText(url(id));status.textContent='Link copied.';}catch{row.querySelector('input').select();status.textContent='Select and copy the link above.';}});
        if(e.target.closest('[data-pin]'))row.querySelector('[data-pin-form]').hidden=false;
        if(e.target.closest('[data-revoke]'))run(async()=>{await call({action:'revoke',id});await refresh();status.textContent='Link revoked.';});
      });
      list.addEventListener('submit',e=>{e.preventDefault();const id=e.target.closest('[data-share]').dataset.share,pin=e.target.elements.pin.value;run(async()=>{await call({action:'pin',id,pin});await refresh();status.textContent=pin?'PIN changed. Previously unlocked sessions must unlock again.':'PIN removed. Anyone with the link can now open it.';});});
      root.querySelector('#share-revoke-all').onclick=()=>{if(confirm('Revoke every shared file and folder link? You can create new links afterward.'))run(async()=>{await call({action:'revokeAll'});await refresh();status.textContent='All shared links revoked.';});};
      run(async()=>{await refresh();status.textContent='';});
    });
  }
  const panel=document.getElementById('tab-files');
  panel.addEventListener('click',e=>{const button=e.target.closest('[data-share-kind]');if(!button)return;e.preventDefault();e.stopImmediatePropagation();manage(button.dataset.shareKind,button.dataset.shareTarget);},true);
  panel.addEventListener('keydown',e=>{if(e.target.closest('[data-share-kind]')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopImmediatePropagation();e.target.closest('[data-share-kind]').click();}},true);
  document.getElementById('manage-shares-btn').onclick=()=>manage();
}
