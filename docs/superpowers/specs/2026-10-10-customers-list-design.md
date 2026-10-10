# Customers list — calm rebuild

Date: 2026-10-10 · Branch: `feat/customers-list-calm` (from `main` after #349)
Route: `/customers`. Visual reference (prototype, sample data, NOT code to copy):
`/Volumes/works-space/oneohm/prototypes/customers-prototype.html`.

## Goal

The team says they cannot see what is going on and the page is hard to read.
Each customer becomes one calm line: who, how far along (a 6-step journey
track), the next follow-up, the value. A click opens a focus panel with the
sites and details. No table of small text, no table inside a table.

**Deploy backend before web.** The page reads `journey`, `nextFollowup`,
`needsFollowup` and `sitePortfolio` from `GET /customers`; against a backend
that does not send `journey` a row with sites shows no stage (an empty track),
not "No site yet".

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
| `lost = true` | site `status = 'lost'`, OR its live deal quote is `rejected` (deal quote = the quotes list rule: live accepted → newest live → newest voided; a voided quote never makes a site lost). **A cancelled project does not make a site lost** — cancelling releases the roof, which can be re-quoted and sold again. The stage index is still computed (where it stopped). `journeyLostReason` = site `loss_reason` / `lost_reason`, else "Project cancelled" (a LOST site with a cancelled project and no reason of its own), else the quote's `rejection_reason`. |
| 5 Commissioned | the site's project counts (see below) AND it has a row in `v_project_commissioning` (meter installed — the rule the projects dashboard and finance use) or its `status = 'completed'` |
| 4 Won | site `status = 'converted'`, OR a live (`voided_at IS NULL`) quote with `status = 'accepted'` exists, OR the site has a project that counts |
| 3 Quote sent | deal quote status in `sent`, `viewed`, `expired`, `rejected`, `accepted` (live or voided; a live accepted quote is already step 4, so `accepted` here means it was voided after acceptance — it still went out) |
| 2 Quote drafted | a non-deleted, non-voided quote exists |
| 1 Survey done | `surveyDone` or `siteVisitDone` (the existing fields) |
| 0 Lead captured | otherwise |

**A project counts** when it is not cancelled, or when the site is lost. A
cancelled project on a lost site still says the deal was won before it was lost
("stopped at won"); on an open (reopened) site it says nothing, and the stage
comes from the site's quotes and survey like any other open site.

**Step facts.** The stage says how far a site got, not that every earlier step
happened (a site can be won with no survey on record). The fragment also
publishes one boolean per step — `surveyed`, `quoted` (a live quote, or a quote
that went out), `quoteSent`, `won`, `commissioned` — using the same sub-rules as
the table. "Lead captured" has no flag: it is always true.

**Deal quote.** The fragment publishes the deal quote it read the stage from
(`dealQuote: { id, number, status, quoteDate, voided, finalPrice, systemSizeKw } | null`;
`quoteDate` is the day printed on that quote, `YYYY-MM-DD`)
so a screen shows that quote, not a second pick. The older `latestQuote*`
fields (newest live quote) are unchanged — mobile reads them.

The rule lives once, as a SQL fragment in the customers backend module, used
by (a) the per-site value on `GET /customer-properties/customer/:id` and on
`GET /customer-properties/:id`, and (b) the per-customer roll-up on
`GET /customers`. The web never re-derives it: `getSiteStageIndex` and
`SITE_STAGES` are deleted, and every screen that shows a site's stage — the
list, its panel, the customer page (overview, sites tab, site drawer) and the
site page — reads `stageIndex` / `lost` and names the step from
`SITE_JOURNEY_STEPS`, with the same "Lost · stopped at … · reason" wording.

**Customer roll-up** (`journey` on each list item):

- `siteCount`; `stageIndex` = the highest index among sites that are not lost;
  if every site is lost (or there are sites and the customer `status = 'lost'`)
  → `lost = true` and `stageIndex` = the highest index reached;
- `stageCounts[6]` = live sites per step; `lostSites` = number of lost sites;
- `steps` = each step fact OR-ed over the sites the stage was read from (the
  sites in play; every site when the journey is lost);
- `lostReason` = the `journeyLostReason` of the most recently lost site (by the
  site's `lost_at`, else when its rejected quote last changed), or null;
- no site → `siteCount = 0` (track empty, "No site yet", "+ Add site").

Small line under the stage name: `N site(s) · X kW` then, when there is more
than one site, what the others are doing in words, e.g. `· 1 at quote sent`,
`· 1 lost`. A lost customer reads `stopped at <step> · <lostReason>`. kW and ₹
are `sitePortfolio.totalSystemSizeKw` and `totalPortfolioAmount`. Each site is
read at its DEAL quote (live accepted → newest live → newest voided — the quote
the stage is read from and the site panel prints); a site with a live project
still counts ₹ at its contract. So a row's ₹ and kW are the sum of its site
blocks, never the value of a later draft or of a voided quote beside a live
one. (Changed 2026-10-10: these used the newest quote, voided or not. The
overview statistics and every filter, search and sort are untouched.)

## Next follow-up — new display fields

`nextFollowup` on each customer list item, or `null`:
`{ id, type, subject, scheduledAt, assigneeName, propertyId | null }` — the
pending (`status = 'pending'`, not deleted) follow-up with the earliest
`scheduled_at` over the customer and its non-deleted sites. Also
`pendingFollowupCount`. Per site the record already has `nextFollowupAt` and
`needsFollowup`; add `nextFollowup` with the same shape.

Row text: `<Type label> · 14 Oct` / `<assignee first name> · in 4 days`.
Overdue = the follow-up's scheduled DAY is before today in India (the
follow-ups summary's day boundary; one due earlier today reads `today`, not
overdue) → the line is `text-error`, sub-line `overdue N days`, and the icon
ring pulses softly (off under reduced motion). No pending follow-up, tested in
this order (the same order in the row and in a site block):
1. matches the "needs follow-up" predicate → `No follow-up planned` (an open
   site whose quote was rejected reads "lost" on the journey but still owes
   someone an action — it is not closed);
2. lost → `Closed`;
3. otherwise → `Nothing due`.
With nothing pending the sub-line does not name who handles the customer —
that is the avatar at the end of the row.
The list item gains `needsFollowup: boolean` from the existing predicate so
the row and the "Needs follow-up" chip can never disagree.

**Needs follow-up predicate — one approved change (2026-10-10).** A site is
excluded as "already won" only by a LIVE accepted quote (`voided_at IS NULL`).
A voided accepted quote (cancelled project, reopened site) no longer hides a
site nobody owes an action on. This is the single exception to hard rule 1: it
moves the "Needs follow-up" count (900 → 906 on local data) and the follow-ups
"gaps" total (934 → 940).

**Search and name sort ignore stray white space — approved (2026-10-10).**
Stored names carry stray spaces and tabs ("Hanmant " + "Kharade"; 297 of 1,230
customers locally), so a typed full name found nobody and names typed with a
leading space sorted first. Two more exceptions to hard rule 1, both in the
query only (same API params, same URL keys):

- Search also matches the first + last name with white space squeezed to
  single spaces, against the typed term squeezed the same way. It only adds
  matches; every other search clause is unchanged.
- Name A–Z / Z–A orders by the first name without its leading white space and
  without regard to case (the local database sorts "ASHOK" before "Aadesh";
  the order must not depend on the database collation).

The shared filter panel (`TableFilters`) also closes on Esc while focus is
still on the page; it opens without taking focus, so MUI never saw the key.

## Page

**The header stays in view while the list scrolls (owner request, 2026-10-10).**
In a desktop-size window (1024 px wide and 700 px tall, or more) the title, the
ribbon and the search bar pin under the global header as one block; the rows
scroll under it. In a smaller window that block would cover most of the screen,
so only the search bar pins. A row that takes keyboard focus scrolls clear of
the pinned block. The refetch bar rides on the pinned search bar.

**Header.** "Customers" + one sentence:
`<customers> customers · <sites> sites · <₹> in open quotes · <N> follow-ups overdue`
and "Add customer" (gated `customers.create`, → `/onboarding/new`).
- customers, sites: existing `statistics/overview` (with "N new this month" as title/tooltip).
- open quotes ₹: the quotes dashboard's pipeline (`GET /quotes/dashboard` →
  `strip.pipeline.valueRupees`), written with the dashboard's own money format
  (the same figure reads the same on both screens), and it links to the quote
  list with `stage=pipeline` — one fact, one home, and the link shows exactly
  those deals.
  (The old page's own "Pipeline / Awaiting reply / ageing" figures are dropped:
  they were a second, slightly different definition of the same thing.)
- follow-ups overdue: `GET /followups/summary?mine=false` overdue count (whole
  company; site visits and surveys are not counted — the tooltip says so),
  linking to `/followups?scope=overdue&owner=all`, the view that lists them.

**Status ribbon** (replaces both chip rows and the KPI cards). One
proportional bar (Lead / Prospect / Active / Inactive / Lost) and big-number
buttons: All, the five statuses (same `filters.status` values and counts as
today), then `Needs follow-up` and `Has active tickets` (same filter fields,
same counts, same mutual exclusivity as today). `aria-pressed` kept.

**Tools.** Search (same placeholder, debounce, min length) · Filters (the
existing `TableFilters` popover with every existing filter, chips, Clear all,
Reset) · Sort menu with the three existing sorts and directions: Newest /
Oldest (`createdAt`), Name A–Z / Z–A (`firstName`), City A–Z / Z–A (`city`).
Default `createdAt DESC`. Same `customers_sort` URL value. A hand-edited sort
with a field the API mapping does not know shows the label of the request
actually sent (created date, in the given direction). A hand-edited `status`
that is no status highlights no ribbon button (as before the rebuild).
`/properties?…` (the old sites list) redirects here with its query intact.

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
5. **Handled by**: a small avatar of `assigneeName` (title "Handled by
   <name>"), at the right of the row before ⋮; when unassigned, a dashed empty
   avatar with title "Not assigned · created by <creatorName>". Never show
   the creator as if they were the owner. An assignee whose account is
   archived is still the assignee: the list and `GET /customers/:id` send the
   name with `assigneeArchived: true`, and the row, the panel and the
   customer's own page read "<name> (archived)". An archived user is shown,
   never offered as a choice when reassigning.
6. **⋮** menu — unchanged items, gates and delete-block rules.

The row is not a button wrapping links: a real "open details" button covers
the row (first in tab order, named with the customer, the stage and the
follow-up), and the name, ticket, follow-up, value and ⋮ sit above it as
ordinary links and buttons. "+ Add site" is a gated button
(`properties.create`). Long names get the room first; tags shrink to an
ellipsis with a title. Fact-carrying text uses the readable grey (4.8:1), never
the decorative one.

Row click / Enter opens the **focus panel** (one at a time; Esc, ✕ and the
shade close it; focus returns to the row; URL not changed).

**Focus panel** (right drawer, replaces the expanded row):
- Header: avatar, name (link to the customer page), status, group, source.
- Quick actions: **Call** (`tel:` on phone; alternate phone listed) and
  **Follow-ups** (→ `?tab=followups`). No WhatsApp.
- "Where it stands": the 6 steps as a checklist. A step is ticked only when
  its fact is on record (`journey.steps`); a step the journey has passed
  without a record reads "not recorded" and has no tick; the current stage is
  "current step"; later steps are quiet. "Lead captured" is always ticked.
  With two or more sites the card is the customer roll-up, so one line under
  the heading says which sites it was read from: "Furthest of 3 sites";
  "Furthest of 2 open sites · 1 lost not counted"; "From the 1 open site · 2
  lost not counted"; on a lost journey "Furthest any of the 2 sites reached".
  No line with one site — the card is that site.
- **Sites · N** — loaded lazily with the existing `useCustomerProperties`
  (same loading skeleton count, error + Retry, empty state copy). Each site is
  a block: consumer number (or "Consumer no. not available"), Primary chip,
  address/city, type; its own mini journey + stage name; the DEAL quote (the
  quote the stage was read from): its number linking to `/quotes/[id]`, its
  status ("· voided" when it is), its value and size (`dealQuote`, not
  `latestQuote*`); DISCOM · sanctioned load · connection type; next
  follow-up (date, assignee), else red "No follow-up planned", "Closed" or
  "Nothing due" (the row's order);
  lifecycle status (`getSiteLifecycle`; "Meter installed · project still open"
  when the meter is in and the project is not completed, so it cannot argue
  with a "Commissioned" stage); added date; project link (`/projects/[id]`) for
  a live project only — a lost site may link its "Cancelled project", a
  reopened site shows none; the existing site ⋮ menu
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
stagger (capped at 12 steps, so a page of 100 arrives at once), header numbers
count up once (a fact that loads later does not restart the others), ribbon bar
grows, drawer slides. Filter
changes tween, they do not replay the entrance. All off under
`prefers-reduced-motion`.

## Removed (approved)

- KPI cards (their facts live in the header sentence and the ribbon).
- Bulk selection: both bulk actions are no-ops today.
- WhatsApp icon.
- Column visibility menu (there are no columns; "Created by" moves to the panel).
- The row-expansion table (replaced by the panel).
- `getSiteStageIndex`, `SITE_STAGES` and code only they used (the detail
  pages read the server's journey too).

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
