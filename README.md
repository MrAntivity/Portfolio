# Aiden Yue · Portfolio

Personal portfolio at **https://aidenyue.com**, hosted from `main` with GitHub Pages.

## Public site

- `index.html`: biography, current ventures, Asynq Designs, experience, photos, and contact links.
- `portfolio.css`: responsive monochrome theme and animation styles.
- `portfolio.js`: scroll animation, theme preference, photo gallery, and the existing view counter.
- `assets/photos/`: optimized WebP versions of Aiden's supplied photographs.
- `assets/keyboard-basin.webp`: PBTfans Basin product render; source below.

The page is plain HTML, CSS, and JavaScript, with no installation or build step. Edit the files and push to `main`. Navigation and content work without JavaScript; animations respect reduced-motion settings. Short screens show the keyboard story in normal document flow. The gallery supports next/previous buttons, arrow keys, and Escape to close.

Google Fonts supplies Inter and Space Grotesk; system fonts remain available offline. The view counter retains its cached fallback when its external service is unavailable.

## Private portal

`viro/` is the personal workspace. Its eight sections use the public portfolio’s monochrome palette, typography, and shared light/dark preference. Desktop navigation uses a sidebar; on smaller screens, the menu button opens navigation. Tasks retains the original `#todos` route, and Notes retains `#drive` so existing links continue to work.

Use **Cmd/Ctrl + K** to open workspace search. Dialogs keep keyboard focus inside, close with Escape, and return focus to their trigger. Existing Firebase authentication, encrypted vault storage, uploads, notes, and Google Calendar connections are retained. The Vault’s extra unlock now reauthenticates with your workspace PIN through Firebase instead of comparing against a password embedded in the JavaScript source. `functions/` and Firebase configuration are unchanged. A network or module-loading error shows a retry message on the sign-in screen.

The public site and portal keep separate stylesheets and scripts. The portal uses `styles.css` for its existing shared component base, with its workspace theme scoped in `viro/portal.css`. No installation or build step is required.

## Image credit

PBTfans Basin, designed by Asynq Designs. Product render via [KBDfans](https://kbdfans.com/products/pbtfans-doubleshot-basin).
