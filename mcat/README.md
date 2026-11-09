# MCAT Studio

Static page for https://aidenyue.com/mcat/, served by the existing GitHub Pages site. Firebase project: `aidenyue`. No Sites-hosting migration.

## Learning material

`curriculum.json` contains original foundation lessons across seven study subjects. Each lesson has a conceptual visual, a check, a worked example, a transfer question, and a source. `visuals.js` provides additional interactive subject models on related lessons.

`bank.mjs` builds 5,000 deterministic practice items. The exact family distribution and material limitations live in `BANK_INFO` and are displayed on the practice page. Most are numerical variations within reusable families, not independently authored MCAT exam questions. CARS passages are original and shorter than full exam passages. No expert review or exhaustive AAMC coverage is claimed. Official AAMC and publisher resources are linked, not copied.

## Private progress and AI

Sign in with the existing private VIRO portal PIN. The existing Firebase Auth email is used; the page does not create accounts. Progress is stored under `/users/{uid}/mcatProgress/{recordId}`, protected by the existing owner-only Firestore rules. Preview data is stored separately in the browser. Signed-in Firestore uses persistent local caching; the UI reports pending/offline writes. Export/restore is available from Study plan.

Question attempts use Firestore arrayUnion with unique event IDs. Accuracy is calculated from the earliest attempt, never the latest retry. Notes, completed lessons, flags, and study-plan text sync. The suggested exam date is the user-supplied August 28, 2027, not verified registration.

`mcatTutor` is an owner-only callable in `us-central1`, using the existing Secret Manager `OPENAI_API_KEY`. It does not expose the key or access unrelated portal data. Four modes accept bounded conversation and study context. Server-only rate records under `_mcatTutorLimits` limit usage to 12 calls per 10 minutes and 100 calls per Eastern day, with 1,800 output tokens per call. AI chats are tab-local, not synchronized. Input is rendered as text, including AI output.

## Checks and publication

```
node --test tests/mcat-model.test.mjs tests/mcat-tutor.test.cjs mcat/bank.test.mjs tests/mcat-content.test.mjs
node --check mcat/app.js
npx firebase-tools deploy --only functions:mcatTutor --project aidenyue
```

Only the new callable needs deployment; Firestore rules are unchanged. Push the static files to the existing GitHub Pages source branch. Browser QA covers local preview, lesson answer/notes/flags, practice/filtering/scoring, desktop and phone layouts. Signed-in live sync and a billed OpenAI reply require an owner session and should be verified separately if no session is available.

## MCAT Quest design and rewards

The Quest redesign adds Pip (a code-native SVG companion), seven colored subject worlds, daily activity quests, levels, XP, and badges. `game.mjs` derives rewards from existing synced records rather than storing a second score balance. First question attempts earn 10 XP plus 5 for a correct first attempt; the first later correction of a first-attempt mistake earns 5 XP once. First lesson completion earns 50 XP and saves `completedEver` / `completedDay`, retaining rewards when completion is toggled. Legacy completions receive credit without fabricated activity dates. Levels require 250 XP. Streaks use Eastern calendar dates and earned streak badges use the best historical streak. Reduced-motion preferences disable mascot motion and confetti.

Validation: `node --test tests/mcat-game.test.mjs tests/mcat-model.test.mjs`. Local preview verifies lesson XP, first-lesson badge, mobile layout, and persistent activity without writing test answers to the owner's account.
