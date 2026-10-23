# Media editor in Portal → Files

Open **Media editor**, or open an MP4/MP3/FLAC/WAV file and choose **Edit audio / video**. Import from your Files, choose local files, or drag files into the dialog. Imported sources are never overwritten.

Use numeric in/out points or position the source player's playhead and choose **Set in**, **Set out**, or **Split**. Remove unwanted sections, duplicate clips, and move them earlier/later to splice your timeline. Undo/redo restores timeline changes. Speed, volume and audio fades are adjustable per clip. **Play timeline** previews the sequence; the native source player's controls can also play the whole source. Volume above 100% applies only to rendered output.

Choose a format and **Render edited clip**, then preview/download the result or **Save copy to Files**. Saving uses the folder where the editor was opened. Saving never replaces the original. Timeline edits are temporary: download/save before closing. Reloading or closing the tab discards the timeline.

## Formats and limits

- Import MP4, MP3, FLAC, WAV: 200 MB combined source files, 30 clips. Removing a clip does not unload its source because undo can restore it; reopen the editor to release all sources.
- Export at most 20 minutes. Longer source recordings can be imported and trimmed. Processing needs substantial RAM and may take longer than playback, particularly on mobile. Cancel terminates the worker and preserves the timeline for retry.
- Audio: 48 kHz stereo; MP3 192 kbps, FLAC or PCM WAV. Audio export requires an audio track in each clip. Audio files in different formats can be spliced together, as can the audio from MP4 files.
- Video: MP4 H.264, 720p at 30 fps, aspect ratio preserved with padding, AAC audio. Every timeline clip must contain video for MP4 export. Silent video clips receive a silent audio track when spliced with other video clips.
- Edits are re-encoded and source metadata is not copied to edited exports. Ordinary Files downloads still preserve original file bytes, names and embedded metadata.
- Playback depends on browser codec support; the processing engine can decode some codecs the native browser player cannot. Unsupported/damaged media reports an error without deleting originals.

## Deployment and dependencies

This is a static client feature: merge/deploy the website normally. **No new Firebase rules, secrets, or functions are required.** Existing Storage CORS must allow the website to fetch original Files for editing (as with original downloads).

The browser processes media locally with FFmpeg WebAssembly. Only **Save copy to Files** uploads the result to the existing private Firebase storage. `@ffmpeg/ffmpeg` 0.12.15 ESM wrapper is vendored in `viro/vendor/ffmpeg` under its MIT license. The single-thread `@ffmpeg/core` 0.12.10 ESM JS/WASM is fetched lazily from jsDelivr (~32 MB); it does not require cross-origin isolation headers on GitHub Pages. The tab needs network access to this CDN on first use. Cancel aborts the download or terminates the processing worker. Saving to Firebase must finish before closing.

Core licensing: `@ffmpeg/core` declares GPL-2.0-or-later; FFmpeg and codec dependencies have their own licenses. Sources/build instructions: https://github.com/ffmpegwasm/ffmpeg.wasm and https://github.com/ffmpegwasm/ffmpeg.wasm/tree/main/packages/core . Wrapper license is retained at `viro/vendor/ffmpeg/LICENSE`. No core binary is bundled in this repository.

## Validation

`npm --prefix tests test` includes model and DOM interaction regressions for trimming, splitting, reordering, undo, export/save, single-dialog lifecycle, and errors retaining edits.

The optional real WASM integration test generates audio/video fixtures, imports all four types through the production probe, renders all four outputs through the production engine/command builder, checks duration and tracks, and verifies scratch-file cleanup. It also joins silent and audible video. To reproduce with the exact pinned npm package:

```bash
mkdir -p /tmp/portfolio-media-core
cd /tmp/portfolio-media-core
npm pack @ffmpeg/core@0.12.10
tar -xzf ffmpeg-core-0.12.10.tgz
# Return to the repository, then:
FFMPEG_CORE_DIR=/tmp/portfolio-media-core/package npm --prefix tests run media:wasm
```

The real WASM test and DOM tests passed during implementation. A live browser visual check was attempted but the cloud browser could not reach the local development server (connection refused). Desktop/mobile appearance and the module-worker/CDN loading path still need a browser smoke test after deployment; the WASM integration test runs the pinned core directly in Node with a worker adapter.
