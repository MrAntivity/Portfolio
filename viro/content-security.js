// Only web links and locally generated media URLs are allowed in file previews.
export function safeResourceUrl(value) {
  try {
    const url = new URL(String(value));
    return ['https:', 'blob:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}

// Rebuild rich text from a small allowlist. Never insert saved/AI HTML directly.
export function sanitizeRichHtml(value, notes = false) {
  const parsed = new DOMParser().parseFromString(String(value || ''), 'text/html');
  const output = document.createElement('div');
  const allowed = new Set(['P','BR','DIV','SPAN','STRONG','B','EM','I','U','S','UL','OL','LI','H1','H2','H3','BLOCKQUOTE','PRE','CODE','A']);
  const blocked = new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','SVG','MATH','FORM','INPUT','BUTTON','META','LINK','BASE']);
  if (notes) ['H4','H5','H6','HR','TABLE','THEAD','TBODY','TFOOT','TR','TH','TD','IMG','SUB','SUP','STRIKE','FONT'].forEach(tag => allowed.add(tag));
  function copy(node, parent) {
    if (node.nodeType === 3) { parent.append(document.createTextNode(node.textContent)); return; }
    if (node.nodeType !== 1 || blocked.has(node.tagName)) return;
    let target = parent;
    if (allowed.has(node.tagName)) {
      target = document.createElement(node.tagName === 'FONT' ? 'span' : node.tagName.toLowerCase());
      if (notes) {
        if (node.tagName === 'IMG') {
          const src = safeResourceUrl(node.getAttribute('src'));
          // Persist only HTTPS images, never data URLs, local paths, or blob URLs.
          if (!src.startsWith('https:')) return;
          target.src = src;
          target.alt = (node.getAttribute('alt') || '').slice(0,500);
          target.loading = 'lazy';
          target.referrerPolicy = 'no-referrer';
        }
        const styles = node.style;
        const color = value => /^(#[\da-f]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%deg]+\)|[a-z]+)$/i.test(value) && !/^(inherit|initial|unset)$/i.test(value);
        for (const key of ['color','backgroundColor']) if (color(styles[key])) target.style[key] = styles[key];
        if (node.tagName === 'FONT' && color(node.getAttribute('color') || '')) target.style.color = node.getAttribute('color');
        const font = styles.fontFamily || node.getAttribute('face') || '';
        if (/^[\w\s,'"-]{1,150}$/.test(font)) target.style.fontFamily = font;
        const size = styles.fontSize;
        if (/^\d+(\.\d+)?(px|pt|em|rem|%)$/.test(size) && parseFloat(size) <= 200) target.style.fontSize = size;
        if (node.tagName === 'FONT' && !size) {
          const sizes = [10,13,16,18,24,32,48];
          const index = Number(node.getAttribute('size')) - 1;
          if (sizes[index]) target.style.fontSize = sizes[index] + 'px';
        }
        if (/^(left|center|right|justify)$/.test(styles.textAlign || node.getAttribute('align'))) target.style.textAlign = styles.textAlign || node.getAttribute('align');
        if (/^(normal|bold|[1-9]00)$/.test(styles.fontWeight)) target.style.fontWeight = styles.fontWeight;
        if (/^(normal|italic)$/.test(styles.fontStyle)) target.style.fontStyle = styles.fontStyle;
        if (/^(none|underline|line-through|underline line-through)$/.test(styles.textDecorationLine)) target.style.textDecorationLine = styles.textDecorationLine;
        if (/^(1|1.15|1.5|1.8|2)$/.test(styles.lineHeight)) target.style.lineHeight = styles.lineHeight;
        for (const key of ['marginLeft','paddingLeft']) if (/^\d{1,3}(px|pt)$/.test(styles[key]) && parseFloat(styles[key]) <= 240) target.style[key] = styles[key];
        for (const attr of ['colspan','rowspan']) if (/^(TD|TH)$/.test(node.tagName) && /^[1-9]\d?$/.test(node.getAttribute(attr))) target.setAttribute(attr,node.getAttribute(attr));
        if (node.tagName === 'OL' && /^\d{1,5}$/.test(node.getAttribute('start'))) target.setAttribute('start',node.getAttribute('start'));
        if (node.tagName === 'UL' && node.dataset.checklist === 'true') target.dataset.checklist = 'true';
        if (node.tagName === 'LI' && node.dataset.checked === 'true') target.dataset.checked = 'true';
        if (node.classList.contains('note-comment')) { target.className = 'note-comment'; target.dataset.comment = (node.dataset.comment || '').slice(0,2000); target.title = target.dataset.comment; }
        if (node.classList.contains('note-page-break')) target.className = 'note-page-break';
      }
      if (node.tagName === 'A') {
        const href = safeResourceUrl(node.getAttribute('href'));
        if (href.startsWith('https:')) { target.setAttribute('href', href); target.setAttribute('target','_blank'); target.setAttribute('rel','noopener noreferrer'); }
      }
      parent.append(target);
    }
    for (const child of node.childNodes) copy(child, target);
  }
  for (const child of parsed.body.childNodes) copy(child, output);
  return output.innerHTML;
}

export const sanitizeNoteHtml = value => sanitizeRichHtml(value, true);
