# Customers list — calm rebuild

Date: 2026-10-10 · Branch: `feat/customers-list-calm` (from `main` after #349)
Route: `/customers`. Visual reference (prototype, sample data, NOT code to copy):
`/Volumes/works-space/oneohm/prototypes/customers-prototype.html`.

## Goal

The team says they cannot see what is going on and the page is hard to read.
Each customer becomes one calm line: who, how far along (a 6-step journey
track), the next follow-up, the value. A click opens a focus panel with the
sites and details. No table of small text, no table inside a table.

## Hard rules

1. **Search, chips, filter panel, sorting, pagination and URL state keep their
   exact behavior** (same API params, same `customers_*` URL keys, same legacy
   keys, same contradiction rule, same debounce). Only their look changes.
2. Every number is exact. A clickable number opens a screen that shows the
   rows behind it; if no screen can show them, the number is not a link.
3. Nothing a user can do today is lost, except the items under "Removed".
4. One fact, one home. Few controls. The row ⋮ menu is always visible.
5. No new unit test files. Verify by running the screen on local data.
6. No data changes while testing. SQL is read-only.

## Journey (site stage) — one rule, in SQL

Steps: `Lead captured` → `Survey done` → `Quote drafted` → `Quote sent` →
`Won` → `Commissioned` (indexes 0–5). Checked highest first, per site:

| Result | Rule |
|---|---|
| `lost = true` | site `status = 'lost'`, OR its project is `cancelled`, OR its deal quote is `rejected` (deal quote = the quotes list rule: live accepted → newest live → newest voided; a voided quote never makes a site lost). The stage index is still computed (where it stopped). `lostReason` = site `loss_reason` / `lost_reason`, or "Project cancelled", or the quote's `rejection_reason`. |
| 5 Commissioned | the site's project has a row in `v_project_commissioning` (meter installed — the rule the projects dashboard and finance use), OR project `status = 'completed'` |
| 4 Won | site `status = 'converted'`, OR a live (`voided_at IS NULL`) quote with `status = 'accepted'` exists |
| 3 Quote sent | deal quote status in `sent`, `viewed`, `expired`, `rejected` |
| 2 Quote drafted | any non-deleted, non-voided quote exists |
| 1 Survey done | `surveyDone` or `siteVisitDone` (the existing fields) |
| 0 Lead captured | otherwise |

The rule lives once, as a SQL fragment in the customers backend module, used
by (a) the per-site value on `GET /customer-properties/customer/:id` and
(b) the per-customer roll-up on `GET /customers`. The web never re-derives it:
`getSiteStageIndex` is deleted and the web reads `stageIndex` / `lost`.

**Customer roll-up** (`journey` on each list item):

- `siteCount`; `stageIndex` = the highest index among sites that are not lost;
  if every site is lost (or there are sites and the customer `status = 'lost'`)
  → `lost = true` and `stageIndex` = the highest index reached;
- `stageCounts[6]` = live sites per step; `lostSites` = number of lost sites;
- no site → `siteCount = 0` (track empty, "No site yet", "+ Add site").

Small line under the stage name: `N site(s) · X kW` then, when there is more
than one site, what the others are doing in words, e.g. `· 1 at quote sent`,
`· 1 lost`. kW and ₹ are the existing `sitePortfolio.totalSystemSizeKw` and
`totalPortfolioAmount` (unchanged definitions).

## Next follow-up — new display fields

`nextFollowup` on each customer list item, or `null`:
`{ id, type, subject, scheduledAt, assigneeName, propertyId | null }` — the
pending (`status = 'pending'`, not deleted) follow-up with the earliest
`scheduled_at` over the customer and its non-deleted sites. Also
`pendingFollowupCount`. Per site the record already has `nextFollowupAt` and
`needsFollowup`; add `nextFollowup` with the same shape.

Row text: `<Type label> · 14 Oct` / `<assignee first name> · in 4 days`.
Overdue (`scheduledAt` before now) → the line is `text-error`, sub-line
`overdue N days` (or `overdue today`), and the icon ring pulses softly
(off under reduced motion). No pending follow-up:
- customer matches the existing "needs follow-up" predicate → grey
  `No follow-up planned`;
- lost → grey `Closed`;
- otherwise → grey `Nothing due`.
The list item gains `needsFollowup: boolean` from the existing predicate so
the row and the "Needs follow-up" chip can never disagree.

## Page

**Header.** "Customers" + one sentence:
`<customers> customers · <sites> sites · <₹> in open quotes · <N> follow-ups overdue`
and "Add customer" (gated `customers.create`, → `/onboarding/new`).
- customers, sites: existing `statistics/overview` (with "N new this month" as title/tooltip).
- open quotes ₹: the quotes dashboard's pipeline (`GET /quotes/dashboard` →
  `strip.pipeline.valueRupees`) and it links to the quote list with
  `stage=pipeline` — one fact, one home, and the link shows exactly those deals.
  (The old page's own "Pipeline / Awaiting reply / ageing" figures are dropped:
  they were a second, slightly different definition of the same thing.)
- follow-ups overdue: `GET /followups/summary` overdue count, linking to
  `/followups` opened on its overdue view (add a small URL bridge on that page
  if it has none; if that is not cleanly possible, link to `/followups` and say so).

**Status ribbon** (replaces both chip rows and the KPI cards). One
proportional bar (Lead / Prospect / Active / Inactive / Lost) and big-number
buttons: All, the five statuses (same `filters.status` values and counts as
today), then `Needs follow-up` and `Has active tickets` (same filter fields,
same counts, same mutual exclusivity as today). `aria-pressed` kept.

**Tools.** Search (same placeholder, debounce, min length) · Filters (the
existing `TableFilters` popover with every existing filter, chips, Clear all,
Reset) · Sort menu with the three existing sorts and directions: Newest /
Oldest (`createdAt`), Name A–Z / Z–A (`firstName`), City A–Z / Z–A (`city`).
Default `createdAt DESC`. Same `customers_sort` URL value.

**Rows.** One card-row per customer (≈72 px), fade/rise in once:
1. Avatar · **name** (link → `/customers/[id]`, stops row click) · small tags:
   group (`groupName (groupCode)`), the status tag (always shown, quiet, so the
   chips and the rows agree; `Lost` in the error tint), and a ticket icon when
   `activeTicketCount > 0` (title "N active tickets", → `/customers/[id]?tab=service`).
   Line 2: `city pincode · source` (source = lead-source label; reseller name
   when the customer has a reseller).
2. **Journey**: stage name (or `Lost`, `No site yet`) + the small line, and
   the track: 6 stops, animated fill and pin; grey when lost.
3. **Follow-up** cell (rules above) → `/customers/[id]?tab=followups`
   (with `followupId` when there is one), stops row click.
4. **Value** `totalPortfolioAmount` (existing ₹ format; `Not quoted yet` text
   as today) + `added <date>` → value links to `/customers/[id]?tab=quotes`.
5. **Handled by**: a small avatar of `assigneeName`; when unassigned, a dashed
   avatar with title "Not assigned · created by <creatorName>". Never show
   the creator as if they were the owner.
6. **⋮** menu — unchanged items, gates and delete-block rules.

Row click / Enter opens the **focus panel** (one at a time; Esc, ✕ and the
shade close it; focus returns to the row; URL not changed).

**Focus panel** (right drawer, replaces the expanded row):
- Header: avatar, name (link to the customer page), status, group, source.
- Quick actions: **Call** (`tel:` on phone; alternate phone listed) and
  **Follow-ups** (→ `?tab=followups`). No WhatsApp.
- "Where it stands": the 6 steps as a checklist for the customer's stage.
- **Sites · N** — loaded lazily with the existing `useCustomerProperties`
  (same loading skeleton count, error + Retry, empty state copy). Each site is
  a block: consumer number (or "Consumer no. not available"), Primary chip,
  address/city, type; its own mini journey + stage name; quote status with the
  quote number linking to `/quotes/[id]` when one exists; value
  (`latestQuoteFinalPrice`); DISCOM · sanctioned load · connection type; next
  follow-up (date, assignee) or the existing red "No follow-up scheduled" hint;
  lifecycle status (`getSiteLifecycle`); added date; project link
  (`/projects/[id]`) when converted; the existing site ⋮ menu
  (`PropertyRowActionsMenu`, all items/gates). Clicking the block →
  `/properties/[id]`. "Add site" (gated `properties.create`).
- Details: handled by / created by, onboarded date, value, follow-up people
  (the existing `followupAssignees` with the live / last-handled meaning),
  active tickets link.
- "Open full customer page".

**Footer.** The existing pagination (sizes 10/25/50/100, "Showing a–b of N
customers", page x of y), same URL behavior.

**States.** Skeleton rows shaped like the new rows; refetch keeps rows with a
thin progress bar; error banner + Retry; both empty states with today's copy
and buttons.

**Responsive.** ≥1100 px as designed; below that the row stacks (name →
journey → follow-up/value); the panel becomes full width under 600 px.

**Motion.** Track fill and pin slide (≈1 s), rows rise in with a small
stagger, header numbers count up, ribbon bar grows, drawer slides. Filter
changes tween, they do not replay the entrance. All off under
`prefers-reduced-motion`.

## Removed (approved)

- KPI cards (their facts live in the header sentence and the ribbon).
- Bulk selection: both bulk actions are no-ops today.
- WhatsApp icon.
- Column visibility menu (there are no columns; "Created by" moves to the panel).
- The row-expansion table (replaced by the panel).
- `getSiteStageIndex` and code only it used.

## Verification

1. typecheck (libs, backend, web), eslint, prettier, `npm test`, `tokens:check`, knip.
2. Parity with `main` on local data, same URL → same total and same first-page
   ids: no filter; each status chip; needs follow-up; has tickets; a search by
   name, by phone, by consumer number; three filter-panel filters; each sort;
   page 2; page size 25; the legacy URL keys; `/properties?…` redirect.
3. Read-only SQL cross-check of `journey` (stage, lost, counts) for 30
   customers incl. multi-site, lost, no-site, meter-installed, accepted-not-
   converted; and `nextFollowup` for all customers that have one.
4. Every click target opens the right screen; the open-quotes link's list
   total equals the header figure's deal count.
5. 1440 / 1280 / 768 / 375 px; reduced motion; no console errors in a fresh tab.
