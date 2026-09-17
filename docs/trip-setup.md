# Somewhere together — /trip

A standalone shared travel journal at `https://aidenyue.com/trip/`. GitHub Pages redirects `/trip` to `/trip/`; no new domain purchase or DNS change is needed. The main site's navigation is unchanged. A noindex/nofollow meta tag discourages search indexing, but this is a public page, not a password-protected archive.

## What is included

- Portfolio-matched dark/light editorial design and existing portfolio photographs in the header.
- World map with clickable pins; repeat visits at the same coordinates are grouped into one popup with each trip listed.
- Real trip/place/friend counts, search across stories and people, and year filtering.
- New trip form: title, contributor, place/address, exact map pin, start/end dates, attendees, story, excursions, and optional photos.
- Photon address search, map click/drag adjustment, and manual coordinate fallback. A failed geocoding service does not block entering a location manually.
- Collaborative galleries with photo credits/captions, full-screen viewing, keyboard navigation, cover selection by the trip creator, and deletion of the contributor's own photos.
- Guest contribution sessions that do not replace the private portal session. A guest can edit their own trip on the browser that created it. Clearing site data or changing browsers loses that guest identity; the portal owner can still maintain data in Firebase Console.
- Up to 20 photos per batch. JPEG/PNG/WebP/HEIC/HEIF originals up to 20 MB are resized to a maximum 2400-pixel edge and stored as JPEG, up to 8 MB. Originals are not separately archived. Canvas export strips original EXIF/location metadata. HEIC/HEIF photos are converted locally using the pinned heic-to 1.5.2 decoder, loaded on demand from jsDelivr. Only the converted JPEG is stored; Live Photo motion and original metadata are not retained. The same conversion supports portal Files and note image insertion.
- Progress and partial upload recovery. Successful photos remain saved; retry sends only the remaining selected files. Pending selections are in memory and do not survive a page reload.
- Real-time trip/gallery updates and shareable `#trip=...` links.

Production starts empty. No trips are inferred from Aiden's past conversations or photos. `?demo=1` uses clearly labeled sample stories and the existing portfolio photos. It never loads the Firebase data module or uploads anything remotely. Demo edits reset on reload.

## Activate Firebase first

The code reuses the existing `aidenyue` Firebase project and `aidenyue.firebasestorage.app` bucket.

1. Open Google Cloud Shell with the account that owns `aidenyue`, then get the branch:

   ```sh
   git clone --branch feature/travel-journal https://github.com/MrAntivity/Portfolio.git portfolio-trips
   cd portfolio-trips
   npm --prefix functions install
   firebase projects:list
   ```

   If authentication is requested, run `firebase login --no-localhost`.

2. **Before enabling guest authentication**, redeploy the private portal's paid AI functions with their new owner checks:

   ```sh
   firebase deploy --only functions:aiAssist,functions:transcribeLecture --project aidenyue
   ```

   These use the existing `OPENAI_API_KEY` secret. They now require the existing portal account email `aiden@viro.local`; anonymous contributors cannot call them. If your Google Calendar functions are already configured, deploy their matching owner checks too:

   ```sh
   firebase deploy --only functions:googleCalendarConnect,functions:googleCalendarToken,functions:googleCalendarDisconnect --project aidenyue
   ```

   The Calendar connect/token functions require the existing `GOOGLE_CLIENT_SECRET` secret. No new AI model or paid geocoding key is used by the trip page.

3. Publish the combined access rules:

   ```sh
   firebase deploy --config firebase.trip.json --only firestore:rules,storage --project aidenyue
   ```

   `trip/firestore.rules` and `trip/storage.rules` include the private portal/lecture rules provided in this conversation, plus the new shared journal. If you changed other rules since then, merge those changes before deploying. Private `users/{uid}` data remains restricted to the portal account; guest users cannot write a second private namespace.

   Storage rules check a corresponding Firestore photo reservation. If Firebase prompts to enable permissions connecting Storage Rules to Firestore, accept for this project. Public reads are allowed only for ready gallery photos. A guest can upload only to their own reserved path, with JPEG content type and the size limit. The upload cannot overwrite a completed photo. Existing portal/lecture files are not public.

4. In Firebase Console → Authentication → Sign-in method, enable **Anonymous**. Keep the existing Email/Password provider enabled. Guest authentication happens only when someone contributes, not when they browse.

5. Merge the PR to `main` to publish the frontend via GitHub Pages. Visit `https://aidenyue.com/trip/`. The page will not appear in the portfolio menu.

6. Add one real trip and one small photo. Open the link in a second browser, add a photo as a different guest, and verify both appear. Confirm that the second guest cannot edit the first guest's trip. Reopen your private portal and verify existing sign-in, notes, and lecture recording still work.

No new CORS change is required for displaying trip photos: the gallery uses Firebase download URLs in images, rather than reading image bytes with cross-origin `getBlob`. Keep the previously configured lecture CORS settings.

## Access and data model

- `trips/{tripId}`: publicly readable trip metadata; signed-in guests can create; only the creator or the portal owner can update.
- `trips/{tripId}/photos/{photoId}`: caption/credit, dimensions, canonical storage path, and pending/ready state.
- `tripPhotos/{tripId}/{guestUid}/{photoId}.jpg`: optimized image objects. A failed upload is cleaned up where possible; a lost connection during cleanup can leave a pending reservation/object for owner maintenance.
- Only the owner can delete a trip through Firestore rules. There is no trip-delete UI because removing a document alone would leave photo subcollections/objects behind. For maintenance, delete trip photos and their metadata before the trip document.
- There is no moderation queue or invitation list: anyone who has the link can contribute as requested. Guest authentication and per-file limits do not constitute a site-wide anti-spam or billing limit.

## Map providers

Leaflet 1.9.4 is vendored with its license. The map uses OpenStreetMap tiles with visible attribution and normal browser caching. No prefetching or offline tile download is used. Location search is an explicit action (not per-keystroke), locally throttled/cached, using Photon's public service for modest personal-site use. Both endpoints are configurable at the top of `trip/map.js`; Photon has no availability guarantee. Larger traffic should use a hosted provider or self-hosted geocoder.

References:
- https://github.com/komoot/photon#demo-server
- https://operations.osmfoundation.org/policies/tiles/
- https://firebase.google.com/docs/auth/web/anonymous-auth
- https://firebase.google.com/docs/storage/security/rules-conditions

## Tests and verification

From the repository root, with Node 24 and Java 17+ for the pinned emulator tooling:

```sh
npm --prefix functions install
npm --prefix tests install
npm --prefix tests test
npm --prefix tests run rules
```

The test commands use the fake `demo-travel-journal` project. They do not access production data.

Validation performed during implementation:
- Twelve model/auth and existing lecture regression tests passed.
- Three DOM integration tests passed: filtering/details/photo navigation/themes; form validation and trip creation; interrupted photo batch retry without duplicate trips/photos.
- Four Firebase emulator integration tests passed: public reading, guest ownership, field/path validation, private portal isolation, lecture field restrictions, image reservations/types/ownership, and completed-photo immutability.
- JavaScript syntax and function export checks passed.

Visual browser and real photo-decoding validation still need to be done on the deployed preview/actual devices. The cloud browser blocked the local development URL, so DOM tests are not a claim of completed visual browser QA. Production Firebase authentication/rules were not changed from this workspace.
