# Quotes dashboard — design

Date: 2026-10-09
Repo: `oneohm` (backend, web, `libs/shared`). Mobile is not touched.
Route: `/quotes` (web). Replaces `QuoteDashboardPage` completely.
Look: the same visual system as the `/projects` dashboard (PR #347).

## Goal

Anyone opens `/quotes` and, in a few seconds, knows:

1. **How sales is going.** New deals, won deals, win rate, money still open.
2. **Where every deal is.** How many deals sit in each of 5 stages.
3. **What needs action now, and by whom.** Four chase lists with their owners.
4. **Who is doing what.** Open deals per person and their wins.
5. **Where the money and the leads are.** Biggest open deals, lead sources, 12-month trend.

Every number is exact and clickable. A click opens the quote list (or a quote)
showing exactly the rows behind the number.

## Why the current page is replaced

- It pulls 500 quotes and 100 projects into the browser and does the math there
  (wrong once there are more than 500 quotes or 100 projects).
- Status counts take 7 requests (`/quotes?limit=1&status=X`).
- It counts quote rows, so one customer with 5 re-quotes shows up 5 times
  (local data: 1,489 live quotes on 824 properties; 331 properties have more than one quote).
- It trusts `viewed` and `expired`, which nothing ever sets.
- It hard-codes a greeting with a fallback name. Almost nothing is clickable.
- It shows nobody's name, so "who is doing what" is invisible.

## Decisions (locked with the user)

| # | Decision |
|---|---|
| D1 | The page counts **deals**, not quote rows. One deal = one property with quotes. |
| D2 | 5 deal stages: Drafting, Waiting, Gone quiet, Won, Lost. |
| D3 | Every web user with `quotes.view` sees all deals. No per-user scope. Resellers have no web login; the dashboard endpoint has no `@ResellerAllowed()`, so a reseller token gets 403 (house pattern). |
| D4 | One filter bar: **Period**, **Person**, **Cash / Loan**. |
| D5 | Needs action = 4 items: gone quiet with no follow-up; ends this week; draft not sent 7+ days; won with no project. |
| D6 | Layout A ("deal flow first") in the `/projects` dashboard colors. |
| D7 | Extras: median days to win, biggest open deals, where deals come from. No discount card. |
| D8 | Win rate = new deals in the period that are won so far (cohort). Not won ÷ (won + lost), because almost nobody marks a deal lost (local: 227 won, 4 lost). |
| D9 | A card's number equals the row count of the list it opens. Dashboard and list share one SQL rule set. |
| D10 | No new unit test files. Verify by running each screen with local data. |
| D11 | Remove the code this makes unused (see Cleanup). |

## Definitions (the single source of truth)

All rules live in one file: `apps/backend/src/modules/quotes/sql/deal-facts.sql.ts`.
It is used by the dashboard endpoint and by the quote list filters.

**Deal.** A `customer_properties` row (`deleted_at IS NULL`) with at least one
quote (`quotes.deleted_at IS NULL`).

**The deal's quote.** The same rule the quote list already uses
(`quote.repository.ts`, the `rank` function in `findAll`):

1. a live (`voided_at IS NULL`) quote with `status = 'accepted'`, else
2. the newest live quote (`created_at DESC, id DESC`), else
3. the newest voided quote.

The deal's values come from that quote and its newest `quote_versions` row
(`created_at DESC`, the same as `quote.repository.ts`):

| Value | Source |
|---|---|
| ₹ | `quote_versions.final_price` (gross, before subsidy — same as the list's Price column) |
| kW | `quote_versions.total_wattage_wp / 1000` |
| Person | `quotes.created_by` → `users` name. (`sales_person_id` is almost always empty; the customer owner is set on only 189 of 824 deals.) |
| Cash / Loan | `customer_properties.wants_loan` (same as the projects dashboard and finance) |
| Lead source | `lower(btrim(customer_profiles.lead_source))`, so "Gharkul", "gharkul" and "gharkul " are one source; empty or null → `not_set` ("Not set"). Labels capitalise the first letter ("gharkul" → "Gharkul", "walk_in" → "Walk in"). |

**Stage**, checked in this order:

1. **Won** — the deal's quote is live and `accepted`.
2. **Lost** — the deal's quote is `rejected`, or the property `status = 'lost'`.
3. **No live quote** — the deal's quote is voided and the property is not lost.
   Not a stage: it is in no stage count and no stage filter. (Local: 6 deals.)
4. **Drafting** — `status = 'draft'`.
5. **Waiting** — `status IN ('sent','viewed','expired')` and `valid_until >= today`.
6. **Gone quiet** — `status IN ('sent','viewed','expired')` and `valid_until < today`.

"Open" = Drafting + Waiting + Gone quiet.

**Dates** (all IST calendar days; the DB session time zone is IST):

| Date | Source |
|---|---|
| New deal date | `MIN(quotes.created_at)` over the property's non-deleted quotes (voided included) |
| Won date | the deal quote's `accepted_at` (set on 258 of 258 accepted quotes) |
| Lost date | `customer_properties.lost_at` when the property is lost; else the rejected quote's `updated_at` |
| Days to win | won date − new deal date, in days |

**Needs action** (all "right now", never filtered by period):

| Key | Rule |
|---|---|
| `quiet_no_followup` | Gone quiet, and the property has no `followups` row with `status = 'pending'` and `deleted_at IS NULL`. Follow-ups without a `property_id` do not count. |
| `ends_this_week` | Waiting, and `valid_until` is between today and today + 6 days. |
| `stale_draft` | Drafting, and the deal quote's `created_at` is more than 7 days ago. |
| `won_no_project` | Won, and no non-deleted `projects` row has `property_id` = this property. Cancelled projects count as a project. |

## Layout

One page, top to bottom. Desktop ≥ 1024 px as drawn. Below that, every band
stacks into one column. Visual system = the `/projects` dashboard: white page,
white cards (`bg-surface`, `shadow-e2`, `rounded-xl`), dark numbers, grey small
lines, green (`primary`, `primary-light`) for good, red (`error`) only for
problems. Mockup: `.superpowers/brainstorm/…/layout-v4.html` (workspace root).

### Header and filter bar

Left: "Quotes". Right: Period picker, Person picker, ALL / CASH / LOAN switch,
"All quotes" link, "New quote" button (gated by `quotes.create`).

- **Period:** This month (default), Last month, This quarter, This FY (Apr–Mar),
  Custom. Same picker and rules as `/projects` (custom max 3 years; `to` ≥ `from`).
- **Person:** Everyone (default), or one person. The options are everyone who
  made a deal quote that is open, or whose deal was new in the last 12 months.
  They come in the dashboard response, sorted by name.
- **Cash / Loan:** All (default) · Cash · Loan.
- All three live in the URL: `/quotes?period=this_month&person=<userId>&type=all`.
  Bad values fall back to the defaults.
- Person and Cash/Loan apply to every band. Period applies only to cards with
  the period tag.

### Band 1 — Strip (4 cards)

| Card | Big number | Small lines | Period? |
|---|---|---|---|
| New deals | deals with a new deal date in the period | kW · "30 cash · 12 loan" (each clickable; hidden unless the switch is All) | Yes |
| Won value | ₹ of deals won in the period | kW · ₹ change vs the previous period, cut to the same number of days when the period includes today (projects rule) | Yes |
| Win rate | % of the period's new deals that are Won now (a cohort; a different number from Won value) | "N won of M new" · "Median D days to win" (deals won in the period; hidden when none) | Yes |
| Open pipeline | ₹ of Waiting + Gone quiet | "N deals waiting or quiet" · kW | No |

### Band 2 — Where every deal is (hero)

Four blocks in a row with "›" between them:
Drafting › Waiting › Gone quiet › (Won over Lost, stacked).

| Block | Big | Lines |
|---|---|---|
| Drafting | count | ₹ · kW |
| Waiting | count | ₹ · kW |
| Gone quiet | count | ₹ · kW |
| Won (period tag) | count won in period | kW |
| Lost (period tag) | count lost in period | the most common `customer_properties.loss_reason` among them; hidden when none is recorded |

Each block has a thin colored base: Drafting stone, Waiting `primary-light`,
Gone quiet `error`, Won `primary`, Lost stone.

The blocks carry no problem counts. Those live only in Needs action (one fact,
one home): the mockup's red lines repeated the Needs-action numbers, so they
were dropped. Likewise the strip shows won **₹** and the Won block shows the
won **count**, so neither repeats the other.

### Band 3 — Needs action (60%) · Team (40%)

**Needs action.** The 4 items in a fixed order (the order above). Each row: label,
the top 2 owners with their counts ("Sameer 12 · Nitin 9 · +3 more"), and the
count in red. Rows with 0 show "None" in grey. When all are 0 the card says "Nothing waiting on anyone".

**Team.** One row per person with open deals or wins in the period. Each row: name,
a stacked bar of their open deals (Drafting stone, Waiting `primary-light`,
Gone quiet `error`), open count, "N won" in the period. Sorted by open count. The first 8
rows are shown, then "+N more" (opens the list of open deals, no person filter).
With a Person selected, this card shows that one person.

### Band 4 — Biggest open deals · Where deals come from

**Biggest open deals.** The top 5 Waiting or Gone quiet deals by ₹. Each row: customer
name, kW, person, and "ends in N d" (Waiting) or "quiet N d" in red (Gone quiet,
days since `valid_until`), and the ₹ on the right.

**Where deals come from** (period tag). The deals new in the period, grouped by lead
source. The top 4 sources by count, then "Other" (the rest, "Not set" included).
Each row: source label, a bar, the count, and "N% win" (won now ÷ count). "—" when count < 3.
The Other row's key is `LEAD_SOURCE_OTHER_BUCKET` (`__other__`, in `libs/shared/src/utils/deal-stage.ts`),
never `other`: real profiles store the word `other`, so a bucket keyed `other` would collide with it.

### Band 5 — Last 12 months

Grouped bars per month, current month last: new deals (stone) and won (`primary`).
A switch Deals / ₹ changes the unit. Follows Person and Cash/Loan, not Period.

## Click map

| Click | Target |
|---|---|
| New deals | list · `newFrom/To` = period |
| "N cash" / "N loan" | list · `newFrom/To` + `financing` |
| Won value / Won block | list · `stage=won` + `wonFrom/To` |
| Win rate | list · `newFrom/To` + `stage=won` |
| Open pipeline | list · `stage=pipeline` (Waiting + Gone quiet) |
| Drafting / Waiting / Gone quiet block | list · `stage=<key>` |
| Lost | list · `stage=lost` + `lostFrom/To` |
| Needs action row | list · `attention=<key>` |
| Owner name in a Needs action row | list · `attention=<key>` + `person` |
| Team row | list · `stage=open` + `person` |
| "+N more" (Team) | list · `stage=open` |
| Biggest open deal row | `/quotes/<quoteId>` |
| Lead source row | list · `newFrom/To` + `leadSource` ("Other" = the excluded sources plus "Not set": `leadSourceNotIn`) |
| Trend bar | list · `newFrom/To` or `stage=won` + `wonFrom/To` for that month |

Person and Cash/Loan from the filter bar are always carried into the link.
List links use the list's existing URL state (`useTableUrlState`, prefix `quotes`).
New filters show as normal chips in the list's filter panel (the Customers
pattern), so a user can see and remove them. All URLs are built in one file, `links.ts`.

## Backend

### Deal facts — `apps/backend/src/modules/quotes/sql/deal-facts.sql.ts`

`DEAL_FACTS_CTE` (CTE text, no `WITH`) gives one row per deal:

`property_id, customer_id, quote_id, quote_status, voided, value_rupees, kw,
person_id, wants_loan, lead_source, stage (drafting|waiting|quiet|won|lost|none),
new_date, won_date, lost_date, loss_reason (`customer_properties.loss_reason`), valid_until, quote_created_at,
has_pending_followup, has_project, quiet_no_followup, ends_this_week,
stale_draft, won_no_project`.

It also exports `DEAL_FACTS` predicate snippets and `buildDealFactsFilter(query)`,
the same shape as `project-facts.sql.ts`, so the dashboard and the list use
the same text.

### Endpoint — `GET /quotes/dashboard`

- Query: `period`, `from`, `to`, `person` (uuid), `financing` (`all|cash|loan`).
  Validated with class-validator; bad input → 400.
- Declared before `GET /quotes/:id` in `quote.controller.ts` (or its own
  `quote-dashboard.controller.ts` registered first), so `dashboard` is not read as an id.
- Auth: `JwtAuthGuard`, the same as the list. No `@ResellerAllowed()`, so resellers get 403.
- One request per page load. All sections read `DEAL_FACTS_CTE` in parallel queries.
- Period logic: move `apps/backend/src/modules/projects/utils/dashboard-period.ts`
  to `apps/backend/src/common/utils/dashboard-period.ts` and import it from both modules.

Response type `QuotesDashboard` in `libs/shared/src/types/quotes-dashboard.ts`.
It reuses `DashboardPeriod`, `DashboardRange` and `DashboardFinancing` from the projects type.
It carries: `period`; `people[]`; `strip`; `stages`; `needsAction[]` (with top owners);
`team[]`; `biggestOpen[]`; `sources[]`; `trend[]` (12 months).
Money is sent as rupees (numbers), the same unit the quote list uses.

### Quote list — new filters (`GET /quotes`)

`stage` (`drafting|waiting|quiet|won|lost|open|pipeline`; `open` = all three open
stages, `pipeline` = Waiting + Gone quiet), `person`, `financing` (`cash|loan`),
`attention` (the 4 keys), `newFrom/To`, `wonFrom/To`, `lostFrom/To`,
`leadSource`, `leadSourceNotIn` (an array: repeat the parameter per source, at most 20,
each up to 200 characters; never a comma list, because real sources contain commas; the web keeps it
as a JSON array in `quotes_filters`). Both lead-source filters compare the normalised value. Each one is applied as
`quote.id IN (SELECT quote_id FROM deal_facts WHERE …)`, so it pins to the deal's
quote and the list's one-row-per-property collapse returns the same rows the
dashboard counted. Existing filters are unchanged.

List items gain `dealStage`. The list shows it as a **Stage** column (a calm
chip, same colors as the stage blocks).

## Web

### Files

- Shared dashboard kit: move the generic pieces of
  `components/features/projects/components/dashboard/` (`animated-number.tsx`,
  `motion.ts`, `band-state.tsx`, `format.ts`, the period part of `filter-bar.tsx` and
  `use-dashboard-filters.ts`) to `components/features/dashboard/kit/`. Update
  the projects dashboard imports. No behavior change there.
- New `components/features/quotes/components/dashboard/`: `filter-bar.tsx`
  (period + person + cash/loan), `strip.tsx`, `deal-flow.tsx`, `needs-action.tsx`,
  `team.tsx`, `biggest-open.tsx`, `sources.tsx`, `trend-chart.tsx`, `links.ts`.
- Rewrite `quote-dashboard-page.tsx` as a thin orchestrator.
- Hook `useQuotesDashboard` in `lib/hooks/resources/quotes-dashboard.ts`.
- Quote list page: moves from `AdvancedTable` to `CrmTable` (the Customers /
  Projects pattern), because only `CrmTable` takes filter-only fields
  (`filterColumns`). Same visible columns plus a Stage column; the new filters in
  its filter panel (dates use `MUIDateRangePicker`; "Made by" is fed by the
  employees list, as on the project list), sent through `useQuoteListResource`.

### States

- Loading: skeletons the same shape as each band (no layout jump).
- Error: the one request fails → each band shows "Could not load · Retry";
  the header and filter bar stay usable.
- Empty: zero deals for the filters → "No deals match" + "Clear filters".
- Refetch on filter change keeps the old numbers on screen.
- Long names truncate with "…" and show the full name on hover.

### Motion

No new library. Reuse `AnimatedNumber`, `ENTER`/`enterDelay`, Recharts' animation.

- First load: numbers count up (600 ms); stage blocks fade in left to right
  (60 ms stagger); list rows fade in one by one (40 ms); trend bars rise.
- Filter change: numbers tween old → new; bars resize. No replay of the entrance.
- Hover: cards lift slightly; bars darken; tooltips show exact values.
- `prefers-reduced-motion: reduce` → no motion.

## Cleanup (approved)

Delete:

- `components/features/quotes/components/dashboard/` (the old 6 parts:
  `action-required`, `conversion-funnel`, `high-value-quotes`, `kpi-grid`,
  `project-mix`, `revenue-trend`) and the old body of `quote-dashboard-page.tsx`.
- The stat cards at the top of `quote-list-page.tsx` (total, accepted, conversion).
  The dashboard owns these facts now (one fact, one home).
- `useQuoteStatusCounts` in `components/features/quotes/hooks/use-quotes.ts`
  (and its export), unused after the two deletes above.
- `markExpiredQuotes()` in `quote.service.ts` (never called; expiry stays date-based).
  Update the comment in `dashboard/providers/workflow.provider.ts` that names it.
- Any helper that becomes unused (checked with `knip` at the end; ignore the 21
  duplicated root deps it always flags).

Keep: the `viewed` / `expired` status values (consumer app and a DB check use them).

## Edge cases

| Case | Handling |
|---|---|
| Property with 5 re-quotes | One deal; the deal's quote rule picks one. |
| Signed quote, then a new draft | Won (the live accepted quote wins). |
| All quotes voided, property lost | Lost. |
| All quotes voided, property not lost | No stage; not counted in any stage; still on the list. |
| Rejected with "requote" and a new quote made | The new quote decides the stage. |
| `viewed` / `expired` status | Treated as sent; the date decides Waiting vs Gone quiet. |
| Valid until today | Waiting (today counts as still valid). |
| Follow-up on the customer but not the property | Does not count as a follow-up for the deal. |
| Won, project cancelled | Has a project; not in `won_no_project`. |
| Lead source empty | "Not set", inside "Other". |
| Person never set (`created_by` null) | Cannot happen (`created_by` is required); guard as "Unknown". |
| Win rate with 0 new deals | "—", not 0%. |
| Previous period | Same length, directly before; "Same" when equal; cut to equal days when the period includes today. |
| Custom range invalid | Picker blocks it; API returns 400; page falls back to default. |
| Zero results | "No deals match" + "Clear filters". |
| API rate limit (100/min) | One request per load and per filter change. |
| Narrow screen | One column; the flow stacks vertically with "›" turned down. |
| Reduced motion | No animation. |

## Verification (no new unit test files)

1. `nx run-many -t lint,typecheck` and the web production build are clean; `knip` shows no new unused exports.
2. In the browser pane on local data, signed in as the local admin:
   - every card, small line, block, Needs-action row and owner name,
     Team row, biggest-deal row, source row and trend bar is clicked; the
     opened list's total equals the clicked number (or the quote page opens);
   - each period × All / Cash / Loan × (Everyone, one person) is checked on the strip;
   - Back after a click returns to the same dashboard filters.
3. A read-only SQL cross-check of the 5 stage counts, the 4 Needs-action counts, and
   new / won in the current month.
4. The quote list: the Stage column matches the stage filter; the removed stat cards are gone; old filters still work.
5. The projects dashboard still renders the same after the kit move.
6. Light and dark theme; 375 px and 1440 px widths; reduced motion on.

## Out of scope

- Recording a real "sent at" date or a status history (no such columns today).
- Marking stale deals lost automatically.
- Discount analytics.
- Mobile app changes.

## Release

One PR in `oneohm` from `feat/quotes-dashboard` (cut from `main`). Backend,
shared and web ship together. The shared version auto-bumps on merge.
