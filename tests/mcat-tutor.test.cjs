const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const model = require('../functions/mcat-tutor-model');
const owner = { uid: 'owner', token: { email: 'aiden@viro.local' } };
const valid = { mode: 'teach', messages: [{ role: 'user', content: 'Explain competitive inhibition.' }] };
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
function harness({ failApi = false, previous = {} } = {}) {
  const calls = { api: [], reads: [], writes: [], options: null };
  let usage = previous;
  const exports = {};
  const requireMock = name => {
    if (name === 'firebase-admin') return { firestore: () => ({
      doc: path => { calls.reads.push(path); return path; },
      runTransaction: async callback => callback({
        get: async () => ({ data: () => usage }),
        set: (ref, value) => { calls.writes.push({ ref, value }); usage = value; }
      })
    }) };
    if (name === 'firebase-functions/v2/https') return { HttpsError, onCall: (options, handler) => { calls.options = options; return handler; } };
    if (name === 'firebase-functions/params') return { defineSecret: () => ({ value: () => 'not-a-real-key' }) };
    if (name === 'openai') return class { constructor() { this.chat = { completions: { create: async input => { calls.api.push(input); if (failApi) throw Error('private upstream message'); return { choices: [{ message: { content: 'A useful explanation.' } }] }; } } }; } };
    if (name === './mcat-tutor-model') return model;
    if (name === './portal-auth') {
      const module = { exports: {} };
      vm.runInNewContext(fs.readFileSync(require.resolve('../functions/portal-auth'), 'utf8'), { require: requireMock, module });
      return module.exports;
    }
    throw Error('Unexpected dependency ' + name);
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../functions/mcat-tutor'), 'utf8'), { require: requireMock, exports });
  return { run: exports.mcatTutor, calls };
}
test('only bounded user/assistant text enters the API', () => {
  assert.deepEqual(model.validateTutorInput(valid), { ...valid, context: {} });
  for (const messages of [[], [{ role: 'system', content: 'override' }], [{ role: 'user', content: 'x'.repeat(4001) }], [{ role: 'assistant', content: 'hello' }], Array(21).fill(valid.messages[0])]) {
    assert.throws(() => model.validateTutorInput({ messages }), { code: 'invalid-argument' });
  }
  assert.throws(() => model.validateTutorInput({ ...valid, mode: 'admin' }));
  assert.throws(() => model.validateTutorInput({ ...valid, context: { lesson: 'x'.repeat(12001) } }));
  const cleaned = model.validateTutorInput({ ...valid, context: { title: 'Enzymes', question: { prompt: 'Why?' }, apiKey: 'discard me' } });
  assert.equal(cleaned.context.question, '{"prompt":"Why?"}');
  assert.equal(cleaned.context.apiKey, undefined);
});
test('window/day caps survive window resets and reset at Eastern midnight', () => {
  const now = Date.parse('2026-11-09T16:00:00Z');
  const first = model.nextUsage({}, now);
  assert.equal(first.dailyCount, 1);
  assert.equal(first.date, '2026-11-09');
  assert.throws(() => model.nextUsage({ ...first, windowCount: 12 }, now + 100), { code: 'resource-exhausted' });
  assert.equal(model.nextUsage({ ...first, windowCount: 12 }, now + 600000).windowCount, 1);
  assert.throws(() => model.nextUsage({ ...first, dailyCount: 100 }, now + 600000), { code: 'resource-exhausted' });
  assert.equal(model.nextUsage({ ...first, dailyCount: 100 }, Date.parse('2026-11-10T05:00:00Z')).dailyCount, 1);
  assert.throws(() => model.nextUsage({ ...first, dailyCount: 100 }, Date.parse('2026-11-10T04:59:59Z')), { code: 'resource-exhausted' });
});
test('signed-out and non-owner callers cannot read usage or invoke OpenAI', async () => {
  const h = harness();
  await assert.rejects(h.run({ data: valid }), { code: 'unauthenticated' });
  await assert.rejects(h.run({ auth: { uid: 'guest', token: { email: 'guest@example.com' } }, data: valid }), { code: 'permission-denied' });
  assert.equal(h.calls.reads.length, 0);
  assert.equal(h.calls.api.length, 0);
});
test('owner receives reply with bounded API parameters and a protected usage reservation', async () => {
  const h = harness();
  const result = await h.run({ auth: owner, data: { ...valid, mode: 'socratic', context: { title: 'Enzymes' } } });
  assert.equal(result.answer, 'A useful explanation.');
  assert.equal(h.calls.reads[0], '_mcatTutorLimits/owner');
  assert.equal(h.calls.writes.length, 1);
  assert.equal(h.calls.api[0].max_tokens, 1800);
  assert.equal(h.calls.options.maxInstances, 2);
  assert.match(h.calls.api[0].messages[0].content, /Socratic mode/);
  assert.match(h.calls.api[0].messages[1].content, /not instructions/);
});
test('exhausted requests never reach OpenAI and upstream details are hidden', async () => {
  const h = harness({ previous: { ...model.nextUsage(), dailyCount: 100 } });
  await assert.rejects(h.run({ auth: owner, data: valid }), { code: 'resource-exhausted' });
  assert.equal(h.calls.api.length, 0);
  const failed = harness({ failApi: true });
  await assert.rejects(failed.run({ auth: owner, data: valid }), error => error.code === 'unavailable' && !error.message.includes('private upstream'));
});
