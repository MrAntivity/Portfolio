# Aiden Yue · Portfolio

Personal portfolio at **https://aidenyue.com**, hosted from `main` with GitHub Pages.

## Public site

- `index.html`: professional introduction, AUREX Medical, selected ventures, Asynq Designs, experience, and contact links.
- `homepage.css`: dark-first responsive portfolio, light theme, and animation styles. `portfolio.css` remains for the existing error page.
- `homepage.js`: decorative orbital canvas, scroll-driven product story, reveal animations, and persisted theme preference.
- `assets/photos/`: optimized WebP versions of Aiden's supplied photographs.
- `assets/keyboard-basin.webp`: PBTfans Basin product render; source below.

The page is plain HTML, CSS, and JavaScript, with no installation or build step. Edit the files and push to `main`. Navigation and content work without JavaScript; animations respect reduced-motion settings. Short screens show the keyboard story in normal document flow. The professional homepage contains no travel gallery, portal links, or trips links. The direct-link travel journal remains shareable.

Google Fonts supplies Inter and Space Grotesk; system fonts remain available offline. The decorative canvas pauses offscreen and in background tabs; reduced-motion users see all content without animation.

## Private portal

`viro/` is the personal workspace. Its eight sections use the public portfolio’s monochrome palette, typography, and shared light/dark preference. Desktop navigation uses a sidebar; on smaller screens, the menu button opens navigation. Tasks retains the original `#todos` route, and Notes retains `#drive` so existing links continue to work.

Use **Cmd/Ctrl + K** to open workspace search. Dialogs keep keyboard focus inside, close with Escape, and return focus to their trigger. Existing Firebase authentication, encrypted vault storage, uploads, notes, and Google Calendar connections are retained. The Vault’s extra unlock now reauthenticates with your workspace PIN through Firebase instead of comparing against a password embedded in the JavaScript source. `functions/` and Firebase configuration are unchanged. A network or module-loading error shows a retry message on the sign-in screen.

The public site and portal keep separate stylesheets and scripts. The portal uses `styles.css` for its existing shared component base, with its workspace theme scoped in `viro/portal.css`. No installation or build step is required.

## Image credit

PBTfans Basin, designed by Asynq Designs. Product render via [KBDfans](https://kbdfans.com/products/pbtfans-doubleshot-basin).

## Lecture Studio

Portal → Notes includes microphone recording, saved audio, incremental AI transcription, and timestamped study notes. See [setup and verification](docs/lecture-notes-setup.md) for the required Firebase function deployment, access rules, storage CORS, recovery behavior, and tests. A GitHub Pages push alone does not deploy the AI backend.

## Shared travel journal

`trips/` is the standalone, unlisted **Somewhere together** travel journal. It includes a world map, trip stories/attendees/excursions, and public Firebase photo galleries with owner-only editing. It is not linked from the main portfolio. Legacy `/trip/` links redirect to `/trips/`; shared application assets remain in `trip/`. See [activation and validation](docs/trip-setup.md) for PIN-protected editing and deployment. The Collections tab supports owner-curated places, maps, ratings, notes, and photos. A `?demo=1` preview uses labeled sample data only and never writes to Firebase.
