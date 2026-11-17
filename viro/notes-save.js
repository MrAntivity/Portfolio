// One serialized writer per open note. Capture values before awaiting the network,
// retain newer edits, and never report an older revision as fully saved.
export function createNoteSaver({ write, stash = () => {}, clear = () => {}, status = () => {}, delay = 800 }) {
  let pending = null, timer = null, running = null, revision = 0, generation = 0, savedGeneration = 0, failure = null, disposed = false;
  function remember() { if (pending) { try { stash({ ...pending, revision }); } catch { status('Recovery storage is full. Keep this page open until saved.', 'error'); } } }
  function edit(value) {
    if (disposed) return;
    pending = { ...value }; generation++; failure = null; remember();
    status('Unsaved changes', 'pending'); clearTimeout(timer);
    timer = setTimeout(() => { flush().catch(() => {}); }, delay);
  }
  async function drain() {
    while (!disposed && pending && savedGeneration < generation) {
      const value = { ...pending }, version = generation;
      status('Saving…', 'saving');
      try {
        revision = await write(value, revision); failure = null;
        savedGeneration = version;
        if (savedGeneration === generation) { pending = null; try { clear(); } catch {} status('All changes saved', 'saved'); }
        else remember();
      } catch (error) {
        failure = error; remember();
        status(error.code === 'notes/conflict' ? 'Changed on another device. Save a copy to keep your edits.' : error.code === 'notes/too-large' ? error.message : 'Not synced. Your draft is kept on this device. Retry when connected.', 'error');
        throw error;
      }
    }
  }
  function flush() {
    clearTimeout(timer);
    if (!running) running = drain().finally(() => { running = null; });
    return running;
  }
  return { edit, flush, dirty: () => !!pending || !!running, error: () => failure,
    revision: () => revision,
    setRevision: value => { if (!pending && !running) revision = Number(value) || 0; },
    dispose: () => { disposed = true; clearTimeout(timer); remember(); } };
}
