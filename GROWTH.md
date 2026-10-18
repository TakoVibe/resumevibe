# ResumeVibe: first-user launch

## What this release does

- Introduces ResumeVibe by TakoVibe before the editor, with building a resume as the primary action. No job description or account is needed to start editing or export a PDF.
- Keeps job-fit comparison optional, with a direct editor route beside its job-description validation. A role title is not treated as a full job description.
- Opens a complete sample report without sign-in at `/job-fit?demo=sample`.
- Preserves the editor at `/#builder`, including existing `?edit=`, `?ai=`, and application links.
- Signed-in visitors opening `/` see the editor immediately, without scrolling through the landing page. Signed-out visitors keep the light-default landing page; saved theme preferences remain respected.
- Signed-out editors show a compact, single-row progress reminder above the workspace. Its close button hides it for the current browser tab (including refresh), without deleting the draft. The browser draft is restored from `resume-data-v3`; a private `?edit=` URL is not fetched without authentication. On a shared browser, logging out does not remove that local draft. A fresh browser cannot recover a private document just from its slug.
- **Log in to save** preserves the visible draft, clears stale cloud-document metadata, and saves a new private copy after sign-in (the existing autosave delay applies). After a successful save the URL points to the new saved resume. **Open linked** instead opens the account-owned server document after sign-in. Unsigned example resumes are not automatically saved as real user documents.
- Explains account requirements and free/paid actions before resume upload.
- Identifies the site and its creator in homepage metadata and structured data.
- Caps numeric-experience matches when cited text does not establish the requested duration. The comparison is still a text heuristic, not a validated hiring assessment.

## Connect measurement

The existing local `dataLayer` and `resumevibe:analytics` events continue working.
An optional GA4 adapter forwards a restricted set of fields to a real destination.

1. Create/select a GA4 web stream for `https://resumevibe.takovibe.com`.
2. Add its measurement ID as `PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX` in the deployment environment, then rebuild and deploy.
3. Disable Enhanced Measurement in that stream so this application controls the events and sanitized URLs sent. Review your privacy notice and configure any consent requirements before enabling the stream.
4. Verify `page_view`, `landing_view`, and `landing_cta_clicked` in GA4 Realtime. Test a real account separately before inviting users.

No provider is loaded while the ID is empty. Do Not Track suppresses provider loading and events. Provider events exclude resume content, email addresses, resume slugs, application IDs, URL queries, and private profile/public-resume routes. UTM fields are restricted to short campaign labels; do not put personal information in them.

Track this funnel:

`landing_view → landing_cta_clicked → builder_opened → resume_export_completed → checkout_started → token_purchase_completed`

Editor entry is not proof of activation: people can open the workspace or export the example without creating their own resume. Review actual first-user outcomes, and measure real resume editing before optimizing paid campaigns for an activation event. The optional tailoring branch is `fit_analysis_started → fit_report_completed → application_workspace_started`.

- Exclude `resume_source=sample` from real fit-report conversions.
- `account_created` is emitted only when the Google authentication API reports a genuinely new account. `authentication_continued` is the job-fit sign-in continuation and includes returning users. Historical `signup_completed` events used the old continuation meaning; do not treat those as new-account counts.
- `token_purchase_completed` is emitted after server verification confirms success. Client events are directional analytics; reconcile revenue against the backend payment ledger.
- Compare source cohorts and actual completed applications before evaluating channels.

## Search Console after deployment

1. Verify a Domain property for `takovibe.com` or a URL-prefix property for `https://resumevibe.takovibe.com/`.
   For the HTML-tag method, set `PUBLIC_GOOGLE_SITE_VERIFICATION` to the token Google provides, rebuild/deploy, and then complete verification in Search Console. A Domain property uses DNS verification instead.
2. Submit `https://resumevibe.takovibe.com/sitemap-index.xml`.
3. Inspect `/` and `/job-fit`; check indexing status, Google's selected canonical, and the live rendered page.
4. Request indexing after the deployed content is verified. Submission does not guarantee indexing or a ranking.
5. Review branded queries (for example `resumevibe|resume vibe|takovibe`) and non-branded queries separately, with country/device filters. Low-volume queries may not appear in the query table.

These actions require your Google account. The code cannot verify ownership or submit URLs on your behalf.

## Recruit the first five users

Share a direct link instead of asking people to search for the product:

`https://resumevibe.takovibe.com/?utm_source=linkedin&utm_medium=personal&utm_campaign=first_five`

For an engineering community, change `utm_source` to that community's short name. For a product preview, use:

`https://resumevibe.takovibe.com/job-fit?demo=sample&utm_source=linkedin&utm_medium=personal&utm_campaign=first_five`

Suggested personal invitation:

> I built ResumeVibe by TakoVibe and I'm looking for five backend engineers applying for jobs this month to test it. Bring your current resume, or start from the editor—we'll work through a resume together in 15 minutes. No job description is needed. I'm asking for honest feedback.

Record each invitation, reply, completed application, time to export, confusing step, independent return, and payment. Ask permission before publishing any customer example. Start with 20 relevant invitations, five conversations, and three completed applications as experiment targets.

The proposed ₹999 personally reviewed service has not been enabled or charged for. Validate the deliverables and your ability to fulfill it before selling it. Existing free features, credit balances, and token-pack prices are unchanged.

## Admin pilot tokens

The shared Django backend now exposes an Admin/superuser-only `POST /api/users/{id}/tokens/grant/` endpoint. ResumeVibe's profile shows a Pilot token grants section only after `/api/users/me/` confirms `can_manage_tokens`; TakoVibe's existing admin user directory has a Grant tokens action. Both use the same shared wallet.

Access it while signed in as an Admin or superuser:

- TakoVibe: `/dashboard` → **Users** → search by email/name → **Grant tokens**.
- ResumeVibe: `/profile` → **Pilot token grants** → search by email/name, or **Use my account**.

Choose a recipient (including your own account), enter 1–100,000 whole tokens and a reason, review, then confirm. Each grant records the actor, source product and reason in the token ledger. Retries reuse the same UUID to prevent double credit. These are one-time, non-expiring credits, not subscriptions, purchases or product-restricted credits. Date-based expiry has not been implemented.

Users can submit requests at `/profile?tab=requests`, with their desired amount and a reason. They see only their own history and admin review notes. Requests never credit automatically. There is one pending request per shared wallet and a limit of 3 submissions per rolling 24 hours.

Admins review the inbox at ResumeVibe `/profile?tab=requests` or TakoVibe `/dashboard` → **Users** → **Token request inbox**. They can approve a custom amount or reject with a user-visible reason. Approval updates the request, wallet and credit ledger atomically; retrying the same review cannot add credit twice. No email notifications are sent; use **Refresh status** / **Refresh requests**.

Deploy the backend migrations through `0027_signup_acquisition` and the API before deploying the interfaces. This includes `0025_admin_token_grants` and `0026_token_requests`. No live grants or production migrations were executed during development.

## Admin campaign insights

- TakoVibe: `/dashboard` → **Campaign insights** (Admin/superuser only).
- Dashboard tabs now have stable fragments, including `/dashboard#users`, `#campaign`, `#profile`, `#inbox`, `#series`, and `#my-posts`. Direct links, reload, manual fragment changes, and browser Back/Forward stay in sync. Login redirects preserve the fragment; it does not bypass role permissions.
- The admin **Users** directory defaults to **Active users**, with **Inactive users** and **All users** filters applied server-side before pagination/search counts. Eligible lower-ranked users have explicit **Deactivate** / **Reactivate** actions with confirmation. Self/equal/higher-rank changes remain denied. Deactivation keeps account data and tokens, rejects existing API tokens, and blocks Google login; it cannot erase browser drafts already stored on a device.
- ResumeVibe: `/profile?tab=insights`, linked from the admin pilot panel. Access is verified against the server, not stored browser roles.
- Filter signup dates (inclusive calendar days, default India timezone), source, campaign, signup product, and user email/name. Filter the user list to saved-resume / no-saved-resume accounts.
- See new accounts, current saved resume totals, accounts with/without a saved resume, campaign-tag coverage, token-purchasing accounts, each user's join date, saved document count and last saved update.
- Dates select the **signup cohort**. Resume counts and purchase flags are lifetime/current records for that cohort, not actions limited to the selected dates. Admin/superuser accounts are excluded. Summary cards ignore the extra saved/no-saved list filter.

New ResumeVibe Google accounts persist allowlisted campaign labels from the most recently stored tagged browser visit (maximum age 30 days) at account creation. Email/password signup can also accept this metadata. Returning logins never overwrite acquisition. Unknown historical attribution remains unknown; missing UTMs do not prove a direct visit. Labels are visitor-reported, not verified Google Ads click attribution. Do Not Track suppresses sending campaign metadata from ResumeVibe. Raw click IDs, full URLs and resume content are not stored in the acquisition field.

Example pilot landing URL:

```text
https://resumevibe.takovibe.com/?utm_source=google&utm_medium=cpc&utm_campaign=india_backend_pilot&utm_content=resume_editor
```

“No saved resume” is **not** “did nothing”: guest/local edits and PDF exports are not included. Deleted resumes are not counted, and saved samples do not prove a completed real resume. Purchase flags use purchase-credit ledger records, excluding signup/pilot grants. This report does not connect ad spend/clicks, revenue/refunds, export counts or profit; its saved-resume rate is not an ad-click conversion rate.

## Campaign launch priorities

1. Deploy the API/migrations and both frontends. Run a tagged landing → genuinely new signup → edit/save → real PDF export → test-mode payment journey. Confirm the new account/campaign and saved counts in the admin report; check GA4 Realtime separately. Verify privacy disclosures and applicable consent before paid traffic.
2. Use one clear engineering audience and one promise (create/edit an ATS-friendly resume). Keep job-description comparison optional and expose account/free/paid requirements before an action.
3. Measure real activation: a user's own resume saved/exported, not editor opens, example downloads or free token grants. The current admin report proves server saves, not export completion or document quality. Wire a validated activation conversion before optimizing bidding for it.
4. Bring in Google Ads spend/clicks and verified payment revenue/refunds in a follow-up. Evaluate cost per activated user, cost per first paying customer, paid revenue, AI/payment costs and contribution margin—not visits alone. No Ads integration or budget has been enabled here.
5. Run a small pilot first, inspect search terms and device drop-offs, collect feedback from the first five real users, then improve the biggest drop-off before increasing spend. Only contact users through an appropriate, disclosed follow-up process; an email in the admin report is not marketing consent.

## Verification

Use Node 22.18+ or Node 24:

```sh
npm test
npm run build
npm run dev -- --host 127.0.0.1
```

Before production, test Google sign-in, a real resume import, saving, PDF export, and Razorpay's test-mode verification with development accounts. The shared Django welcome-email subject/link and TakoVibe's article links live in sibling repositories and need their own follow-up changes.
