# Business mode — as built

- **Date:** 2026-08-22
- **Status:** Built, walked, committed. **Written after the code, not before it.**
- **Design:** Claude Design project `be6622ba-1ef2-4f60-9994-43ed48cda883` —
  `Business Mode.dc.html` (board), `BusinessScreen.dc.html` (screen)
- **Brief:** `2026-08-22-business-matrix-design-brief.md`
- **Design review:** `2026-08-22-business-matrix-design-review.md`

## Why this document is retroactive

The employee selector shipped the same day through design → spec → plan → build. This feature
went design → build: the owner asked for it in one session and the design brief had already
settled every product decision, so there was nothing left for a spec to decide.

That was a reasonable call and it is also how a feature ends up with no written contract. This
document is the missing half, written from the code rather than from intent. Where it differs
from the design, the code is what shipped and the reason is given.

---

## 1. What it is

A second mode on the dashboard at `/`. The page has two views:

- **My work** — the existing screen. What needs *me* today.
- **Business** — organisation-wide. How the business is doing.

A pill in the page's own control row switches between them. **There is no new route and no URL
parameter.** The mode is a view of this page, not a place, and the address bar never changes.

---

## 2. Decisions, as implemented

| # | Decision | Where it lives |
|---|---|---|
| 1 | New permission `dashboard.business.view` gates the switch | `catalog.ts`, migration `1855600000000` |
| 2 | Money panels additionally need `finance.view` | `business-mode.tsx` — `showMoney` |
| 3 | Mode remembered in `localStorage`, default My work | `dashboard-page.tsx` |
| 4 | Losing the permission falls back to My work, even with `business` stored | `dashboard-page.tsx` — `activeMode` |
| 5 | One query per panel, never one combined call | `business-mode.tsx` |
| 6 | The employee selector and the date range never appear together | `dashboard-page.tsx` owns the header row |
| 7 | No backend endpoint, service or hook was added | — |

Decision 7 is worth stating plainly: **this feature added no API surface.** Every figure comes
from an endpoint that already existed and was already reachable by any authenticated user. What
the permission governs is a place to see them together, not new access.

Decision 4 was verified rather than assumed: with `oneohm-dashboard-mode=business` in storage and
the grant revoked, the page renders My work, leaks no Business content, and fires **zero** finance
requests.

---

## 3. Data contract

Base `/api/v1`. Every one of these predates this feature.

| Panel | Hook | Endpoint | Fields used |
|---|---|---|---|
| Headline band | `useFinanceKpis` | `/finance/kpis` | `netCashflowInRange`, `revenueInRange`, `spendInRange`, `outstandingNow`, `overdueCountNow`, `receiptCountInRange`, `expenseCountInRange`, `meterInstallations`, `unallocatedCredit` |
| Cash flow | `useCashFlow` | `/finance/cash-flow` | `month`, `cashIn`, `cashOut` — grain `day` |
| Sales pipeline | `usePipelineDashboard` | `/analytics/sales-pipeline/dashboard` | `funnel.stages[]`, `lostCount`, `lostValue`, `stats.*`, `stats.trendVsPreviousPeriod.*` |
| Leads vs won | same call | same | `trend.points[]`, `trend.granularity` |
| Salespeople | same call | same | `leaderboard.entries[]` |
| Money owed | `useOrgCustomersAr` + `useOrgOutstanding` | `/finance/customers/ar`, `/finance/outstanding` | five buckets; `daysOverdue`, `customerName`, `projectName`, `outstandingAmount` |
| Service load | `useServiceTicketStats` | `/service-tickets/stats` | `open`, `inProgress`, `resolved`, `closed`, `urgent` |

**Money is rupees, not paise.** The finance service divides by 100 before responding.
`lib/utils/paise.ts` is therefore the wrong helper here and `business/lib/format.ts` exists
instead — it also carries crore, which `formatPaise` does not.

**Two figures are derived, not served, and both are derived in the component that owns the data:**

- **Overdue amount** — `total − notYetDue`, summed from the ageing buckets. `FinanceKpis` has an
  overdue *count* but no overdue *amount*; passing `outstandingNow` in its place labels the entire
  receivable as overdue, which is what the first implementation did.
- **The funnel's "won" stage** — taken as the last stage by position, never by id, so a stage added
  upstream does not silently recolour the wrong bar.

---

## 4. What is on screen, and what is not

Eight blocks, in priority order: headline figures, cash flow, sales funnel, sales health, leads vs
won, salespeople, money owed, service load. Inventory was deliberately excluded — the endpoints
exist, but nobody opens a business overview to check warehouse stock.

Nothing on the screen is invented. There are no targets, no budgets, no org-level margin, no
portfolio project health and no period-over-period comparison outside the four sales figures the
API actually provides one for.

---

## 5. Deviations from the design, and why

Each is commented at the call site.

1. **`text-foreground-tertiary` (#78716C), not the design system's `--text-tertiary` (#A8A29E).**
   `tailwind.config.ts` records that the DS value is 2.52:1 and "would silently fail WCAG AA" for
   the small copy this token carries. Accessibility beat pixel-matching.
2. **The leads/won trend is weekly, not daily.** `SalesPipelineQueryDto` accepts `week | month`
   only. The design's "daily" label was not buildable.
3. **Two columns start at Tailwind's `xl`,** so at exactly 1192px of content the page is single
   column. That is My Work's documented behaviour and matching it beat inventing a breakpoint.
4. **The main column is fluid, not a fixed 736px.** At the shell's content width the fixed value
   left a dead strip on wide windows. The right rail is exactly 384px as designed.
5. **Money is short-form only.** The design offered a Short/Full toggle; it was read as a canvas
   control rather than a product feature. Not built. **Open question, not a closed one.**

---

## 6. Four defects found by walking the screen

None of these were visible from reading the code.

1. **The date range label lied.** It read "1–22 Aug" while `to` was month-end, so the cash flow
   chart drew nine empty future days. The window now ends today.
2. **"Overdue" showed the total owed** — see §3. Now ₹1.16 Cr against a ₹1.87 Cr total.
3. **Money-out bars vanished.** ₹4,175 of payments beside ₹3.93 L of receipts rounds to zero
   pixels on a shared scale, and "no bar" reads as "no payment" — a different and untrue
   statement. Non-zero amounts now draw at least 1.5px.
4. **A fixed main column** left dead space — §5.4.

---

## 7. Verification performed

By walking the running app. No test files were added.

| # | Check | Result |
|---|---|---|
| 1 | Holder of the code sees the switch | Pass — verified with a real non-admin login |
| 2 | Non-holder sees no switch, no leaked content | Pass — and **no** finance requests fire |
| 3 | Stored mode `business` + revoked grant | Pass — falls back to My work, no requests |
| 4 | `finance.view` absent | Pass — cash flow and money owed absent, band refills |
| 5 | All seven panels with `finance.view` | Pass |
| 6 | A failed panel | Pass — retry in place, other six render |
| 7 | Deep link | Pass — lands on `/service` |
| 8 | My Work unchanged | Pass |
| 9 | Mode persists across reload | Pass |

**Measured, not eyeballed:** card radius 24px, shadow `rgba(16,24,40,0.05) 0 2px 8px` (`e2`),
padding `20px 22px 16px`, switch 204×40, right column 384px, cash-flow zero line y=132. All match
the design.

Gates: `typecheck`, `lint`, and 438 tests across 45 suites green. Four of those tests and one
suite are the owner's concurrent milestone work, not this feature.

---

## 8. Known gaps

| # | Gap | Consequence |
|---|---|---|
| 1 | **The young / empty-organisation state was never walked.** | The code has empty states in every panel and the design has an artboard for it, but no thin dataset existed to prove it. Unverified, not suspected broken. |
| 2 | Money format toggle not built (§5.5) | Large figures are always crore/lakh with the exact rupee value beneath the hero only. |
| 3 | No backend gating | Consistent with the app's frontend-only model. These endpoints were already open; this feature does not change that. |
| 4 | Permissions are a login-time JWT snapshot | Not a problem here — nothing on this screen reads permissions server-side. Unlike the employee selector, there is no gate that can go stale. |

## 9. The data itself looks wrong, and that is upstream

Walking the screen against the live database produced figures worth questioning before anyone
treats this page as truth:

- **Win rate 100%, 0 lost** — nothing is ever marked lost
- **Sales cycle 0 days** — every won deal closes the day it opens
- **Quote Sent → Won at 100%** — 19 qualified, 19 quoted
- **0 installations** in the period, against 216 overdue milestones

Business mode reports these faithfully. If they are wrong they are wrong in the sales-pipeline SQL
and the task-completion dating, not in this feature — but this feature is what will make them
visible to the owner.
