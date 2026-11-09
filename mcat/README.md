# MCAT visual study workspace

Static page at https://aidenyue.com/mcat/, served by existing GitHub Pages hosting. Firebase project: `aidenyue`. No hosting migration.

## Study experience

Dark graphite / ice-blue styling defaults to dark, with a persistent light-mode toggle (`mcat-appearance-v2`). `workspace.css` supplies the visual workspace over the existing shared styles.

- `curriculum.json`: 70 original foundational lessons across seven subjects, each with a check, worked example, transfer question, and source.
- `concept-art.mjs`: 70 explicitly mapped, accessible topic-specific SVG diagrams and seven subject thumbnails. Diagrams can be expanded for small-screen reading.
- `visuals.js`: 15 exact-topic interactive models, with explanatory assumptions and tested numerical relationships.
- `practice-art.mjs`: conceptual setups for all 54 question families; answer formulas appear only after a response is checked.
- Lessons follow four freely navigable steps: Learn, Apply, Review, Try again. Draft notes and answer selections survive step changes within the tab.
- `study-coach.mjs`: contextual AI conversation beside a lesson/question. Pending replies remain scoped to the right account and context, and follow-up questions stay in place. Hints omit the stored solution before an answer is checked.
- `ai-format.mjs`: local Marked + KaTeX + DOMPurify render readable headings, lists, tables, and math. User text stays escaped; model-generated HTML is not trusted.
- `study-layout.mjs`: activity heatmap and momentum cards derived from real records, not demonstration data.

`bank.mjs` builds 5,000 deterministic practice variants from reusable families, not 5,000 independently authored MCAT exam questions. CARS passages are original and shorter than full exam passages. This remains a foundation curriculum; no expert review, exhaustive AAMC coverage, or score prediction is claimed. Official and publisher resources are linked rather than copied.

## Private progress and AI

Sign in using the existing private VIRO portal PIN. Records under `/users/{uid}/mcatProgress/{recordId}` retain the existing owner-only Firestore protection. Preview work stays separate in browser storage. Notes, completion, flags, and study plans sync; export/restore is available in Study plan. AI conversations are tab-local.

Question attempts use Firestore `arrayUnion` and unique event IDs. First-attempt accuracy never increases from retries. `game.mjs` derives XP, levels, daily missions, streaks and achievements from existing records. First attempts earn 10 XP plus 5 if correct; one later recovery earns 5 XP; first lesson completion earns 50 XP. Completion toggles do not farm points. Streaks use New York calendar days.

The owner-only `mcatTutor` callable in `us-central1` uses the existing server-side `OPENAI_API_KEY`. It accepts bounded conversation/context and retains the limits of 12 calls per 10 minutes, 100 per Eastern day, and 1,800 output tokens per call. Frontend-only redesigns do not require changing rules, secrets, or deploying functions.

## Verification and publication

Install test dependencies with `npm --prefix tests install`, then run:

```
npm --prefix tests run test:mcat
node --check mcat/app.js
```

Browser checks cover lesson steps, selecting versus checking an answer, worked feedback, practice advancement, expanded diagrams, interactive sliders, draft-note preservation, desktop/phone layout, and light/dark modes. Use local preview for answer/completion checks to avoid adding test progress to the owner's account. Verify a real tutor reply separately with an authenticated owner session.

Push static changes to the existing GitHub Pages source branch and verify the deployment. Exam target remains the user-supplied August 28, 2027; registration and official exam-calendar availability are not verified by this app.
