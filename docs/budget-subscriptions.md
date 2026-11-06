# Subscription renewals

Budget > Subscriptions supports monthly/yearly costs, payment accounts (Amex default), next renewal dates, notes, editing and pausing. Amounts are integer cents. Logs are ordinary expenses in Other; they affect the chosen checking/card balance, spending totals and wishlist calculations. This records expected subscription charges, not actual bank verification or payments.

The owner-only manageBudgetSubscriptions callable saves edits with revision checks and catches up renewals when opening Budget or pressing Sync. The recordSubscriptionRenewals scheduled function runs hourly in America/New_York even when the browser is closed. A transaction reads the subscription and deterministic entry IDs before atomically recording due entries and advancing the schedule. Concurrent invocations retry through Firestore; existing entries (including deleted/voided ones) are never recreated. Each run catches up at most 24 renewals per subscription. Monthly day anchors and yearly leap-day anchors survive short months. Paused subscriptions do not accrue logs; resuming an overdue paused subscription requires choosing today or a future next renewal.

Edits affect future generated entries, not existing logs. No actual subscriptions are canceled by pausing. The displayed cost is per renewal. Taxes or price changes must be entered manually. Subscriptions count toward the existing living budget; no extra reserve is deducted.

## Activation

The frontend is published by GitHub Pages. Deploy both backend functions from the updated checkout:

```sh
git pull --ff-only
npm --prefix functions ci
npx firebase-tools deploy --only functions:manageBudgetSubscriptions,functions:recordSubscriptionRenewals --project aidenyue
```

Firebase provisions the Cloud Scheduler job during deployment. Cloud Scheduler API must be enabled (the CLI prompts/enables it when permitted). Existing owner-only Firestore rules cover budgetSubscriptions; no rule or index changes needed. Until these functions are deployed, the form cannot save subscriptions or run automatic renewals. Do not report automation live based only on frontend deployment.

Validation: node --test tests/subscriptions.test.cjs; existing budget model/store/UI tests (tests require --experimental-vm-modules and jsdom).
