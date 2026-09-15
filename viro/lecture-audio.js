export function wavHeader(bytes, rate) {
  const h = new ArrayBuffer(44), v = new DataView(h);
  const text = (at, s) => [...s].forEach((c, i) => v.setUint8(at + i, c.charCodeAt(0)));
  text(0, 'RIFF'); v.setUint32(4, 36 + bytes, true); text(8, 'WAVE'); text(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true); text(36, 'data'); v.setUint32(40, bytes, true);
  return h;
}
export function wav(pcm, rate) { return new Blob([wavHeader(pcm.byteLength, rate), pcm], { type: 'audio/wav' }); }
export function joinWav(blobs, rate) {
  const parts = blobs.map(b => b.slice(44));
  return new Blob([wavHeader(parts.reduce((n, b) => n + b.size, 0), rate), ...parts], { type: 'audio/wav' });
}
export function clock(seconds) {
  const n = Math.floor(seconds || 0);
  return `${Math.floor(n / 60).toString().padStart(2, '0')}:${(n % 60).toString().padStart(2, '0')}`;
}
