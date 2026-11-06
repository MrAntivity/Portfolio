// Only web links and locally generated media URLs are allowed in file previews.
export function safeResourceUrl(value) {
  try {
    const url = new URL(String(value));
    return ['https:', 'blob:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}

// Rebuild rich text from a small allowlist. Never insert saved/AI HTML directly.
export function sanitizeRichHtml(value) {
  const parsed = new DOMParser().parseFromString(String(value || ''), 'text/html');
  const output = document.createElement('div');
  const allowed = new Set(['P','BR','DIV','SPAN','STRONG','B','EM','I','U','S','UL','OL','LI','H1','H2','H3','BLOCKQUOTE','PRE','CODE','A']);
  const blocked = new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','SVG','MATH','FORM','INPUT','BUTTON','META','LINK','BASE']);
  function copy(node, parent) {
    if (node.nodeType === 3) { parent.append(document.createTextNode(node.textContent)); return; }
    if (node.nodeType !== 1 || blocked.has(node.tagName)) return;
    let target = parent;
    if (allowed.has(node.tagName)) {
      target = document.createElement(node.tagName.toLowerCase());
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
