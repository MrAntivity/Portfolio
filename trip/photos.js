import { convertHeicPhoto } from '../shared/heic.js';
import { MAX_UPLOAD_BYTES } from './model.js';
// Resize before upload and strip original EXIF/location metadata through canvas export.
export async function preparePhoto(file) {
  file = await convertHeicPhoto(file);
  let bitmap, url;
  try {
    if ('createImageBitmap' in window) bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    else {
      url = URL.createObjectURL(file); bitmap = new Image(); bitmap.src = url; await bitmap.decode();
    }
    const width = bitmap.width || bitmap.naturalWidth, height = bitmap.height || bitmap.naturalHeight;
    if (!width || !height || width * height > 80000000) throw new Error('This photo is too large to process. Choose an image under 80 megapixels.');
    const scale = Math.min(1, 2400 / Math.max(width, height));
    const canvas = document.createElement('canvas'); canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
    const context = canvas.getContext('2d'); if (!context) throw new Error('Photo processing is unavailable in this browser.');
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .88));
    if (!blob || blob.size > MAX_UPLOAD_BYTES) throw new Error('Could not prepare this photo. Try a smaller image.');
    return { blob, width: canvas.width, height: canvas.height };
  } catch (err) {
    if (err.name === 'InvalidStateError' || err.name === 'EncodingError') throw new Error(`${file.name} could not be decoded. Export it as a JPEG and retry.`);
    throw err;
  } finally { bitmap?.close?.(); if (url) URL.revokeObjectURL(url); }
}
