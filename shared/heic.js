// HEIC decoding runs locally; only the decoder code is fetched from the CDN.
// Pinned heic-to (LGPL-3.0): https://github.com/hoppergee/heic-to
export function isHeicPhoto(file) {
  return /^image\/(heic|heif)(-sequence)?$/i.test(file.type || '')
    || /\.(heic|heif)$/i.test(file.name || '');
}
let decoder;
async function loadDecoder() {
  if (!decoder) decoder = import('https://cdn.jsdelivr.net/npm/heic-to@1.5.2/dist/heic-to.js')
    .catch(() => { decoder = null; throw new Error('Could not load the HEIC converter. Check your connection and retry.'); });
  return decoder;
}
export async function convertHeicPhoto(file) {
  if (!isHeicPhoto(file)) return file;
  if (!file.size || file.size > 20 * 1024 * 1024) throw new Error('HEIC photos must be under 20 MB each.');
  const { heicTo } = await loadDecoder();
  let blob;
  try { blob = await heicTo({ blob: file, type: 'image/jpeg', quality: 0.9 }); }
  catch { throw new Error(`${file.name || 'This HEIC photo'} could not be converted. Try exporting it as JPEG from Photos.`); }
  if (!blob?.size || blob.type !== 'image/jpeg') throw new Error('HEIC conversion did not produce a valid photo. Please retry.');
  const name = (file.name || 'photo').replace(/\.[^/.]+$/, '') + '.jpg';
  return new File([blob], name, { type: 'image/jpeg', lastModified: file.lastModified || Date.now() });
}
