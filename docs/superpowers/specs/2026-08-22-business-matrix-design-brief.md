# Business Matrix — UX design brief

Design the **Business mode** of the OneOhm dashboard.

Every decision below is settled. Nothing here is an open question, and there is no need to ask
any back. Where something looks like a choice, it has already been made and the reason is given
so you can design confidently rather than hedge. Design the screen as specified.

All facts were verified against the live codebase and database on 2026-08-22.

---

## 1. The shape of it — read this first

The dashboard at `/` is **one page with two modes**:

- **My Work** — the existing screen. What needs *me* today. This already ships.
- **Business** — the new mode. How is the *business* doing.

A **mode switch** sits in the dashboard's header area and flips between them.

**There is no new page. There is no new route.** `/` is the only URL. Do not design navigation,
breadcrumbs, or a landing page. You are designing the Business mode's content plus the switch
that reveals it.

**The switch is only visible to people allowed to see business-wide data.** Everyone else sees
the dashboard exactly as it is today, with no switch and no hint that a second mode exists.

**My Work mode is the default.** The chosen mode is remembered for next time.

**The employee selector is hidden in Business mode.** My Work mode has a dropdown letting an
authorised manager view another employee's queue. Business mode is organisation-wide, so that
control does not apply and disappears while the mode is active. The two controls never show
together.

---

## 2. What OneOhm is

An EPC (engineer–procure–construct) platform for **residential and commercial solar** in India.
The business runs: lead → site visit → survey → quotation → project → installation → payment
collection → service. Roughly 40 staff. Money is **INR**; the API returns rupees.

Who opens Business mode: the owner, and managers running sales, delivery or collections. They are
not analysts. They open it for ninety seconds between site visits.

---

## 3. The one hard rule

**Only metrics backed by live data may appear.** No placeholder charts, no "coming soon", no
invented metrics. §6 lists what does not exist — do not design anything that needs it.

---

## 4. What Business mode shows — the decided content

Eight things, in this priority order. Priority means importance to the reader, not a literal
vertical stack — arrangement is yours.

### 4.1 Headline numbers — "is this month OK?"
Source: `GET /finance/kpis`

- **Net cash flow** for the period — the single most important number on the screen
- **Money in** (revenue) and **money out** (spend) for the period
- **Outstanding now** — total owed to us, with the count of overdue items
- **Installations completed** in the period (`meterInstallations`)

Also available from the same call if useful: `receiptCountInRange`, `expenseCountInRange`,
`unallocatedCredit`.

### 4.2 Cash flow over time
Source: `GET /finance/cash-flow` — money in and out, keyed on value date.

### 4.3 Sales funnel and conversion
Source: `GET /analytics/sales-pipeline/dashboard`
Stages carry `count`, `value`, and `conversionRateFromPrevious`. Lost deals come as `lostCount`
and `lostValue`.

### 4.4 Sales health
Same call: `totalPipelineValue`, `avgDealSize`, `winRate`, `avgSalesCycleDays`.

### 4.5 Leads vs won over time
Same call: `points[]` of `{ period, leadsCount, wonCount }`.

### 4.6 Salesperson leaderboard
Same call: `{ salesPersonName, propertyCount, pipelineValue, wonCount, winRate }` per person.

### 4.7 Money owed, by age
Source: `GET /finance/customers/ar` — one row per customer, `totalOutstanding` split into five
aging buckets: current, 0–30, 31–60, 61–90, 90+.

**This panel is always "as of today" and does not respond to the date range.** See §5.2.

### 4.8 Service load
Source: `GET /service-tickets/stats` — ticket counts by status (`open`, `in_progress`, `resolved`,
`closed`) plus an active-urgent count.

**Inventory is deliberately excluded.** Stock endpoints exist, but an owner does not open a
business overview to check warehouse levels. Leaving it out is the decision.

---

## 5. Settled behaviour

### 5.1 Who sees the switch
A new permission code, `dashboard.business.view`, gates it. Admins and superadmins pass
automatically — they bypass permission checks throughout this app rather than holding grants — so
"admin/superadmin, or anyone explicitly granted it" is exactly what this produces.

Someone without it sees today's dashboard, unchanged, with **no switch at all**. Not greyed out,
not locked — absent. This mode reads the whole organisation's money, so advertising it to all 40
staff would invite the wrong conversation.

### 5.2 Date range
**One range control for the whole mode.** It drives §4.1 through §4.6.

**§4.7 does not follow it.** The aging endpoint takes no date parameter — ageing is computed
against today by definition. So that panel carries its own permanent "as of today" label. Do not
hide this asymmetry behind a global control that appears to apply to it; the panel must visibly
own its own timeframe.

Default range when the page opens: **the current calendar month**, matching what the API returns
when given no dates.

### 5.3 Money is gated separately inside the mode
The finance panels (§4.1 money figures, §4.2, §4.7) additionally require the existing
`finance.view` permission. Someone with business access but not finance access sees the sales,
delivery and service content, and the money panels are **absent** — not blurred, not placeholder.
The layout closes up around them.

This matters because a sales manager may legitimately hold business access without seeing
organisation-wide cash.

### 5.4 Every number leads somewhere
Each figure has an existing detail screen. Clicking through goes to it:

| From | To |
|---|---|
| Cash, revenue, spend | `/finance` |
| Outstanding, aging, a customer's debt | `/finance/receivables` |
| Funnel, leaderboard, sales trend | `/pipeline` |
| Installations | `/projects` |
| Tickets | `/service` |

`/pipeline` remains as the sales deep-dive with its own filters. Business mode summarises and
links; it does not replace it.

### 5.5 Failure and emptiness
- **A section whose data fails shows a retry in place**, and every other section still renders.
  The page never blanks because one call failed. This is how My Work mode already behaves.
- **Thin data shows the real, small numbers** — never a placeholder or a fake trend. A young
  organisation with three projects and one salesperson sees three projects and one salesperson.
- **A genuinely empty section shows one quiet sentence**, no icon, no illustration.

---

## 6. What does not exist — do not design for it

- **No org-wide project analytics.** Project analytics is per-project only. Portfolio-level
  project health would have to be built from nothing.
- **No targets or budgets anywhere.** Nothing to compare actuals against. "% to target",
  progress-to-goal rings and similar cannot be built.
- **No org-level profit or margin.** Per-quote profitability exists behind its own permission;
  there is no organisation-wide margin figure.
- **Milestones are a string on tasks, not an entity.** There is no milestone table to group or
  chart by, and a milestone with no tasks does not exist.
- **`progressPercentage` on a project is hand-maintained and goes stale.** Not usable.
- **Quotes never expire on their own.** The job that would mark them expired is never called, so
  a chart reading expired status shows zero for ever. Expiry is derived from `valid_until`.
- **No "last worked on" signal on service tickets.** "Stalled ticket" cannot be computed.
- ~~**No period-over-period comparison is provided by any endpoint.**~~ **WRONG — corrected
  2026-08-22 after the design was built.** `GET /analytics/sales-pipeline/stats` returns
  `trendVsPreviousPeriod` for all four health metrics: `totalPipelineValue`, `avgDealSize`,
  `winRate`, `avgSalesCycleDays`. Comparison IS available for those four and should be shown.
  It is still unavailable for finance and service figures — no finance or ticket endpoint
  returns a prior-period value.

---

## 7. Constraints

- **Web only.** Confirmed by the owner. No mobile or responsive design. A narrow window should
  stay usable and that is the whole responsive story.
- Sits inside the existing shell: 48px top header, 48px icon rail, 200px collapsible panel.
  Content area is roughly **1192px** wide.
- Charts are **recharts**. An ordered, colourblind-safe palette already exists at
  `apps/web/lib/charts/palette.ts`, derived from the design tokens and guarded by a sync test.
- Design-system tokens only. No hard-coded colour values.
- Numbers are read across the room: money and counts should be legible at a glance and
  reconcilable against the detail screens they link to.

---

## 8. Already built — reuse, do not redraw

A full pipeline feature ships at `apps/web/components/features/pipeline/`:

- `sales-funnel-chart.tsx` and a `funnel-disc-stack/` SVG treatment
- `pipeline-trend-chart.tsx`
- `pipeline-stats-cards.tsx`
- `stage-conversion-panel.tsx`
- `salesperson-leaderboard.tsx`

Assume these exist and work. §4.3, §4.5 and §4.6 are these components placed in a new context. The
design question is what Business mode adds around them.

The existing My Work mode is a two-column grid, cards on a secondary background, no borders and no
dividers between rows, urgency carried by coloured text rather than tinted rows. Business mode
should read as the same product.

---

## 9. What good looks like

Someone opens the dashboard, flips to Business, and within ninety seconds knows whether the month
is going well and what to worry about. Every number could be reconciled against another screen in
the app — and it would match.
