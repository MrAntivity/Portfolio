# Lecture Studio setup and verification

The feature lives in Portal → Notes. It does not change existing notes, folders, or editor content. Lectures have their own library within Notes.

## Deploy

1. Use Node 20, install Firebase CLI, and sign in to the existing `aidenyue` project:
   ```sh
   npm install -g firebase-tools
   firebase login
   npm --prefix functions install
   ```
2. The existing `OPENAI_API_KEY` Firebase secret is reused. If it does not exist, set it with `firebase functions:secrets:set OPENAI_API_KEY --project aidenyue`. Enter the key only into the CLI prompt. Firebase Functions requires the project's billing plan and OpenAI API billing; ChatGPT subscription usage is separate.
3. Deploy only the new callable:
   ```sh
   firebase deploy --only functions:transcribeLecture --project aidenyue
   ```
4. Verify the existing Firestore and Storage rules permit the owner to read/write `users/{uid}/lectures/{lectureId}` and upload/read `users/{uid}/lectures/{lectureId}/{index}.wav`, and permit the owner to read `users/{uid}/lectures/{lectureId}/sections/{sectionId}`. Deny other users. Audio writes should require `audio/wav` and size <= 4,000,044 bytes. Section writes and lecture fields `processedCount`, `processedSeconds`, `leaseUntil`, and `leaseToken` should be server-only. The client writes only title, className, createdAt, count, seconds, rate, finished, uploadedCount. Do not replace existing rules wholesale: the repository does not contain the deployed rules, and existing vault, files, notes, and calendar paths must retain their current protections. Overlapping broad allow rules must also be narrowed for server-only fields to be protected.
5. Full audio playback on another device uses authenticated Storage `getBlob`, which needs bucket CORS. Preserve any existing CORS entries and add GET for the portfolio origins. Example entry:
   ```json
   [{"origin":["https://aidenyue.com","https://www.aidenyue.com","https://mrantivity.github.io"],"method":["GET"],"responseHeader":["Content-Type"],"maxAgeSeconds":3600}]
   ```
   Google Cloud Console/CLI can apply the bucket configuration. Local playback uses IndexedDB and does not need a cloud download.
6. Merge the feature branch to `main` for GitHub Pages. Deploy the function and check access rules before making the frontend live.

## Use

- Enter a lecture title and class, then Record lecture. Grant microphone permission.
- Audio saves locally every ten seconds and syncs to the existing Firebase bucket.
- Start transcribing flushes the current partial segment and processes everything saved so far, without stopping capture. Following audio is processed in batches of up to twelve ten-second segments.
- Finish lecture flushes the last samples, stops the microphone, and processes the remaining audio. Notes and transcripts appear in chronological, timestamped sections. Each section includes detailed study notes and review questions where applicable.
- Load audio enables playback and clickable timestamps. Download WAV joins all saved segments into a single valid WAV. Export notes downloads the notes and transcript as Markdown.
- Keep the tab open until audio sync and AI processing finish. If the connection fails, use Sync & transcribe or reconnect. If the tab crashes, reopen on the same browser/device to recover saved segments. The unsaved last ten seconds may be lost on a crash. Interrupted recordings remain reviewable and can be transcribed; start a new recording to continue the lecture.
- Browser microphone capture cannot survive OS sleep, tab termination, or revoked permissions. Screen wake lock is requested where available; keep the device awake. The feature records microphone audio, not system/tab audio.
- Local copies remain in this browser's IndexedDB. Clearing site data removes them. Cloud copies remain in Firebase. There is no automatic retention deletion or in-app delete control in this version.

## Reliability and storage

AudioWorklet handles capture independently from network and AI requests. Ten-second PCM WAV objects remain independently decodable (unlike arbitrary MediaRecorder WebM fragments). At the requested 16 kHz mono PCM rate, a 75-minute lecture uses about 144 MB; browser-selected higher sample rates consume more. Uploading reads one segment at a time. Download creates a full-lecture Blob only on demand.

The callable accepts at most twelve segments and enforces size, format, authentication, owner path, sequential processing, and a transaction lease. Completed results are cached. If note generation fails, its successful transcript is retained and reused with its original exact audio range. AI text is rendered as escaped plain text.

## Validation

Run `node --test tests/lectures.test.cjs` from the repository root. Tests cover all samples of a simulated 75-minute lecture, segment bounds, WAV joining, authentication/range checks, idempotency, partial-range retries, failure recovery, and concurrent processing leases.

Before real classroom use, test a short live microphone recording against the deployed project, use Start transcribing and Finish while AI is busy, reload, download and play the full WAV, and open it on another device. Also verify permission denial, offline/reconnect behavior, and browser suspension on the actual recording device. Automated capture duration testing does not establish real-device 75-minute stability or live AI quality.

## Design references

- https://otter.ai/ — saved recordings, searchable transcripts, reviewable notes.
- https://www.notion.com/help/ai-meeting-notes — notes alongside transcripts and audio.
- https://developers.openai.com/api/docs/guides/speech-to-text — bounded file transcription and upload size limits.
- https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletProcessor — capture on the audio rendering thread.
