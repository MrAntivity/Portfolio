import { sanitizeNoteHtml } from './content-security.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const NOTE_TEMPLATES = {
  blank: { title: '', html: '<p><br></p>' },
  lecture: { title: 'Lecture notes', html: '<h1>Lecture notes</h1><p>Course · Topic · Date</p><h2>Key ideas</h2><ul><li><br></li></ul><h2>Examples & explanations</h2><p><br></p><h2>Questions to revisit</h2><ul data-checklist="true"><li><br></li></ul><h2>Summary</h2><p><br></p>' },
  meeting: { title: 'Meeting notes', html: '<h1>Meeting notes</h1><p>Date · Attendees</p><h2>Agenda</h2><ol><li><br></li></ol><h2>Discussion</h2><p><br></p><h2>Decisions</h2><ul><li><br></li></ul><h2>Action items</h2><ul data-checklist="true"><li><br></li></ul>' },
  daily: { title: 'Daily journal', html: '<h1>Today</h1><h2>What’s on my mind</h2><p><br></p><h2>Three priorities</h2><ul data-checklist="true"><li><br></li><li><br></li><li><br></li></ul><h2>A small win</h2><p><br></p>' }
};

export function mountNotesEditor({ root, onChange, uploadImages, ai, getNoteId }) {
  const surface = root.querySelector('#editor-surface'), title = root.querySelector('#editor-title');
  const toolbar = root.querySelector('#editor-toolbar'), outline = root.querySelector('#notes-outline-list');
  const metrics = root.querySelector('#notes-metrics'), message = root.querySelector('#notes-message');
  let selection = null, refreshTimer, busyImages = false;
  const status = text => { message.textContent = text; };
  const within = range => range && surface.contains(range.startContainer) && surface.contains(range.endContainer);
  function capture() { const sel = window.getSelection(); if (sel?.rangeCount && within(sel.getRangeAt(0))) selection = sel.getRangeAt(0).cloneRange(); }
  function restore() {
    surface.focus({ preventScroll: true });
    const sel = window.getSelection();
    if (!within(selection)) { selection = document.createRange(); selection.selectNodeContents(surface); selection.collapse(false); }
    sel.removeAllRanges(); sel.addRange(selection);
  }
  function refresh() {
    const clone = surface.cloneNode(true);
    clone.querySelectorAll('p,div,h1,h2,h3,h4,li,tr,blockquote,pre,br').forEach(node => node.append('\n'));
    const text = surface.innerText || clone.textContent || '';
    const words = text.trim().split(/\s+/u).filter(Boolean).length;
    metrics.textContent = `${words.toLocaleString()} ${words === 1 ? 'word' : 'words'} · ${text.length.toLocaleString()} characters · ${Math.max(1, Math.ceil(words / 220))} min read`;
    const headings = [...surface.querySelectorAll('h1,h2,h3')];
    outline.replaceChildren();
    if (!headings.length) { const p = document.createElement('p'); p.textContent = 'Add headings to navigate your note.'; outline.append(p); }
    headings.forEach(heading => {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = heading.textContent || 'Untitled heading'; button.dataset.level = heading.tagName.slice(1);
      button.addEventListener('click', () => { heading.scrollIntoView({ behavior: 'smooth', block: 'center' }); const r = document.createRange(); r.selectNodeContents(heading); r.collapse(true); selection = r; restore(); }); outline.append(button);
    });
  }
  function changed() { capture(); onChange(); clearTimeout(refreshTimer); refreshTimer = setTimeout(refresh, 150); }
  function command(name, value = null) {
    restore();
    document.execCommand('styleWithCSS', false, true);
    document.execCommand(name, false, value);
    changed(); updateActive();
  }
  function insert(html) { command('insertHTML', sanitizeNoteHtml(html)); }
  function updateActive() {
    if (!within(window.getSelection()?.rangeCount ? window.getSelection().getRangeAt(0) : null)) return;
    toolbar.querySelectorAll('[data-cmd]').forEach(button => {
      let active = false; try { active = document.queryCommandState(button.dataset.cmd); } catch {}
      button.setAttribute('aria-pressed', String(active));
    });
  }
  document.addEventListener('selectionchange', () => { capture(); updateActive(); });
  toolbar.addEventListener('mousedown', event => { if (event.target.closest('button')) event.preventDefault(); });
  toolbar.querySelectorAll('[data-cmd]').forEach(button => button.addEventListener('click', () => command(button.dataset.cmd)));
  const dialog = root.querySelector('#notes-dialog');
  function formDialog(heading, fields, submitLabel, submit) {
    capture();
    dialog.innerHTML = `<form method="dialog"><div class="notes-dialog-head"><h2>${escape(heading)}</h2><button type="button" data-close aria-label="Close dialog">×</button></div>${fields}<p class="notes-dialog-error" role="alert"></p><div class="notes-dialog-actions"><button type="button" data-close class="button ghost">Cancel</button><button type="submit" class="button primary">${escape(submitLabel)}</button></div></form>`;
    dialog.querySelectorAll('[data-close]').forEach(b => b.onclick = () => dialog.close());
    dialog.querySelector('form').onsubmit = async event => {
      event.preventDefault();
      try { await submit(new FormData(event.target)); dialog.close(); }
      catch (error) { dialog.querySelector('.notes-dialog-error').textContent = error.message; }
    };
    dialog.showModal();
  }
  const bind = (id, fn) => root.querySelector('#' + id)?.addEventListener('click', fn);
  root.querySelector('#notes-block').addEventListener('change', event => command('formatBlock', event.target.value));
  root.querySelector('#notes-font').addEventListener('change', event => command('fontName', event.target.value));
  root.querySelector('#font-size-input').addEventListener('change', event => {
    const size = Math.max(8, Math.min(96, Number(event.target.value) || 16)); event.target.value = size;
    restore(); document.execCommand('styleWithCSS', false, false); document.execCommand('fontSize', false, '7');
    surface.querySelectorAll('font[size="7"]').forEach(font => { font.removeAttribute('size'); font.style.fontSize = `${size}px`; }); changed();
  });
  for (const [id, cmd] of [['notes-text-color','foreColor'],['notes-highlight','hiliteColor']]) root.querySelector('#' + id).addEventListener('input', event => command(cmd,event.target.value));
  root.querySelector('#notes-spacing').addEventListener('change', event => {
    restore(); const range = window.getSelection().getRangeAt(0);
    const blocks = [...surface.querySelectorAll('p,div,h1,h2,h3,li,blockquote')].filter(el => range.intersectsNode(el));
    if (blocks.length) blocks.forEach(el => { el.style.lineHeight = event.target.value; });
    else { command('formatBlock','p'); const el = window.getSelection().anchorNode?.parentElement?.closest('p'); if (el) el.style.lineHeight = event.target.value; }
    changed();
  });
  bind('notes-checklist', () => {
    command('insertUnorderedList');
    const node = window.getSelection()?.anchorNode;
    const list = (node?.nodeType === 1 ? node : node?.parentElement)?.closest('ul');
    if (list && surface.contains(list)) list.dataset.checklist = 'true'; changed();
  });
  surface.addEventListener('click', event => {
    const li = event.target.closest('ul[data-checklist] > li');
    if (li && event.clientX <= li.getBoundingClientRect().left + 24) { li.dataset.checked = li.dataset.checked === 'true' ? 'false' : 'true'; changed(); }
    const comment = event.target.closest('.note-comment');
    if (comment) editComment(comment);
  });
  bind('notes-rule', () => insert('<hr><p><br></p>'));
  bind('notes-page-break', () => insert('<div class="note-page-break"><br></div><p><br></p>'));
  bind('editor-link-btn', () => {
    restore(); const node = window.getSelection().anchorNode;
    const existing = (node?.nodeType === 1 ? node : node?.parentElement)?.closest('a');
    const text = window.getSelection().toString() || existing?.textContent || '';
    formDialog('Insert link', `<label>Text<input name="text" required value="${escape(text)}"></label><label>Address<input name="url" type="url" required placeholder="https://example.com" value="${escape(existing?.href || '')}"></label>`, 'Insert link', data => {
      const url = new URL(data.get('url')); if (url.protocol !== 'https:') throw Error('Use a secure https:// link.');
      if (existing) { existing.href = url.href; existing.textContent = data.get('text'); changed(); }
      else insert(`<a href="${escape(url.href)}">${escape(data.get('text'))}</a>`);
    });
  });
  function editComment(existing) {
    restore(); const text = window.getSelection().toString();
    if (!existing && !text) { status('Select a passage first to add a comment.'); return; }
    formDialog(existing ? 'Edit comment' : 'Add comment', `<label>Comment<textarea name="comment" rows="4" maxlength="2000">${escape(existing?.dataset.comment || '')}</textarea></label><p>Leave blank to remove an existing comment.</p>`, 'Save comment', data => {
      const comment = String(data.get('comment')).trim();
      if (existing) { if (comment) { existing.dataset.comment = comment; existing.title = comment; } else existing.replaceWith(...existing.childNodes); changed(); }
      else if (comment) insert(`<span class="note-comment" data-comment="${escape(comment)}">${escape(text)}</span>`);
    });
  }
  bind('editor-comment-btn', () => editComment(null));
  bind('notes-table', () => formDialog('Insert a table', '<div class="notes-dialog-columns"><label>Rows<input name="rows" type="number" value="3" min="1" max="30" required></label><label>Columns<input name="cols" type="number" value="3" min="1" max="10" required></label></div>', 'Insert table', data => {
    const rows = Math.max(1,Math.min(30,Number(data.get('rows')))), cols = Math.max(1,Math.min(10,Number(data.get('cols'))));
    insert('<table><tbody>' + Array.from({length:rows},(_,i) => '<tr>' + Array.from({length:cols},() => i ? '<td><br></td>' : '<th><br></th>').join('') + '</tr>').join('') + '</tbody></table><p><br></p>');
  }));
  root.querySelector('#notes-table-action').addEventListener('change', event => {
    const action = event.target.value; event.target.value = ''; if (!action) return;
    restore(); const node = window.getSelection().anchorNode;
    const cell = (node?.nodeType === 1 ? node : node?.parentElement)?.closest('td,th');
    if (!cell || !surface.contains(cell)) { status('Place your cursor in a table first.'); return; }
    const row = cell.parentElement, table = cell.closest('table'), index = cell.cellIndex;
    // Insert/replace through the editing engine so table changes share undo history.
    const clone = table.cloneNode(true), rows = [...clone.rows], rowIndex = [...table.rows].indexOf(row);
    if (action === 'row') { const tr = document.createElement('tr'); for (let i = 0; i < row.cells.length; i++) tr.insertCell().innerHTML = '<br>'; rows[rowIndex].after(tr); }
    if (action === 'column') rows.forEach(r => { const td = document.createElement(r.cells[0]?.tagName || 'td'); td.innerHTML = '<br>'; (r.cells[index] || r.lastElementChild)?.after(td); });
    if (action === 'remove-row') rows[rowIndex].remove();
    if (action === 'remove-column') rows.forEach(r => r.cells[index]?.remove());
    const range = document.createRange(); range.selectNode(table); selection = range;
    insert(action === 'remove-table' || !clone.rows.length || !clone.rows[0]?.cells.length ? '<p><br></p>' : clone.outerHTML);
  });
  async function images(files) {
    const list = [...files]; if (!list.length || busyImages) return;
    const noteId = getNoteId(); capture(); const saved = selection?.cloneRange(); busyImages = true; status('Uploading images…');
    try { const html = await uploadImages(list, noteId); if (getNoteId() !== noteId) return; selection = saved; insert(html); status('Images inserted.'); }
    catch(error) { status(error.message || 'Image upload failed. Try again.'); }
    finally { busyImages = false; }
  }
  bind('editor-insert-image-btn', () => { capture(); root.querySelector('#editor-image-input').click(); });
  root.querySelector('#editor-image-input').addEventListener('change', event => { images(event.target.files); event.target.value = ''; });
  surface.addEventListener('paste', event => {
    if (!event.clipboardData) return; event.preventDefault();
    if (event.clipboardData.files.length) { images(event.clipboardData.files); return; }
    const html = event.clipboardData.getData('text/html');
    if (html) insert(html); else command('insertText',event.clipboardData.getData('text/plain'));
  });
  surface.addEventListener('dragover', event => { event.preventDefault(); event.stopPropagation(); });
  surface.addEventListener('drop', event => { event.preventDefault(); event.stopPropagation(); capture(); if (event.dataTransfer.files.length) images(event.dataTransfer.files); else { const html = event.dataTransfer.getData('text/html'); if (html) insert(html); else command('insertText',event.dataTransfer.getData('text/plain')); } });
  surface.addEventListener('input', changed);
  title.addEventListener('input', onChange);
  bind('notes-focus', () => { const active = root.classList.toggle('notes-focus'); root.querySelector('#notes-focus').setAttribute('aria-pressed',String(active)); });
  const findPanel = root.querySelector('#notes-find-panel');
  const findInput = root.querySelector('#notes-find-text'), replaceInput = root.querySelector('#notes-replace-text');
  let matches = [], matchIndex = -1;
  function findMatches() {
    matches = []; matchIndex = -1;
    const term = findInput.value.toLocaleLowerCase();
    if (term) { const walker = document.createTreeWalker(surface,NodeFilter.SHOW_TEXT); let node; while ((node = walker.nextNode())) { let index = 0; const text = node.textContent.toLocaleLowerCase(); while ((index = text.indexOf(term,index)) !== -1) { matches.push({node,index,length:term.length}); index += term.length; } } }
    root.querySelector('#notes-find-count').textContent = `${matches.length} matches`;
    return matches;
  }
  bind('notes-find', () => { findPanel.hidden = !findPanel.hidden; if (!findPanel.hidden) findInput.focus(); });
  bind('notes-find-close', () => { findPanel.hidden = true; restore(); });
  findInput.addEventListener('input',findMatches);
  bind('notes-find-next', () => {
    if (!matches.length) findMatches(); if (!matches.length) return;
    matchIndex = (matchIndex + 1) % matches.length; const match = matches[matchIndex];
    if (!match.node.isConnected) { findMatches(); return; }
    const range = document.createRange(); range.setStart(match.node,match.index); range.setEnd(match.node,match.index + match.length); selection = range; restore(); match.node.parentElement.scrollIntoView({block:'center'});
    root.querySelector('#notes-find-count').textContent = `${matchIndex + 1} of ${matches.length}`;
  });
  bind('notes-replace-all', () => {
    findMatches(); if (!matches.length) return; const count = matches.length;
    // Work from the end so earlier character offsets remain stable.
    for (const match of matches.reverse()) { const range = document.createRange(); range.setStart(match.node,match.index); range.setEnd(match.node,match.index + match.length); selection = range; command('insertText',replaceInput.value); }
    findMatches(); status(`Replaced ${count} matches. Find matches within each formatted text run.`);
  });
  surface.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f') { event.preventDefault(); findPanel.hidden = false; findInput.focus(); }
    if (event.key === 'Escape') { root.classList.remove('notes-focus'); root.querySelector('#notes-focus').setAttribute('aria-pressed','false'); }
    if (event.key === 'Tab') { event.preventDefault(); command(event.shiftKey ? 'outdent' : 'indent'); }
    if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'x') { event.preventDefault(); const node=window.getSelection().anchorNode; const li=(node?.nodeType===1?node:node?.parentElement)?.closest('ul[data-checklist] > li'); if(li){li.dataset.checked=li.dataset.checked==='true'?'false':'true';changed();} }
  });
  function download(type) {
    const html = sanitizeNoteHtml(surface.innerHTML), name = (title.value.trim() || 'Untitled note').replace(/[\\/:*?"<>|]/g,'-');
    const text = type === 'txt' ? (title.value + '\n\n' + (surface.innerText || surface.textContent)) : `<!doctype html><html lang="en"><meta charset="utf-8"><title>${escape(title.value)}</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&amp;family=JetBrains+Mono:wght@400;700&amp;family=Lato:wght@400;700&amp;family=Libre+Baskerville:wght@400;700&amp;family=Lora:wght@400;700&amp;family=Merriweather:wght@400;700&amp;family=Montserrat:wght@400;700&amp;family=Nunito:wght@400;700&amp;family=Open+Sans:wght@400;700&amp;family=Playfair+Display:wght@400;700&amp;family=Poppins:wght@400;700&amp;family=Roboto:wght@400;700&amp;display=swap"><style>body{max-width:760px;margin:48px auto;padding:24px;font:16px/1.7 Georgia,serif;color:#222}img{max-width:100%}table{border-collapse:collapse;width:100%}td,th{border:1px solid #aaa;padding:8px}blockquote{border-left:3px solid #bbb;padding-left:20px}.note-page-break{break-before:page}ul[data-checklist]{list-style:'☐  '}li[data-checked=true]{list-style:'☑  '}</style><h1>${escape(title.value || 'Untitled note')}</h1>${html}</html>`;
    const url = URL.createObjectURL(new Blob([text],{type:type==='txt'?'text/plain;charset=utf-8':'text/html;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download=name+'.'+type;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
  }
  root.querySelector('#notes-export').addEventListener('change', event => { const value=event.target.value;event.target.value='';if(value)download(value); });
  bind('editor-print-btn', () => window.print());
  bind('editor-download-btn', () => { status('Choose “Save as PDF” in the print dialog.'); window.print(); });
  root.querySelector('#notes-ai').addEventListener('change', async event => {
    const task=event.target.value;event.target.value='';if(!task)return;
    capture();const saved=selection?.cloneRange(),id=getNoteId(),before=surface.innerHTML;
    const text=(saved?.toString() || surface.innerText || surface.textContent).trim();if(!text)return;
    status('Working on your writing…');event.target.disabled=true;
    try { const result=await ai(task,text); if(id!==getNoteId() || surface.innerHTML!==before){status('The note changed while AI was working. Run the action again to keep your edits safe.');return;} selection=saved;
      if(task==='continue'){restore();window.getSelection().collapseToEnd();capture();command('insertText',' '+result);}
      else { if(!saved || saved.collapsed){selection=document.createRange();selection.selectNodeContents(surface);} if(task==='format')insert(result);else command('insertText',result); }
      status('Updated. Use Undo to revert.');
    } catch(error){status(error.message || 'Writing assistance is unavailable.');} finally{event.target.disabled=false;}
  });
  return { reset() { selection=null; status(''); findPanel.hidden=true; matches=[]; refresh(); }, refresh, busy:()=>busyImages, close:()=>{dialog.close();selection=null;root.classList.remove('notes-focus');}, status };
}
