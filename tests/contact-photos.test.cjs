const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('viro/contact-photos.js', 'utf8').replaceAll('export function', 'function');
const context = vm.createContext({ Uint8Array, btoa, document: { createElement() { return { addEventListener(type, fn) { this[type] = fn; }, remove() { this.removed = true; } }; } } });
vm.runInContext(source, context);
test('Firestore JPEG and legacy PNG bytes produce bounded raster data URLs', () => {
 const jpeg = Uint8Array.from([255,216,255,224]);
 assert.equal(context.contactPhotoURL({toUint8Array: () => jpeg}), 'data:image/jpeg;base64,/9j/4A==');
 assert.match(context.contactPhotoURL(Uint8Array.from([137,80,78,71,13,10,26,10])), /^data:image\/png;base64,/);
});
test('missing, removed, corrupt, oversized and executable photo data fall back', () => {
 for (const value of [null, undefined, 'javascript:alert(1)', {toUint8Array: () => {throw Error();}}, new Uint8Array(250001), Uint8Array.from(Buffer.from('<svg onload="x()"/>'))]) assert.equal(context.contactPhotoURL(value), '');
});
test('mounted photos retain initials and remove broken images', () => {
 let image;
 const avatar = {dataset: {contactPhoto: 'one'}, append(value) {image = value;}};
 context.mountContactPhotos({querySelectorAll: () => [avatar]}, [{id: 'one', thumbnail: Uint8Array.from([255,216,255,224])}]);
 assert.equal(image.alt, ''); assert.equal(image.loading, 'lazy');
 image.error(); assert.equal(image.removed, true);
});
