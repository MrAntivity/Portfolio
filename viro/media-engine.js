import { FFmpeg } from './vendor/ffmpeg/index.js';
import { validateClips, segmentArgs, concatArgs, mediaExtension } from './media-model.js';
// Single-thread core works on GitHub Pages without cross-origin isolation headers.
const CORE = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/';
export class MediaEngine {
  constructor(status) { this.status = status; this.ffmpeg = null; this.urls = []; this.controller = null; }
  async load() {
    if (this.ffmpeg?.loaded) return this.ffmpeg;
    this.status('Loading the editing engine (about 32 MB on first use)…');
    this.controller = new AbortController();
    const ff = new FFmpeg(); this.ffmpeg = ff;
    const blobURL = async (file, type) => {
      const response = await fetch(CORE + file, { signal: this.controller.signal });
      if (!response.ok) throw Error('Could not load the editing engine. Check your connection and retry.');
      const url = URL.createObjectURL(new Blob([await response.arrayBuffer()], { type })); this.urls.push(url); return url;
    };
    try {
      // ESM core is required by the module worker.
      const coreURL = await blobURL('ffmpeg-core.js', 'text/javascript');
      const wasmURL = await blobURL('ffmpeg-core.wasm', 'application/wasm');
      await ff.load({ coreURL, wasmURL }); return ff;
    } catch (error) { this.cancel(); throw error; }
  }
  cancel() {
    this.controller?.abort(); this.ffmpeg?.terminate(); this.ffmpeg = null;
    this.urls.forEach(url => URL.revokeObjectURL(url)); this.urls = [];
  }
  async probe(file) {
    const ff = await this.load(), path = 'probe.' + mediaExtension(file.name);
    try {
      await ff.writeFile(path, new Uint8Array(await file.arrayBuffer()));
      const code = await ff.ffprobe(['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,duration', '-of', 'json', path, '-o', 'probe.json']);
      // This core leaves ret at -1 after a successful ffprobe; validate its JSON too.
      if (code > 0) throw Error('This media file could not be read. It may use an unsupported codec or be damaged.');
      const data = JSON.parse(await ff.readFile('probe.json', 'utf8'));
      const duration = Number(data.format?.duration) || Math.max(0, ...(data.streams || []).map(s => Number(s.duration) || 0));
      if (!Number.isFinite(duration) || duration <= 0) throw Error('The file has no usable duration.');
      return { duration, hasAudio: data.streams?.some(s => s.codec_type === 'audio'), hasVideo: data.streams?.some(s => s.codec_type === 'video') };
    } finally { await ff.deleteFile(path).catch(() => {}); await ff.deleteFile('probe.json').catch(() => {}); }
  }
  async render(clips, sources, format) {
    validateClips(clips, sources, format);
    const ff = await this.load(), paths = [], inputNames = new Map();
    const output = 'edited.' + format;
    let stage = '';
    const progress = ({ progress }) => this.status(`${stage} ${Math.round(Math.max(0, Math.min(1, progress || 0)) * 100)}%`);
    ff.on('progress', progress);
    try {
      for (const source of sources.filter(s => clips.some(c => c.sourceId === s.id))) {
        const path = `source-${inputNames.size}.${mediaExtension(source.file.name)}`; inputNames.set(source.id, path); paths.push(path);
        await ff.writeFile(path, new Uint8Array(await source.file.arrayBuffer()));
      }
      const segments = [];
      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i], source = sources.find(s => s.id === clip.sourceId), path = `segment-${i}.${format === 'mp4' ? 'mkv' : 'wav'}`;
        segments.push(path); paths.push(path); stage = `Rendering clip ${i + 1} of ${clips.length}…`; this.status(stage);
        if (await ff.exec(segmentArgs(clip, source, inputNames.get(source.id), path, format === 'mp4')) !== 0) throw Error(`Clip ${i + 1} could not be rendered. Try a shorter clip or a smaller file.`);
      }
      paths.push('segments.txt', output);
      await ff.writeFile('segments.txt', new TextEncoder().encode(segments.map(s => `file '${s}'`).join('\n')));
      stage = 'Joining clips and exporting…'; this.status(stage);
      if (await ff.exec(concatArgs(format, 'segments.txt', output)) !== 0) throw Error('The export failed. Try fewer clips or another output format.');
      const bytes = await ff.readFile(output);
      return bytes;
    } finally { ff.off('progress', progress); for (const path of paths) await ff.deleteFile(path).catch(() => {}); }
  }
}
