# Business Matrix — design review and build notes

- **Date:** 2026-08-22
- **Status:** UX complete, reviewed, corrected, and **re-verified 2026-08-22**. Not yet specced or built.
- **All five findings below were fixed in the design and confirmed against the file.** They are kept
  here as the record of what was wrong and why, not as outstanding work. §9 is done except item 1.
- **Reviews:** Claude Design project `be6622ba-1ef2-4f60-9994-43ed48cda883` ("Solar EPC workload app"),
  files `Business Mode.dc.html` (the board) and `BusinessScreen.dc.html` (the screen, three variants:
  `full`, `no-finance`, `young`).
- **Brief the design was built from:** `docs/superpowers/specs/2026-08-22-business-matrix-design-brief.md`

Read this **with** the brief. The brief says what was asked for; this says what came back, what is
wrong with it, and what to fix before writing the spec.

---

## 1. Verdict

The design is sound and closely follows the brief. All eight content blocks are present, the layout
maths is exact, every design token resolves, and nothing was invented that the data cannot support.

**One blocker**, one **error of mine** that cost a real feature, and three smaller data-sourcing
corrections. Fix all five before the spec is written — each one changes what gets built.

---

## 2. Blocker: the funnel draws stages that do not exist

The design shows **five** funnel stages:

> Lead → Site visit → Survey → Quote sent → Won

`apps/backend/src/modules/analytics/domains/sales-pipeline/constants/sales-pipeline-stages.ts`
defines **four**:

| id | label |
|---|---|
| `leads` | New Leads |
| `qualified` | Qualified |
| `quoted` | Quote Sent |
| `won` | Won |

**"Site visit" and "Survey" are not sales-pipeline stages.** They are real concepts, but they belong
to the *workflow* attention rules on the My Work dashboard (`site_visit_done`, `survey_done` on
`customer_properties`). The sales-pipeline domain aggregates to four stages and nothing serves the
other two.

**Consequence:** the funnel loses a row and two labels change. It is the centrepiece of the sales
panel, so this is not cosmetic.

**Also unused, and available:** `SalesPipelineFunnelStageDto` carries optional `negotiationCount`
and `negotiationValue`, and the drill-down stage ids include `negotiation` and `lost`.
`NEGOTIATION_THRESHOLD_DAYS = 7`. Worth considering as a side-metric on the `quoted` stage rather
than a sixth row.

---

## 3. My brief was wrong: period-over-period DOES exist

The brief told the design:

> No period-over-period comparison is provided by any endpoint.

**That is false.** `SalesPipelineStatsResponseDto` returns:

```ts
trendVsPreviousPeriod: {
  totalPipelineValue: SalesPipelineTrendMetricDto;
  avgDealSize:        SalesPipelineTrendMetricDto;
  winRate:            SalesPipelineTrendMetricDto;
  avgSalesCycleDays:  SalesPipelineTrendMetricDto;
}
```

The design believed the brief, deliberately left comparison out, and recorded the reason in its own
notes ("there is no period-over-period comparison anywhere on the screen, because no endpoint
provides one"). So the four **Sales pipeline** health figures are missing an up/down signal that is
already built and served.

**Fix:** show `trendVsPreviousPeriod` on those four figures. The brief has been corrected.

**Still genuinely unavailable:** comparison for finance and service figures. No finance or ticket
endpoint returns a prior-period value. Do not add arrows to those.

---

## 4. Three data-sourcing corrections

### 4.1 "231 open deals" is not an API field
Shown as the sub-label under *Pipeline value*. `SalesPipelineStatsResponseDto` has
`totalPipelineValue`, `avgDealSize`, `winRate`, `avgSalesCycleDays` — no open-deal count.

Derivable from the funnel stage counts, but **the definition is a decision**: is it the sum of all
non-won stages? Does it exclude lost? Settle it in the spec and write it down, or drop the
sub-label.

### 4.2 "Oldest debts" is reading the wrong endpoint
The panel shows per-customer rows like *Kadam Enterprises · 118 days old · ₹6,20,000*.

`CustomerAgingDto` (`/finance/customers/ar`) carries `customerId`, `customerName`, `customerPhone`,
`customerEmail`, `totalOutstanding`, `current`, `bucket0to30`, `bucket31to60`, `bucket61to90`,
`bucket90plus`, `lastReceiptDate`, `openTermCount`. **No per-customer age.**

**But the panel is buildable.** `OutstandingTermDto` (`/finance/outstanding`) carries
`daysOverdue` (`Negative = upcoming, positive = overdue, null = no due_date`), plus `customerName`,
`projectName`, `outstandingAmount` and `agingBucket`.

**Fix:** source the buckets from `/customers/ar` and the oldest-debts list from `/finance/outstanding`
sorted by `daysOverdue` desc. Two calls, both honest. Note it is term-level, not customer-level — a
customer with three old terms appears three times unless the query groups them.

### 4.3 "23 invoices" — there are no invoices in this app
`overdueCountNow` counts overdue **payment milestones / terms**. Nothing in this product is called
an invoice. Copy fix, but the wrong noun on a money figure erodes trust in the number next to it.

---

## 5. What passed verification

- **All eight content blocks** from brief §4 are present.
- **Nothing invented.** No targets, no budgets, no org-level margin, no portfolio project health —
  all correctly absent per brief §6.
- **Layout maths is exact:** two columns 736 + 384 with a 24 gap = 1144, plus 24 padding each side
  = **1192px**. Matches the shell's content width.
- **Every token resolves** against `_ds/.../tokens/colors.css`: `--chart-1` … `--chart-8`,
  `--chart-gridline`, `--glow-brand`, `--danger`, `--canvas-sunken`, `--hairline`, `--accent-subtle`,
  `--accent-ink`. No hard-coded hex in the screen.
- **"Average deal · won deals only" is accurate.** Verified against the SQL:
  `COALESCE(AVG(final_price_num) FILTER (WHERE flag_won), 0)` at
  `sales-pipeline-sql.helper.ts:174`.
- **The mode switch swaps the employee selector for the date range** — never both, exactly as
  specified. This was the detail most likely to be missed and it was not.
- **No permission → no pill.** Not greyed, not locked, absent.
- **Retry lives inside the failed panel** and says "Nothing else on this page is affected."
- **The `young` variant is honest** — genuinely zero ageing buckets, a one-line empty state for
  service, one salesperson as simply the only row.

---

## 6. Three things the design added that the brief did not ask for — keep them

1. **The no-finance headline band refills.** Rather than leaving one lonely "installations" figure
   in a full-width band, it swaps in pipeline value, deals won, win rate and active tickets — none
   of which are finance-gated. Pipeline value comes from the sales endpoint, so it survives the
   gate correctly.
2. **Short money with the exact figure beneath.** `₹1.42 Cr` reads across the room; `₹1,42,10,450`
   sits under it in mono so it reconciles against `/finance`. A screen-level toggle switches
   everything to full figures.
3. **Ageing states its own timeframe twice** — an "as of today" chip *and* a sentence saying the
   range above does not apply. The brief asked for this not to be hidden; the design over-delivered.

---

## 7. Implementation gotchas carried forward

These bit the My Work dashboard build. They will bite this one.

1. **`text-danger` does not resolve in Tailwind.** The design uses `var(--danger)`; in the app the
   utility is **`text-error`**. Same value, different name. Also affected: use `text-primary-dark`,
   `text-secondary`, `rounded-xl` — never `text-accent-ink`, `text-link`, `rounded-r-sm`.
2. **Charts must import the shared palette** at `apps/web/lib/charts/palette.ts`, which is derived
   from the design tokens and guarded by `__tests__/tokens-sync.test.ts`. Do not reintroduce
   literals.
3. **`noUncheckedIndexedAccess: true`** — `arr[i].prop` does not compile.
4. **Never return a raw Postgres `date` from `dataSource.query()`.** Use `to_char(col,'YYYY-MM-DD')`.
5. **The backend listens on 8085.** `web:dev` cannot reach a route behind middleware — use
   `npm run web:build`.
6. **Money is paise in the database.** The finance service divides by 100 before returning; the API
   is in rupees. Do not divide twice.
7. **No new test files.** Verify by walking the screen. Existing tests, typecheck and lint stay green.

---

## 8. Permission decisions, still unconfirmed by the owner

Proposed in the brief, reasoned but **not signed off**. Settle these first — they change who the
feature is for.

- **`dashboard.business.view`** — a new code gating the mode switch, following the same shape as
  `dashboard.employees.view` added on 2026-08-22 (catalog entry + migration + admin bypass).
  `pipeline.view` was considered and **rejected**: it means "see the sales funnel", and this mode
  shows organisation-wide cash.
- **`finance.view`** — additionally required for the money panels, so a sales manager can hold
  business access without seeing org-wide cash. This is what the design's `no-finance` variant
  renders.

---

## 9. Status of the six actions

| # | Action | Status |
|---|---|---|
| 1 | Confirm the two permission decisions in §8 | **OPEN — owner sign-off needed** |
| 2 | Funnel corrected to the four real stages | **Done.** New Leads / Qualified / Quote Sent / Won |
| 3 | `trendVsPreviousPeriod` on the four sales health figures | **Done** |
| 4 | "231 open deals" sub-label | **Done** — dropped |
| 5 | Oldest debts re-sourced to term level | **Done** |
| 6 | "invoices" → "milestones" | **Done** |

Re-verified against `BusinessScreen.dc.html` on 2026-08-22. Detail of what landed:

- **Funnel** is four rows with the exact API labels, and conversion percentages are internally
  consistent (92/214 = 43%, 61/92 = 66%, 32/61 = 52%). The "won" row is derived as the last stage
  rather than a hard index, so it survives a stage-list change.
- **Negotiation** appears as a qualifier beneath Quote Sent — "18 in negotiation past 7 days" in
  `--warning` — not as a fifth row.
- **Trend polarity is correct**, which is the easy thing to get wrong: `trend(pct, upGood)` is
  called with `upGood: false` for sales cycle, so a *shorter* cycle renders as a green down-arrow.
- **Oldest debts** is term-level: customer, project, days overdue, amount. The sample data
  deliberately shows one customer twice, which is the honest consequence of term-level rows. The
  note reads "9 milestones past 90 days, across 5 customers".

**Only item 1 blocks the spec.**

### One cosmetic leftover, not worth a round trip

Dropping the "open deals" sub-label left `sub: ""` on the *Pipeline value* tile in the no-finance
headline band. The other three tiles in that band still have sub-lines, so that tile renders an
empty 12.5px row and the band's baselines no longer align. Fix it in implementation — either give
that tile a real sub-line or collapse the empty node.
