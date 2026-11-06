# Somewhere together — /trips

A standalone shared travel journal at `https://aidenyue.com/trips/`. GitHub Pages normalizes `/trips` to `/trips/`. The legacy `/trip` and `/trip/` addresses forward to `/trips/`, preserving query parameters and shared-trip fragments; no new domain purchase or DNS change is needed. The main site's navigation is unchanged. A noindex/nofollow meta tag discourages search indexing, but this is a public page, not a password-protected archive.

## What is included

- Portfolio-matched dark/light editorial design and existing portfolio photographs in the header.
- World map with clickable pins; repeat visits at the same coordinates are grouped into one popup with each trip listed.
- Real trip/place/friend counts, search across stories and people, and year filtering.
- New trip form: title, contributor, place/address, exact map pin, start/end dates, attendees, story, excursions, and optional photos.
- Photon address search, map click/drag adjustment, and manual coordinate fallback. A failed geocoding service does not block entering a location manually.
- Public galleries with photo credits/captions, full-screen viewing, and keyboard navigation. The owner can set covers and remove any photo.
- Top-right Editing mode verifies the existing VIRO portal PIN through Firebase Email/Password sign-in. The isolated editor session is kept only in memory and locks on reload or Exit editing. No PIN is stored in site code.
- Up to 20 photos per batch. JPEG/PNG/WebP/HEIC/HEIF originals up to 20 MB are resized to a maximum 2400-pixel edge and stored as JPEG, up to 8 MB. Originals are not separately archived. Canvas export strips original EXIF/location metadata. HEIC/HEIF photos are converted locally using the pinned heic-to 1.5.2 decoder, loaded on demand from jsDelivr. Only the converted JPEG is stored; Live Photo motion and original metadata are not retained. Note image insertion also uses converted JPEGs. Portal Files now retain the original HEIC and use a separate JPEG only for preview.
- In editing mode, drag photos onto a memory card, an open memory, or either photo form. Drops append to the pending batch (up to 20); invalid drops preserve existing selections. Enter a photo credit and submit to upload. File selection remains available on touch devices.
- Progress and partial upload recovery. Successful photos remain saved; retry sends only the remaining selected files. Pending selections are in memory and do not survive a page reload.
- Real-time trip/gallery updates and shareable `#trip=...` links.

Production starts empty. No trips are inferred from Aiden's past conversations or photos. `?demo=1` uses clearly labeled sample stories and the existing portfolio photos. It never loads the Firebase data module or uploads anything remotely. The demo is read-only.

## Deployment and access

The journal reuses the existing `aidenyue` Firebase project and bucket. Keep the existing Email/Password provider and portal owner account; Anonymous sign-in is not needed. Changing the portal password automatically changes the journal PIN because both verify the same account.

Deploy the combined rules before publishing the frontend:

```sh
firebase deploy --config firebase.trip.json --only firestore:rules,storage --project aidenyue
```

Compare against current deployed rules first to preserve unrelated portal access policies. Publish the frontend through the repository's GitHub Pages deployment on `main`.

- Everyone can read trips, browse maps, open stories, and view ready gallery photos without signing in.
- Only the authenticated portal owner can create, edit, or delete trips and upload or remove photos. Firestore and Storage enforce this independently of the UI, including for old anonymous sessions.
- `trips/{tripId}` holds trip metadata; its `photos` subcollection holds credit/caption, dimensions, storage path, and pending/ready state.
- `tripPhotos/{tripId}/{uid}/{photoId}.jpg` holds optimized photos. Uploads require the owner's matching pending metadata reservation and cannot overwrite completed photos.
- Delete trip removes every photo object and metadata record, including pending entries and photos beyond the visible gallery page, before removing the trip. An interruption leaves the trip available for retry.
- Existing guest-created trips remain publicly readable; the owner can edit and delete them.
- Private portal files remain private. The separate editor login does not replace the portal session.

No new CORS change is required for gallery image display.

## Map providers

Leaflet 1.9.4 is vendored with its license. The map uses OpenStreetMap tiles with visible attribution and normal browser caching. No prefetching or offline tile download is used. Location search is an explicit action (not per-keystroke), locally throttled/cached, using Photon's public service for modest personal-site use. Both endpoints are configurable at the top of `trip/map.js`; Photon has no availability guarantee. Larger traffic should use a hosted provider or self-hosted geocoder.

References:
- https://github.com/komoot/photon#demo-server
- https://operations.osmfoundation.org/policies/tiles/
- https://firebase.google.com/docs/auth/web/password-auth
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

Verification for the owner-editing update includes public read-only UI, editor exit, existing journal behavior, and emulator checks for owner writes, anonymous/stranger denials, legacy guest content, and private portal isolation. Production owner PIN entry is left to the owner; tests do not require or record the real PIN.

## Place collections

The Collections tab is public. Owner editing uses the same in-memory portal PIN session as Trips. Create a named collection, open it, and choose Add place. Search by a business name, city, or address; select a result to populate its name and coordinates. The map pin is draggable, and names, addresses, coordinates, 1–5 ratings, and notes remain editable. Unrated places are supported.

Relevance matches every search word and prioritizes name matches, then address matches; ties use recently added first. With no search, relevance shows recently added places. Highest rated sorts by score, then creation time. Photos use the same local conversion and size limits as trip photos, with partial upload retries retaining the saved place and completed photos.

Data lives in `placeCollections/{collectionId}`, its `places/{placeId}` subcollection, and each place's `photos/{photoId}` subcollection. Image objects live in `collectionPhotos/{collectionId}/{placeId}/{uid}/{photoId}.jpg`. Firestore and Storage enforce owner-only writes, reserved uploads, and public reading of completed photos. Removing a place or collection cleans up its photo objects and child documents before deleting the parent. Existing trip and private portal policies are preserved.

Collection links use `#collection=<id>` and the collection list uses `#collections`. Do not publish local test fixtures or preview login stubs.

Collection place editors accept multiple dropped photos anywhere in the open editor, as well as file-picker selections. Batches append up to the existing 20-photo limit; invalid batches preserve the current queue. All trip and collection location links open Google Maps using the saved coordinates.
