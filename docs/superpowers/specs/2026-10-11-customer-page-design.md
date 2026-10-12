# One customer page (customer + site) — design and build plan

Date: 11 Oct 2026 · Status: **waiting for the owner's "go"** · Mock: `/Volumes/works-space/oneohm/prototypes/customer-page-prototype.html` (mock III) · Review: `/Volumes/works-space/oneohm/prototypes/customer-page-review.md`

## 1. Goal

One page answers, for any customer: who they are, where each site stands, what needs attention, the money, the project, the quote, the follow-ups, the history, the documents and the service tickets.

It replaces two pages that show the same facts twice and disagree in six places today (see the review, section 5):

- `/customers/[id]` — 9 tabs
- `/properties/[id]` — 8 tabs

Rules from the owner:

1. Keep the mock III design and feel.
2. Keep every permission and every action that exists today.
3. Leave no dead code behind.
4. Very deep QA after the build.
5. No new backend numbers without approval (section 4 lists each one).

## 2. The page

Route stays `/customers/[id]`. The chosen site is in the address: `?site=<propertyId>` (default: the primary site).

| Part | What it shows | Opens in place |
|---|---|---|
| Header | Name, status, phone (call), WhatsApp, city, handled by + Change, reseller, since, code. Buttons: Log follow-up, New quote, Add site, Edit, ⋮ (Delete customer). Inactive banner. Hint when the status tag is behind the journey. | — |
| Site switch | Only with 2 or more sites. Each button: site name, stage, balance. "+ Add site". | — |
| Where it stands | The 6-step journey of the chosen site, a date under a step only where we save one. Lead temperature chips before Won. Lost: grey track, reason, date, text. | — |
| Needs attention | A ranked list built from facts the app already has (section 3). Each line has one action. Green "Nothing needs attention" when empty. | More than 4 lines |
| Before the quote | Site visit and survey as two steps: status, date, person, and Book / Mark complete / Edit site data / Cancel site activity. Shown while the site has no accepted quote. | — |
| Money | Left to pay, bar (contract / received / balance), ageing, waiting for approval, payment terms (expected, paid, left), payments, loan, subsidy application. | — |
| Project | % and tasks done, phase, late flags, attention count, meter date, next task and how late, number, planned dates, team. "Convert to project" when a quote is accepted and no project exists. | Phases and team |
| Quote | Value, status, expiry / voided / change-order signals, price after subsidy, system line (panels, inverter, structure, warranty), number, date, made by, other quotes of the site, lock note. | — |
| Follow-ups | Open follow-ups with Complete and ⋮ (view, reschedule, reassign, cancel). | Done ones |
| History | One list for the customer and all sites. Only events we can prove from saved records. Filter by kind. | — |
| Site | Address + map, type, roof, mounting, shading, visit and survey notes, connection, RE arrangement, consumer number and name, DISCOM, meter number, pending DISCOM requests, added by. Edit site, ⋮ (Edit site data, Mark as lost, Reopen, Delete site). | — |
| Documents | Count and names by group. | The full document manager (the shared hub, unchanged) |
| Service | Tickets: title, number, status, priority, assignee, due, raised by. New ticket. | — |
| Profile | Email, alternate phone, Aadhaar (masked), billing address, lead source, referral code, group, created by. Edit. | — |

Deep project work (36 tasks, BOM, serial numbers, dispatches, reports) stays on the project page. Full price break-up, GST and margin stay on the quote page. This page links to both.

## 3. "Needs attention" — one rule, in one file

A pure function in the web app (`build-attention.ts`). It adds no number of its own. It only orders facts that other screens already show.

| Line | Fact it reads (already exists) | Tone |
|---|---|---|
| Follow-up is late | pending follow-ups before today (follow-ups summary rule) | red |
| Money overdue | AR ageing for the customer (`finance.view`) | red |
| Project items | `GET /projects/:id/attention` (critical, warning, info) | as sent |
| Quote accepted, no project | site journey: deal quote accepted + no live project | red |
| Nobody handles this customer | `assigneeId` is empty | red |
| No follow-up is planned | `needsFollowup` on the site | amber |
| Site visit / survey not done | `siteVisitDone`, `surveyDone` | amber |
| Quote expires soon / expired | deal quote `validUntil` | amber |
| DISCOM request pending | `changeRequests[status=pending]` | amber |
| Ticket open | `activeTicketCount` (`service.view`) | amber |
| Loan not confirmed | loan status `initiated` (`finance.view`) | amber |
| Connection details not recorded | consumer number, DISCOM, meter number empty on a Won site | amber |
| Waiting for approval | pending approvals for the customer (`finance.view`) | blue |

A line shows only when the user has the permission for its source.

## 4. Backend — three small additions (need approval)

All three expose a fact the backend already works out. No new rule, no migration.

| # | Addition | Why | Source that exists |
|---|---|---|---|
| B1 | `meterInstalledOn` (date) on the site journey | The journey shows the meter date | `v_project_commissioning.meter_completed_at`, already in the project facts |
| B2 | Project facts on `GET /projects/customer/:id`: current phase, next task (name, person, due), tasks done / total, late task count, meter date | The Project card | `PROJECT_FACTS_CTE`, already used by the project list |
| B3 | `resellerName` on `GET /customers/:id` | Header shows who brought the customer | `resellerId` → employee profile |

Everything else comes from requests the two pages make today: customer, sites with journey, follow-ups, AR ageing, receipts, site finance snapshot, site loan, subsidy applications, quotes, quote detail (system line), projects, project attention, tickets, pending approvals (`customerId` filter exists), documents.

No summary endpoint in this PR. Each card loads its own data with its own skeleton, and a card the user cannot see makes no request. I will measure the request count and report it.

## 5. Permissions — kept one for one

| Section | View gate (same as today's tab) | Action gates (same as today) |
|---|---|---|
| Page, header, profile, history, documents | `customers.view` | Edit `customers.edit` · Change owner `customers.assign` · Delete customer: admin + `customers.delete` |
| Site switch, journey, site card, before the quote | `properties.view` | Add site `properties.create` · Edit site, Edit site data, Mark complete, Cancel activity, temperature, Mark lost, Reopen `properties.edit` · Delete site: admin + `properties.delete` |
| Quote | `quotes.view` | New quote `quotes.create` (blocked when inactive or locked) |
| Project | `projects.view` | Convert `projects.create` |
| Follow-ups | `followups.view` | Schedule, Complete, Reschedule, Reassign, Cancel `followups.manage` |
| Money | `finance.view` | none (read only, as today) |
| Service | `service.view` | New ticket: save needs `service.manage` |

- History hides money lines without `finance.view`, quote lines without `quotes.view`, and so on. (Today the Activity tab only needs `customers.view`. This is stricter and is the one intended change. It is listed in the QA.)
- Reseller logins keep their own scope: the API decides, the page adds nothing.
- Found and **kept as they are** (not changed in this PR): document upload / move / delete have no gate; site ⋮ items are gated at the dialog, not at the menu; the New ticket button is gated at save.

## 6. Old links keep working

- `/properties/[id]` becomes a small redirect to `/customers/<customerId>?site=<id>`. It must stay forever: notifications already sent hold this link.
- `/properties/[id]?tab=followups&followupId=…` and `/customers/[id]?tab=…` open the page on the matching card (scroll + open the follow-up dialog). Mapping: followups, finance, quotes, projects, documents (`docProperty`), service, activity, properties.
- `/properties/[id]/edit` and `/customers/[id]/edit` stay. Both return to the new page.
- About 20 web files build a link to the site page (lists, quote page, project page, follow-ups, dashboard actions, command palette, onboarding). Each moves to one helper, `siteHref(customerId, propertyId)`.

## 7. Clean-up — no dead code

Deleted in the same PR, after the new page works:

- `customers/customer-detail/`: the 9 tabs, `tab-rail`, the site drawer, the old header, and any primitive nothing else uses.
- `properties/property-detail/`: the page, header, 8 tabs.
- Tab lists in `customers/constants.ts` and `properties/constants.ts`.
- Hooks, helpers, types and design tokens that only those files used. Tests of deleted helpers go with them.
- `knip` before and after; the after run must add nothing (the 21 duplicated root deps are known noise).

Reused as they are (house pattern first): the journey track and site facts of the customers-list panel, `FollowupRowActions` and its dialogs, the follow-up drawer, `PropertyDocumentHub`, the service ticket form, the assign control, the mark-as-lost and reopen dialogs, the edit-site-data modal, calm-list tokens and pills.

## 8. Build order (one branch, one PR)

Branch `feat/customer-page` from a fresh `main`. No worktree.

0. **Baseline, before any code.** Capture the two old pages for a fixed set of about 30 real customers (section 9a).
1. Backend B1–B3 + shared types. Restart the API (no watch).
2. Page shell: header, `?site=`, site switch, journey band, attention builder.
3. Before the quote, Money, Project, Quote.
4. Follow-ups, History, Site, Documents, Service, Profile.
5. Redirect, link helper, old `?tab=` mapping.
6. Delete the old code. Knip.
7. Deep QA → fix list (one line per problem) → owner approves → fixes on the same branch → fresh bug hunt → PR.

## 9. Deep QA

No new unit test files. No data changes: dialogs are opened and cancelled; a write is tested with a faked server answer and a database check. The local backend can alert real phones.

**a. Nothing lost (parity).** Before the build, save every text and every request of both old pages, all tabs, for about 30 customers that cover: no site, new lead, visit done, quoted, sent, accepted not converted, in project, commissioned, lost, reopened, 2+ sites, loan, subsidy, tickets, late follow-up, inactive, archived owner, reseller. After the build, every old fact must be on the new page with the same value. Any fact that moved or went away is listed for the owner.

**b. Right numbers.** Money figures against the API and read-only SQL, to the paisa. Stage, meter date, next task against the project page for every customer in the set.

**c. Attention list.** Each of the 13 lines checked against independent SQL for all customers: no line missing, no line that should not show.

**d. Permissions.** A minted token for each case: each of the 7 view permissions off, each action permission off, non-admin, reseller. Check: the section is hidden, its request is not sent, the action is blocked the same way as on the old page.

**e. Every action.** Each button and menu item opens the same dialog or route as before. Count them against the inventory in the review.

**f. Links in and out.** All link sources, the redirect, old notification links, old `?tab=` links, Back, refresh, a shared link with `?site=`.

**g. Sizes and states.** 1440, 1366, 900, phone. The customer with the most sites. Long names, Marathi text, empty states, loading and error state of each card.

**h. Requests.** Count per load. No request twice. No request for a hidden card.

**i. Regression.** Customers list and its panel, follow-ups list, quote page, project page, onboarding return paths. `npm test`, type check, lint, prettier, knip, production build of web and backend.

**j. Review.** Two independent code reviews and one fresh bug hunt before the fix list.

## 10. Not in this PR

Not in mock III, so not built: maintenance "visit N of 20", subsidy money paid out, customer feedback, WhatsApp read status, a summary endpoint. Each can be a later ask.

## 11. Deploy

Backend before web (B1–B3). No migration. Mobile is not touched.
