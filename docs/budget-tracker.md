# Budget tracker

The private VIRO portal now includes **Budget**. First choose **Set up budget**, or **Import my setup** with a locally held setup JSON, review its figures, then Save. Real opening balances are deliberately excluded from this public repository. Setup is a Firestore transaction that refuses to overwrite an existing budget.

Amounts are USD integer cents. Set the opening bank and total card balances as of one date. Historical card purchases and earlier deposits are already in those balances. Optional earlier spending totals only affect the opening month's budget reserves; they do not change bank/card balances. No bank integration or automatic payment is performed.

## Daily use

- **Spending:** required title, positive amount, date, payment method, category; optional notes. Chase debit reduces checking. Amex Gold and Chase Freedom Unlimited increase their respective debt. Rent and fees have a separate category.
- **Money in:** adds actual received funds to checking, including irregular income. The monthly-income shortcut records income on the first with a unique monthly ID. It does not appear for an opening month whose first predates setup. Expected income never automatically changes the balance. If a monthly entry is voided, use Money in to record its correction; the original ID remains in the audit log.
- **Pay a card:** moves checking money to card debt without counting another expense. Can be linked to a statement, including partial payments. Only records a payment; does not initiate one.
- **Refund:** full or partial, linked to the original purchase, credited to its original account. Original purchase remains. Refund totals update atomically to prevent duplicate/over-refunds across tabs. Refunds reduce spending in the month received.
- **Void:** reverses a mistaken entry's balance effect without deleting its log. Void a purchase's refunds before voiding the purchase. Correct a typo/amount by voiding and recording a replacement.
- **Statements:** editable amount, card, due date and estimated-date flag. Reminders don't add debt; the opening balances and transaction ledger are the debt source of truth. If a refund changes the issuer's statement amount due, edit the reminder to match. Payments reduce only the statement explicitly selected.
- **Export log:** downloads setup, ledger and wishlist as JSON for private backup. It is a backup export, not an overwrite/restore importer. The setup importer accepts the initial setup schema only.

## Wishlist calculation

Available comfortably = logged checking − positive balances on both cards − remaining current-month living budget − remaining current-month rent/fees − chosen cash cushion. Negative card balances are credits, not spendable cash. Future income is excluded. Unpurchased wishes reserve this amount in priority order (lowest number first, stable ID tie-break). The screen labels affordable items and shows shortfalls for the others. This calculation assumes complete transaction logs and suitable monthly targets; it is not a prediction of future balances.

Recording a wishlist purchase is an ordinary expense, linked atomically to the item. A second purchase cannot be recorded for the same item concurrently. Voiding the purchase restores the wishlist item. Removing an item archives it.

## Persistence / access

Uses `users/{uid}/budget/settings`, `users/{uid}/budgetEntries/{id}` and `users/{uid}/budgetWishlist/{id}`. The existing private-owner recursive Firestore rules permit these paths. No new rules, Storage access or Cloud Functions are needed. No real financial values are in source, fixtures, docs or the PR. Snapshots keep devices updated; mutations use Firestore transactions. Failed saves preserve forms. Signing out stops subscriptions, removes handlers and clears the Budget DOM. Transactions require connectivity; there is no silent offline success.

## Other requested UI changes

Folder cards have a dedicated wrapping name row, with the count and Share button below. Long names are not ellipsized or squeezed out. Existing click, keyboard, drag/drop, context menu and sharing hooks are retained.

Notes is hidden behind `NOTES_ENABLED = false` in `viro/portal.js`, with the nav button initially hidden in HTML. The tab is excluded from navigation/hash routing and universal search; its collection subscriptions and lecture module loading are disabled. Note UI code, note documents, folders and lecture audio remain untouched. To restore, enable the flag (the nav becomes visible at initialization). No backend data deletion or migration occurs.

## Tests

`npm --prefix tests test` includes accounting/validation, refund and wishlist transaction tests with a mock transactional store, and DOM flow tests for spending, refunds, plan changes, setup import, failed validation and sign-out cleanup. Tests use synthetic figures. The initial setup file is separately validated without publishing its contents. Actual Firebase/browser smoke testing still requires a signed-in portal session after deployment.
