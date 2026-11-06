// Photos are private Firestore Bytes, shared with the native VIRO contact record.
// Only raster JPEG/PNG data is accepted; never interpolate arbitrary URLs or SVG.
export function contactPhotoURL(value) {
  try {
    const bytes = value?.toUint8Array?.() ?? (value instanceof Uint8Array ? value : null);
    if (!bytes || !bytes.length || bytes.length > 250_000) return '';
    const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const png = [137,80,78,71,13,10,26,10].every((v, i) => bytes[i] === v);
    if (!jpeg && !png) return '';
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return `data:image/${jpeg ? 'jpeg' : 'png'};base64,${btoa(binary)}`;
  } catch { return ''; }
}

export function mountContactPhotos(list, contacts) {
  const records = new Map(contacts.map(contact => [contact.id, contact]));
  list.querySelectorAll('[data-contact-photo]').forEach(avatar => {
    const url = contactPhotoURL(records.get(avatar.dataset.contactPhoto)?.thumbnail);
    if (!url) return;
    const image = document.createElement('img');
    image.alt = ''; // The adjacent contact name already identifies the person.
    image.loading = 'lazy';
    image.decoding = 'async';
    image.addEventListener('error', () => image.remove(), { once: true });
    image.src = url;
    avatar.append(image); // Keep initials underneath as the loading/error fallback.
  });
}
