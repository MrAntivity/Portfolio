const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Module = require('node:module');

test('75 minutes of capture preserves every sample in bounded independent segments', () => {
  let Processor, samples = 0, chunks = 0, largest = 0, flushed = false;
  class Base { constructor() { this.port = { postMessage: data => { if (data.pcm) { samples += data.pcm.length; chunks++; largest = Math.max(largest, data.pcm.length); } if (data.flushed) flushed = true; } }; } }
  vm.runInNewContext(fs.readFileSync('viro/lecture-worklet.js', 'utf8'), { AudioWorkletProcessor: Base, sampleRate: 16000, registerProcessor: (_, p) => { Processor = p; }, Int16Array, Math });
  const p = new Processor(), input = new Float32Array(128).fill(.25);
  for (let i = 0; i < 16000 * 75 * 60 / 128; i++) p.process([[input]]);
  p.port.onmessage({ data: 'flush' });
  assert.equal(samples, 72000000); assert.equal(chunks, 450); assert.equal(largest, 160000); assert.ok(flushed);
});

test('WAV download joins audio data without repeated headers', async () => {
  const { wav, joinWav } = await import('../viro/lecture-audio.js');
  const result = joinWav([wav(new Int16Array([1, 2]), 16000), wav(new Int16Array([3]), 16000)], 16000);
  const b = Buffer.from(await result.arrayBuffer());
  assert.equal(b.length, 50); assert.equal(b.readUInt32LE(40), 6); assert.equal(b.readUInt32LE(24), 16000);
  assert.deepEqual([b.readInt16LE(44), b.readInt16LE(46), b.readInt16LE(48)], [1, 2, 3]);
});

function backend({ cached, lease = 0, failNotes = false } = {}) {
  const state = { uploadedCount: 12, processedCount: 0, leaseUntil: lease }, section = cached && { ...cached };
  let saved = section, calls = 0;
  const snap = data => ({ exists: Boolean(data), data: () => data });
  const sectionRef = { get: async () => snap(saved), set: async data => { saved = data; } };
  const lecture = { collection: () => ({ doc: () => sectionRef }) };
  const db = { doc: () => lecture, runTransaction: async fn => fn({ get: async ref => snap(ref === lecture ? state : saved), update: (_, data) => Object.assign(state, data), set: (_, data) => { saved = data; } }) };
  class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
  class OpenAI { constructor() { this.chat = { completions: { create: async () => { calls++; if (failNotes) throw new Error('offline'); return { choices: [{ message: { content: 'Study notes' }, finish_reason: 'stop' }] }; } } }; } }
  const mocks = { 'firebase-functions/v2/https': { onCall: (_, fn) => fn, HttpsError }, 'firebase-functions/params': { defineSecret: () => ({ value: () => 'test' }) }, 'firebase-admin': { firestore: () => db }, openai: OpenAI, 'openai/uploads': {} };
  const m = new Module('/tmp/lectures-test.cjs'); m.require = name => name === './portal-auth' ? require('../functions/portal-auth') : mocks[name] || require(name); m._compile(fs.readFileSync('functions/lectures.js', 'utf8'), 'lectures.js');
  return { fn: m.exports.transcribeLecture, state, get saved() { return saved; }, get calls() { return calls; } };
}
const request = { auth: { uid: 'owner', token: { email: 'aiden@viro.local' } }, data: { lectureId: 'lecture-1', start: 0, end: 12 } };
test('backend rejects unauthenticated and oversized requests', async () => {
  const b = backend(); await assert.rejects(b.fn({ data: request.data }), { code: 'unauthenticated' });
  await assert.rejects(b.fn({ ...request, data: { ...request.data, end: 13 } }), { code: 'invalid-argument' });
});
test('retry keeps the original partially transcribed range, never skips newer audio', async () => {
  const b = backend({ cached: { status: 'transcribed', start: 0, end: 3, duration: 30, transcript: 'lecture' } });
  await b.fn(request); assert.equal(b.state.processedCount, 3); assert.equal(b.saved.end, 3); assert.equal(b.state.processedSeconds, 30);
  await b.fn(request); assert.equal(b.calls, 1);
});
test('failed notes preserve transcript and release processing lease', async () => {
  const b = backend({ cached: { status: 'transcribed', start: 0, end: 3, duration: 30, transcript: 'lecture' }, failNotes: true });
  await assert.rejects(b.fn(request), { code: 'internal' }); assert.equal(b.saved.transcript, 'lecture'); assert.equal(b.state.processedCount, 0); assert.equal(b.state.leaseUntil, 0);
});
test('concurrent AI work is rejected while a valid lease exists', async () => {
  const b = backend({ lease: Date.now() + 60000 }); await assert.rejects(b.fn(request), { code: 'aborted' });
});
