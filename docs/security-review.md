# Portal security review — November 5, 2026

Scope: source review and local adversarial tests. No production brute forcing, private-data extraction, deletion, or load testing was performed. This is not a guarantee of complete security. Deployed Firebase configuration and credentials were not available to inspect.

## Changes

- Removed persistent vault decryption keys from localStorage and delete keys saved by old clients on their next visit. AES keys are non-extractable and derived only after fresh vault verification. Leaving Vault clears decrypted fields and keys. Existing ciphertext and the login PIN are unchanged.
- Removed account auto-registration from the public portal login form. Existing Firebase sign-in continues to work.
- Isolated PDF preview frames with a sandbox and restricted file preview/download link protocols. Downloads remain available if a browser declines to render a sandboxed PDF.
- Added an allowlist sanitizer before displaying saved or AI-produced note HTML. Notes remain hidden; no stored notes were deleted.
- Escaped unknown vault record types before rendering.
- Restricted the `googleCalendar` Firestore collection: the browser can read only the token-free status document. All writes and the refresh-token document are backend-only. The previous generic owner rule also covered the token document.
- Updated compatible backend dependencies. npm audit initially reported one critical and four high findings; the updated lockfile reports zero critical/high and ten moderate findings (including transitive UUID and query-string libraries). These remaining findings are not a claim of proven exploitability in this application and need a separately validated dependency upgrade.

## Activation

The website changes activate through GitHub Pages. Firebase rules and dependency updates require deployment from an authenticated project-owner environment:

```bash
git pull origin main
npm --prefix functions ci
firebase deploy --only firestore:rules,functions --config firebase.trip.json --project aidenyue
```

Or publish the complete `trip/firestore.rules` file in Firebase Console → Firestore → Rules. Storage rules did not change in this review. Existing data is retained. Rules deployment was not performed in this session.

Refresh all open portal tabs after publication to remove the previously saved vault key on each browser. The separate vault-password setup requested earlier is not implemented by these changes; existing vault entries still use the login PIN for encryption. Do not reset the Firebase password without migrating that encryption.

## Validation and remaining controls

- Local regression tests exercise malicious rich text, protocol filtering, non-extractable compatible vault keys, clearing decrypted memory, PIN-protected sharing, automatic public sharing, expired sessions, revocation and folder boundaries.
- Firebase emulator tests verify guest isolation, immutable lecture server fields, photo ownership, and denial of browser reads/writes to calendar tokens.
- Short numeric login PINs remain vulnerable to guessing relative to strong passwords. Firebase's server-side protections are still required; a browser-only attempt counter would not protect the API. MFA/App Check, fixed owner-UID authorization, email/password provider settings, and production rate limits require access to the Firebase project to configure and verify.
- Public travel contributions intentionally allow anonymous users; application abuse quotas and uploaded-storage limits remain deployment-level work.
- Previously downloaded copies cannot be revoked, even when share links are revoked.
