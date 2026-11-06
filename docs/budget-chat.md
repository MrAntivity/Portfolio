# Budget AI chat

The Budget panel has a blue $ / AI launcher fixed at the bottom right. It expands into a responsive conversation with suggested questions, follow-ups, Enter-to-send (Shift+Enter for a newline), retryable errors, a new-chat button and Escape-to-close. Replies render as text, never HTML. Conversation stays in memory for this portal session, clears on sign-out, and never appears on other tabs. New chat and sign-out discard in-flight replies.

The budgetChat callable enforces the existing portal-owner identity before any reads. It fetches settings (including statements), transactions, wishlist and subscriptions from that authenticated UID's Firestore collections on every request. No client-supplied UID or budget snapshot is accepted. It includes balances, month totals, wishlist affordability and all original records. A size limit fails explicitly rather than silently answering from partial records. It does not read other portal collections, bank accounts or edit financial data. The user-visible disclosure explains that their saved budget is processed by OpenAI. Conversation text, budget data and AI responses are not logged by application code or saved to Firestore.

The existing OpenAI key is bound as a Firebase secret. GPT-4o-mini generates concise replies with bounded output, timeout and rate limiting (20 questions per 10 minutes). Rate-limit counters live in a server-only top-level collection. The server calculation module functions/budget-model.mjs mirrors viro/budget-model.js; the parity test requires updating both together to avoid misleading totals. The assistant is instructed to distinguish pending income, refunds, card payments, historical balances and future subscription plans, and treat record text as untrusted data. Answers are based on manual records, not live bank verification.

## Activate

GitHub Pages publishes the frontend. From the updated checkout, deploy the new function using the existing OPENAI_API_KEY:

```sh
git pull --ff-only
npm --prefix functions ci
npx firebase-tools deploy --only functions:budgetChat --project aidenyue
```

No Firestore rule changes are required. Until deployment, the chat displays a request error. After deployment, sign into Budget, open the $ / AI button, and ask a question; compare its reported balance to the dashboard. Actual authenticated AI responses cannot be verified from public deployment checks alone.

Tests cover owner authorization, bounds, calculator parity, owner-scoped server reads, exact calculated cents, follow-up context, literal rendering of hostile HTML, close/new-chat, retry and cleanup during sign-out.
