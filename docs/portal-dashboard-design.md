# VIRO dashboard refresh

The portal uses a shared charcoal/slate dashboard with lilac, mint, blue, and peach accents. Its desktop icon rail includes accessible labels, visible short names, and tooltips. Mobile keeps the existing collapsible navigation. The top search control routes into the existing workspace search; authentication and data access remain unchanged.

Overview counts come from the existing task, file, and contact subscriptions. Task progress reflects saved completed/open tasks by category; unavailable subscriptions retain placeholders. No demonstration data is shipped.

Budget's spending chart sums recorded day-to-day purchases in the selected month, excluding rent, refunds, deleted/voided records, and setup aggregates. The current month's line stops at today's date. Its totals do not replace the existing net-spending and affordability calculations.

Shared styling covers Files, Tasks, Calendar, Birthdays, Contacts, Vault, the media editor, and forms. Public homepage section margins and full-width mobile buttons are explicitly reset inside the portal. Notes remain hidden and their data remains preserved.

Validation: 68 existing/model/DOM tests passed, including the new spending-series test; JS syntax and whitespace checks passed. Browser previews with synthetic data were checked for desktop overview, budget, files, light mode, and 390px overview/budget with mobile navigation. Real signed-in Firebase operations were not exercised during visual QA. No Firebase rule or backend deployment changes are needed.
