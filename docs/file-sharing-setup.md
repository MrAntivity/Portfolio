# File and folder sharing

Files now have Share buttons, folder cards have Share buttons, and the Files toolbar has Shared links. Create multiple independent links to either type of item. Each link optionally uses a 4–12 digit PIN. The owner can change/remove a PIN, revoke one link, or revoke all links. A revoked link cannot be reactivated; create a new link instead.

Recipients open `/share/#<random token>` without signing in. Folder links include descendants and reflect subsequent additions, moves and deletions. Sharing is read-only. The public page offers downloads; it does not expose the private portal or Firebase download URLs.

## Activate

Merge this PR after deploying its two new functions. From Google Cloud Shell in this checkout, signed into the account that owns `aidenyue`:

```sh
git fetch origin
git switch feature/private-file-sharing
git pull --ff-only
npm --prefix functions install
firebase deploy --only functions:manageFileShares,functions:fileShareAccess --project aidenyue
```

For a fresh checkout:

```sh
git clone --branch feature/private-file-sharing https://github.com/MrAntivity/Portfolio.git portfolio-sharing
cd portfolio-sharing
npm --prefix functions install
firebase login --no-localhost
firebase deploy --only functions:manageFileShares,functions:fileShareAccess --project aidenyue
```

No new API key, secret, anonymous authentication, Storage rule, or public Firestore rule is needed. Keep the existing default-deny rules for all paths outside those already allowed. `_fileShares`, `_fileShareOwners`, and `_fileShareAttempts` are backend-only top-level collections. Never add client/public access to them. These are separate from `users/{uid}` and public trips. PINs are salted scrypt hashes. The deployment uses existing Firebase Admin access to the Firestore database and `aidenyue.firebasestorage.app` bucket.

Optionally enable Firestore TTL on `_fileShareAttempts.expiresAt` for automatic cleanup of throttle records. This is housekeeping, not required for rate-limit correctness. Unlock attempts are limited to 30 per 15 minutes per IP; people on the same network share that limit. The table stores a SHA-256 of the IP, not its raw text.

## Revocation behavior

Every list and download request verifies the current share state and the owner's revoke-all generation. Changing/removing a PIN rotates the session key, invalidating earlier sessions. Sessions expire after one hour. Downloads stream through the function with no-store headers; the endpoint never returns persistent Firebase or signed storage URLs. Only paths in the owner's Files storage namespace are downloadable. File IDs are checked against the current file/folder scope on each request.

Revocation blocks new requests. Already downloaded copies and streams already in progress cannot be recalled. Direct Firebase URLs copied earlier from the private portal are independent of this sharing system and are not revoked by these controls. The recipient page buffers a download as a browser Blob before saving; very large files depend on available device memory. Folder sharing supports libraries of up to 2,000 folders and 2,000 file records; individual-file sharing does not scan the library. The manager supports up to 500 share records per owner. Function egress and Firestore requests use the existing project's billing.

## Verification

`node --test tests/file-sharing.test.cjs` exercises the function handlers with an in-memory Firestore/Storage harness: correct/wrong PINs, PIN rotation, individual/global revocation, session expiry, public links, folder membership changes, private path rejection, absence of download tokens, owner checks and throttling. `node --experimental-vm-modules --test tests/file-sharing-ui.test.cjs` tests owner controls and recipient flows with mocked API responses. Syntax and function exports are checked separately. These do not replace production Firebase or real-browser verification.

After deploying, create a sample file link and folder link, open in a second browser, test a wrong and correct PIN, change the PIN while that browser remains open, and verify its next download fails. Revoke one link and then all links; verify the other browser cannot fetch more files. Confirm moving a file out of a shared folder removes access. Production configuration and real downloads cannot be verified without Firebase access.


## Original file downloads

New Files uploads store the source File bytes unchanged, including HEIC/HEIF. A separately stored JPEG is used only for HEIC previews. Private and shared downloads use the original storage path and original filename, not the editable card title or preview. Embedded metadata (EXIF, document properties, etc.) remains inside the unchanged file. The source last-modified timestamp is recorded in Storage custom metadata and the file's Firestore page metadata; normal browser downloads cannot reliably restore filesystem creation/modification times, permissions or Finder tags. Existing HEIC uploads previously saved only as JPEG cannot be reconstructed; re-upload the original. Trip galleries and note-image insertion still use their existing optimized-image behavior.

Private downloads use a Blob to preserve filenames on cross-origin Storage URLs. The existing bucket CORS configuration must allow GET from the portfolio domain (as already documented for lecture playback). No backend or access-rule changes are required for this update.
