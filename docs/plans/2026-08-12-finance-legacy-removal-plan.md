# Finance Defect Fixes and Legacy Payment-Stack Removal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every customer-facing money figure derive from the ledger, fix five further defects found in the 2026-08-12 QA run, and remove the legacy payment stack.

**Architecture:** `finance-aggregation.service.ts` reaches the deliberately-frozen legacy tables through raw `dataSource.query(sql)`, which the module unmounting could not stop. Five of its seven endpoints have no UI consumer and are deleted; the two live ones are rewritten against `v_milestone_balance` + `ledger_entries` preserving their DTO shapes exactly. Legacy code is then deleted, and the table drop is deferred behind a green period so the rollback artefact survives the risky part.

**Tech Stack:** NestJS + TypeORM + Postgres 15 (backend), Next.js + React Query + MUI (web), Nx monorepo, Jest.

## Global Constraints

- Money is **integer paise** everywhere in the ledger. Never use floats for ledger arithmetic.
- Subsidy is **display-only**; the customer owes the gross. Never net it off.
- Expenses never change what the customer owes.
- `JwtAuthGuard` only — do not add permission codes; RBAC is separate upcoming work.
- Do not build on `organization_id`; the app is going single-tenant.
- No TDS/GST invoicing logic.
- `derived-status.spec.ts` and `consumer-contract.spec.ts` must stay green — they freeze the four milestone statuses the consumer app switches on.
- Backend tests run with `npx nx test backend --testPathPatterns=<pattern>`.
- Do **not** drop any legacy table before Task 11, which is explicitly deferred.

---

## File Structure

**Phase 1 — defect fixes**
- Create `apps/backend/src/modules/ledger/domain/schedule.ts` — pure reconciliation of milestone amounts to the contract total.
- Create `apps/backend/src/modules/ledger/domain/schedule.spec.ts`.
- Modify `apps/backend/src/modules/ledger/services/milestone.service.ts` — `resolveAmounts` calls the new domain function.
- Modify `apps/backend/src/modules/finance/services/finance-ledger-queries.sql.ts` — add `reversalReason` to `LEDGER_PAGE_SQL`.
- Modify `apps/backend/src/modules/finance/dto/ledger-query.dto.ts` (response DTO) — add the field.
- Modify `apps/web/components/features/quotes/components/quote-preview-panel.tsx` — round once, not per component.
- Modify `apps/web/components/features/ledger/record-money-dialog.tsx` — inline validation messages.
- Modify `apps/web/components/features/ledger/project-money-tab.tsx` — remove the refund promise.

**Phase 2 — cut the archive off the UI**
- Modify `apps/backend/src/modules/finance/controllers/finance.controller.ts` — delete 5 routes, keep 2 repointed.
- Modify `apps/backend/src/modules/finance/services/finance-ledger-queries.sql.ts` — add `CUSTOMERS_AR_SQL`, `OUTSTANDING_SQL`.
- Modify `apps/backend/src/modules/finance/services/finance-reporting.service.ts` — add `getCustomersAr`, `getOutstanding`.
- Delete `apps/backend/src/modules/finance/services/finance-aggregation.service.ts`.
- Modify `apps/backend/src/modules/finance/dto/` — remove DTOs for deleted endpoints.
- Modify `apps/web/lib/hooks/resources/finance-org.ts` and `index.ts` — remove 5 dead hooks.
- Create `apps/backend/src/database/scripts/ar-differential-oracle.sql` — the safety gate.

**Phase 3 — delete legacy code**
- Delete `apps/backend/src/modules/payments/`, `payment-terms/`, `project-expenses/`.
- Modify `apps/backend/src/app.module.ts` — update the stale mount comment.

**Phase 4 — retire tables (deferred)**
- Create `apps/backend/src/database/migrations/<ts>-DropLegacyPaymentTables.ts`.

---

## Task 1: Reconcile milestone amounts to the contract total (D2)

**Files:**
- Create: `apps/backend/src/modules/ledger/domain/schedule.ts`
- Create: `apps/backend/src/modules/ledger/domain/schedule.spec.ts`
- Modify: `apps/backend/src/modules/ledger/services/milestone.service.ts:422-456`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `reconcileToContract(amounts: number[], contractPaise: number): number[]` exported from `../domain/schedule`, re-exported via `../domain/index`.

**Context.** `resolveAmounts` returns the explicit-amounts path unreconciled. The quote always supplies amounts, so the remainder-to-final rule on the percentage path below it is never reached. Observed drift: 44 projects at exactly 1 paise, 12 projects at 273,999+ paise. Tolerance is one paise per milestone — each 2-decimal truncation loses under one paise, so N milestones lose under N.

- [ ] **Step 1: Write the failing test**

Create `apps/backend/src/modules/ledger/domain/schedule.spec.ts`:

```typescript
import { reconcileToContract } from './schedule';

describe('reconcileToContract', () => {
  it('returns amounts unchanged when they already sum to the contract', () => {
    expect(reconcileToContract([2744073, 19208512, 5488146], 27440731)).toEqual([
      2744073, 19208512, 5488146,
    ]);
  });

  it('puts a one-paise shortfall on the final milestone', () => {
    // The real PRJ-ONEOHM_EPC-2026-0225 case: 90/5/5 of 16271566.
    expect(reconcileToContract([14644409, 813578, 813578], 16271566)).toEqual([
      14644409, 813578, 813579,
    ]);
  });

  it('puts a two-paise shortfall on the final milestone', () => {
    expect(reconcileToContract([100, 100, 100], 302)).toEqual([100, 100, 102]);
  });

  it('absorbs a one-paise overage by reducing the final milestone', () => {
    expect(reconcileToContract([100, 100, 100], 299)).toEqual([100, 100, 99]);
  });

  it('throws when the shortfall exceeds one paise per milestone', () => {
    // 3 milestones tolerate 3 paise; 4 is not rounding.
    expect(() => reconcileToContract([100, 100, 100], 304)).toThrow(
      /differs from the contract by 4 paise/,
    );
  });

  it('throws on the real large-drift shape rather than absorbing it', () => {
    // 273,999 paise = ₹2,739.99 — the smallest of the 12 large drifts.
    expect(() => reconcileToContract([100, 100, 100], 274299)).toThrow(/274199 paise/);
  });

  it('throws when reconciliation would make the final milestone non-positive', () => {
    expect(() => reconcileToContract([100, 100, 2], 299)).toThrow(/non-positive/);
  });

  it('throws on an empty schedule', () => {
    expect(() => reconcileToContract([], 100)).toThrow(/must not be empty/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test backend --testPathPatterns=schedule.spec`
Expected: FAIL — `Cannot find module './schedule'`

- [ ] **Step 3: Write the implementation**

Create `apps/backend/src/modules/ledger/domain/schedule.ts`:

```typescript
/**
 * Reconcile a milestone schedule to the contract total.
 *
 * `splitByPercentage` already puts its remainder on the final milestone, but
 * that path only runs when the quote supplies percentages alone. In practice
 * the quote always supplies explicit rupee amounts, already rounded to two
 * decimals by the payment-terms dialog, so the schedule can miss the contract
 * by a few paise and the project can never be exactly settled.
 *
 * Only a ROUNDING-SIZED difference is absorbed. Each amount is a 2-decimal
 * value, so each can be off by under one paise; N milestones can therefore be
 * off by under N. Anything larger is not rounding — it means the schedule and
 * the signed quote genuinely disagree, and silently moving that money onto the
 * final milestone would hide it. Observed production data separates the two
 * cases by five orders of magnitude: 44 projects drift exactly 1 paise, 12
 * drift 273,999 paise or more, and nothing sits in between.
 */
export function reconcileToContract(amounts: number[], contractPaise: number): number[] {
  if (amounts.length === 0) {
    throw new Error('reconcileToContract: amounts must not be empty');
  }
  for (const a of amounts) {
    if (!Number.isInteger(a)) {
      throw new Error(`reconcileToContract: expected integer paise, got ${a}`);
    }
  }
  if (!Number.isInteger(contractPaise)) {
    throw new Error(`reconcileToContract: contractPaise must be an integer, got ${contractPaise}`);
  }

  const sum = amounts.reduce((a, b) => a + b, 0);
  const diff = contractPaise - sum;
  if (diff === 0) {
    return amounts;
  }

  const tolerance = amounts.length;
  if (Math.abs(diff) > tolerance) {
    throw new Error(
      `reconcileToContract: schedule sums to ${sum} but differs from the contract ` +
        `(${contractPaise}) by ${Math.abs(diff)} paise, which exceeds the ${tolerance}-paise ` +
        `rounding tolerance for ${amounts.length} milestones. This is not a rounding remainder — ` +
        `the schedule and the signed quote disagree.`,
    );
  }

  const reconciled = [...amounts];
  const lastIndex = reconciled.length - 1;
  const adjusted = (reconciled[lastIndex] as number) + diff;
  if (adjusted <= 0) {
    throw new Error(
      `reconcileToContract: adjusting the final milestone by ${diff} would make it ` +
        `non-positive (${adjusted})`,
    );
  }
  reconciled[lastIndex] = adjusted;
  return reconciled;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx nx test backend --testPathPatterns=schedule.spec`
Expected: PASS, 8 tests

- [ ] **Step 5: Export from the domain barrel**

In `apps/backend/src/modules/ledger/domain/index.ts`, add alongside the existing exports:

```typescript
export * from './schedule';
```

- [ ] **Step 6: Wire it into `resolveAmounts`**

In `apps/backend/src/modules/ledger/services/milestone.service.ts`, add to the existing domain import:

```typescript
import { reconcileToContract } from '../domain/schedule';
```

Then replace the explicit-amounts early return (currently lines 433-435):

```typescript
    if (explicit.every((a): a is number => a !== null)) {
      return explicit;
    }
```

with:

```typescript
    if (explicit.every((a): a is number => a !== null)) {
      // The quote's amounts are already rounded to two decimals, so they can
      // miss the contract by a few paise. Without this the project can never
      // be exactly settled — see reconcileToContract.
      return contractPaise && contractPaise > 0
        ? reconcileToContract(explicit, contractPaise)
        : explicit;
    }
```

- [ ] **Step 7: Update the stale comment**

In the same file, the doc comment above `snapshotFromQuoteVersion` (around line 122) claims the guarantee holds via `splitByPercentage`. Replace that bullet:

```
 *  - When amounts come from percentages, `splitByPercentage` puts the
 *    remainder on the final milestone so the schedule sums EXACTLY to the
 *    contract — no perpetual "₹0.01 pending".
```

with:

```
 *  - The schedule always sums EXACTLY to the contract. Percentage-derived
 *    amounts get their remainder from `splitByPercentage`; quote-supplied
 *    amounts are reconciled by `reconcileToContract`, which absorbs a
 *    rounding-sized difference and throws on anything larger.
```

- [ ] **Step 8: Verify the whole ledger suite still passes**

Run: `npx nx test backend --testPathPatterns=ledger`
Expected: PASS, including `derived-status.spec` and `allocation.spec`

- [ ] **Step 9: Commit**

```bash
git add apps/backend/src/modules/ledger/domain/schedule.ts \
        apps/backend/src/modules/ledger/domain/schedule.spec.ts \
        apps/backend/src/modules/ledger/domain/index.ts \
        apps/backend/src/modules/ledger/services/milestone.service.ts
git commit -m "fix(ledger): reconcile milestone schedule to contract total

The explicit-amounts path in resolveAmounts returned quote amounts
unreconciled, so schedules missed the contract by a paise and projects
could never be exactly settled. Absorbs a rounding-sized difference on
the final milestone and throws on anything larger, so the 12 projects
whose schedule genuinely disagrees with their quote now fail loudly."
```

---

## Task 2: Surface the reversal reason on org-wide endpoints (D4)

**Files:**
- Modify: `apps/backend/src/modules/finance/services/finance-ledger-queries.sql.ts` (`LEDGER_PAGE_SQL`, ~line 148)
- Modify: `apps/backend/src/modules/ledger/dto/ledger-response.dto.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `reversalReason?: string | null` on the entry rows returned by `GET /finance/entries`.

**Context.** The reason is stored and returned by `GET /projects/:id/ledger/entries`, but `LEDGER_PAGE_SQL` selects `reverses_id` without `reversal_reason`. The web renders `entry.reversalReason ?? 'correction'`, so the audit note is replaced by the word "correction" on the customer Finance tab and the Finance page.

- [ ] **Step 1: Add the column to the projection**

In `finance-ledger-queries.sql.ts`, inside `LEDGER_PAGE_SQL`, change:

```sql
    e.reverses_id           AS "reversesId",
```

to:

```sql
    e.reverses_id           AS "reversesId",
    e.reversal_reason       AS "reversalReason",
```

- [ ] **Step 2: Add the field to the response DTO**

In `apps/backend/src/modules/ledger/dto/ledger-response.dto.ts`, beside the existing `reversesId` property, add:

```typescript
  @ApiPropertyOptional({ description: 'Why the entry was reversed, when it is a reversal' })
  reversalReason?: string | null;
```

- [ ] **Step 3: Verify against a real reversal**

With the backend running and a valid token in `$T`:

```bash
curl -s -H "Authorization: Bearer $T" \
  "http://localhost:8085/api/v1/finance/entries?direction=in&page=1&limit=20" \
  | python3 -c "import sys,json;[print(r['entryNo'], repr(r.get('reversalReason'))) for r in json.load(sys.stdin)['data'] if r.get('reversesId')]"
```

Expected: each reversal prints its stored reason, not `None`.

- [ ] **Step 4: Confirm the UI picks it up**

Open a customer with a reversed receipt → Finance tab → Recent payments.
Expected: the row reads `Reversal — <the real reason>`, not `Reversal — correction`.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/finance/services/finance-ledger-queries.sql.ts \
        apps/backend/src/modules/ledger/dto/ledger-response.dto.ts
git commit -m "fix(finance): return reversal_reason from the org-wide ledger feed

LEDGER_PAGE_SQL selected reverses_id but not reversal_reason, so every
surface fed by /finance/entries fell back to the literal 'correction'
and lost the audit note reversals exist to preserve."
```

---

## Task 3: Round the quote total once instead of per component (D5)

**Files:**
- Modify: `apps/web/components/features/quotes/components/quote-preview-panel.tsx:200-208, 780-805`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing consumed by later tasks.

**Context.** The preview rounds each pricing component to whole rupees then sums, giving ₹1,62,717 where `finalPrice` is `162715.66`. The quote detail page correctly shows ₹1,62,716. `pricePerWatt` inherits the error.

- [ ] **Step 1: Round the aggregates once**

Replace lines 202-205:

```typescript
  const displayTotalGst = displayGst5 + displayGst18;
  const displayDiscountedBase = Math.round(discounted.discountedBase);
  const displayGrossTotal = displayDiscountedBase + displayTotalGst;
```

with:

```typescript
  // Round the aggregate once. Rounding each component and then summing
  // overstated the total by up to a rupee and disagreed with the quote detail
  // page and the saved contract, which both round the true final price.
  const displayTotalGst = Math.round(discounted.gst5 + discounted.gst18);
  const displayDiscountedBase = Math.round(discounted.discountedBase);
  const displayGrossTotal = Math.round(
    discounted.discountedBase + discounted.gst5 + discounted.gst18,
  );
```

- [ ] **Step 2: Use the shared value in the Total GST row**

Replace the body of the Total GST row (around line 787):

```tsx
                <span>
                  {formatCurrency(Math.round(discounted.gst5) + Math.round(discounted.gst18))}
                </span>
```

with:

```tsx
                <span>{formatCurrency(displayTotalGst)}</span>
```

- [ ] **Step 3: Use the shared value in the Gross Total row**

Replace the body of the Gross Total row (around line 798):

```tsx
                <span>
                  {formatCurrency(
                    Math.round(discounted.discountedBase) +
                      Math.round(discounted.gst5) +
                      Math.round(discounted.gst18),
                  )}
                </span>
```

with:

```tsx
                <span>{formatCurrency(displayGrossTotal)}</span>
```

- [ ] **Step 4: Verify against the known case**

Build a quote: 3 kW, Residential, Single Phase, structure `3 X 6 Feet`, distance 50 km, PM Surya Ghar subsidy on, All DCR. Click Calculate.

Expected: Total GST **₹13,298**, Gross Total **₹1,62,716**, You Pay **₹1,62,716** — all matching the quote detail page and `finalPrice: 162715.66`.
Before this fix they read ₹13,299 / ₹1,62,717 / ₹1,62,717.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/features/quotes/components/quote-preview-panel.tsx
git commit -m "fix(quotes): round the preview total once, not per component

The create-screen preview rounded base and each GST band separately then
summed them, overstating the headline by up to a rupee and disagreeing
with both the quote detail page and the contract actually saved."
```

---

## Task 4: Explain blocked submissions and drop the refund promise (D6, D3)

**Files:**
- Modify: `apps/web/components/features/ledger/record-money-dialog.tsx:111-124` and the amount/date fields
- Modify: `apps/web/components/features/ledger/project-money-tab.tsx:136`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing consumed by later tasks.

**Context.** Future value date, zero amount, blank "Specify category" and over-30-character category all correctly block submit, but the button simply greys out with no reason. The category field already demonstrates the pattern with `error={showCategoryOtherError ? '…' : undefined}`. Separately, the money tab promises refunds that do not exist.

- [ ] **Step 1: Derive the two missing error flags**

In `record-money-dialog.tsx`, immediately after the existing `showCategoryOtherError` block, add:

```typescript
  const showFutureDateError = valueDate > todayIst();
  const showCategoryOtherTooLong =
    !isReceipt && category === CATEGORY_OTHER && categoryOther.trim().length > 30;
```

- [ ] **Step 2: Show the date error**

On the "Date received" / "Date paid" field, add the error prop:

```tsx
  error={showFutureDateError ? 'Pick today or an earlier date — money cannot arrive in the future.' : undefined}
```

- [ ] **Step 3: Extend the category error to cover length**

Replace the existing category error prop:

```tsx
  error={showCategoryOtherError ? 'Please specify the category' : undefined}
```

with:

```tsx
  error={
    showCategoryOtherError
      ? 'Please specify the category'
      : showCategoryOtherTooLong
        ? 'Keep the category to 30 characters or fewer.'
        : undefined
  }
```

- [ ] **Step 4: Remove the refund promise**

In `project-money-tab.tsx:136`, replace:

```
'Everything owed on this project is covered. This sits as credit on the customer’s account: it is applied automatically to the next change order raised here, and can be refunded until then.'
```

with:

```
'Everything owed on this project is covered. This sits as credit on the customer’s account and is applied automatically to the next change order raised here.'
```

- [ ] **Step 5: Verify each case in the browser**

Open a project → Finance → Record payment.
- Set the date to tomorrow → expect the date error text, submit still disabled.
- Set amount to 0 → submit disabled.
- Record expense → category **Other** → leave blank → expect "Please specify the category".
- Type 31 characters → expect "Keep the category to 30 characters or fewer."
- On a project holding credit, confirm the credit note no longer mentions refunds.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/features/ledger/record-money-dialog.tsx \
        apps/web/components/features/ledger/project-money-tab.tsx
git commit -m "fix(ledger): explain blocked submissions; stop promising refunds

Validation correctly blocked future dates, zero amounts and bad
categories but only greyed the button out. Also removes the claim that
credit 'can be refunded', which no endpoint or UI implements."
```

---

## Task 5: Delete the five finance endpoints nobody calls

**Files:**
- Modify: `apps/backend/src/modules/finance/controllers/finance.controller.ts` — remove `dashboard`, `receipts`, `expenses`, `vendors/spend`, `projects/profitability`
- Modify: `apps/backend/src/modules/finance/dto/index.ts` and `dashboard.dto.ts` — remove now-unused DTOs
- Modify: `apps/web/lib/hooks/resources/finance-org.ts` — remove `useOrgFinanceDashboard`, `useOrgReceipts`, `useOrgExpenses`, `useOrgVendorsSpend`, `useOrgProfitability` and their query keys
- Modify: `apps/web/lib/hooks/resources/index.ts` — remove those five exports

**Interfaces:**
- Consumes: nothing.
- Produces: a `finance.controller.ts` with only `kpis`, `cash-flow`, `entries`, `receivables`, `outstanding`, `customers/ar`.

**Context.** These five have zero UI consumers (verified by grep across `components/` and `app/`). `/dashboard` is also the endpoint disagreeing with `/kpis` by ₹1.11 crore, so deleting it removes the contradiction outright. `outstanding` and `customers/ar` stay and are rewritten in Tasks 6-7.

- [ ] **Step 1: Confirm they are still unconsumed before deleting**

```bash
cd apps/web
for h in useOrgFinanceDashboard useOrgReceipts useOrgExpenses useOrgVendorsSpend useOrgProfitability; do
  echo "$h: $(grep -rl "$h" --include='*.tsx' components app | grep -v node_modules | wc -l | tr -d ' ') consumers"
done
```

Expected: all five report `0 consumers`. **If any is non-zero, stop and re-plan** — that component needs a ledger-backed replacement first.

- [ ] **Step 2: Remove the five controller routes**

In `finance.controller.ts`, delete the `@Get('dashboard')`, `@Get('receipts')`, `@Get('expenses')`, `@Get('vendors/spend')` and `@Get('projects/profitability')` handlers together with their decorators and imports. Leave `kpis`, `cash-flow`, `entries`, `receivables`, `outstanding` and `customers/ar`.

- [ ] **Step 3: Remove the five web hooks**

In `apps/web/lib/hooks/resources/finance-org.ts`, delete `useOrgFinanceDashboard`, `useOrgReceipts`, `useOrgExpenses`, `useOrgVendorsSpend` and `useOrgProfitability`, their `orgFinanceKeys` entries, and any types used only by them (`DashboardData`, `OrgReceiptListItem`, `OrgReceiptsFilters`, `VendorSpendDto`, and the profitability types). Remove the same five names from `apps/web/lib/hooks/resources/index.ts`.

- [ ] **Step 4: Typecheck both projects**

Run: `npm run typecheck:backend && npm run typecheck:web`
Expected: PASS. Any error naming a deleted DTO or hook points at a leftover import — remove it.

- [ ] **Step 5: Confirm the routes are gone**

```bash
for p in /finance/dashboard /finance/receipts /finance/expenses /finance/vendors/spend /finance/projects/profitability; do
  printf "%-38s %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $T" "http://localhost:8085/api/v1$p")"
done
```

Expected: all `404`.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/finance apps/web/lib/hooks/resources
git commit -m "refactor(finance): delete five endpoints with no UI consumer

dashboard, receipts, expenses, vendors/spend and projects/profitability
all read the frozen legacy tables and none had a consumer. /dashboard
was also reporting an outstanding figure Rs 1.11 crore adrift from
/kpis; deleting it removes the contradiction rather than migrating it."
```

---

## Task 6: Rewrite `/finance/customers/ar` on the ledger

**Files:**
- Modify: `apps/backend/src/modules/finance/services/finance-ledger-queries.sql.ts` — add `CUSTOMERS_AR_SQL`
- Modify: `apps/backend/src/modules/finance/services/finance-reporting.service.ts` — add `getCustomersAr`
- Modify: `apps/backend/src/modules/finance/controllers/finance.controller.ts` — point the route at the reporting service

**Interfaces:**
- Consumes: `reconcileToContract` is unrelated; nothing from earlier tasks.
- Produces: `FinanceReportingService.getCustomersAr(limit?: number): Promise<CustomerAgingDto[]>`.

**Context.** `CustomerAgingDto` must keep its exact shape — `customerId`, `customerName`, `customerPhone`, `customerEmail`, `totalOutstanding`, `current`, `bucket0to30`, `bucket31to60`, `bucket61to90`, `bucket90plus`, `lastReceiptDate`, `openTermCount` — because `customer-detail-page.tsx`, `overview-tab.tsx` and `finance-tab.tsx` consume it unchanged. Amounts in this DTO are **rupees**, matching the legacy contract. Bucket boundaries come from `AGING_BUCKETS` in `../constants`.

- [ ] **Step 1: Add the query**

Append to `finance-ledger-queries.sql.ts`:

```typescript
/**
 * Customer AR ageing, derived from the ledger.
 *
 * Replaces the `project_payment_terms` version, which could not see any
 * project created after the ledger cutover — a customer owing money rendered
 * as "All settled" on their own Finance tab.
 *
 * Buckets follow AGING_BUCKETS. `days_overdue` is 0 when `due_date` is null,
 * so undated milestones land in `current`, matching the legacy definition.
 * Amounts are returned in RUPEES because CustomerAgingDto is a rupee contract.
 */
export const CUSTOMERS_AR_SQL = `
  WITH open_ms AS (
    SELECT
      cp.id            AS customer_id,
      v.balance_paise,
      v.days_overdue
    FROM v_milestone_balance v
    JOIN projects pr             ON pr.id = v.project_id AND pr.deleted_at IS NULL
    JOIN customer_properties prop ON prop.id = pr.property_id
    JOIN customer_profiles cp     ON cp.id = prop.customer_id AND cp.deleted_at IS NULL
    WHERE v.status = 'active'
      AND v.balance_paise > 0
  ),
  agg AS (
    SELECT
      customer_id,
      SUM(balance_paise)::BIGINT                                                        AS total_paise,
      COUNT(*)::int                                                                     AS open_term_count,
      COALESCE(SUM(balance_paise) FILTER (WHERE days_overdue <= 0), 0)::BIGINT          AS current_paise,
      COALESCE(SUM(balance_paise) FILTER (WHERE days_overdue BETWEEN 1  AND 30), 0)::BIGINT AS b0_30_paise,
      COALESCE(SUM(balance_paise) FILTER (WHERE days_overdue BETWEEN 31 AND 60), 0)::BIGINT AS b31_60_paise,
      COALESCE(SUM(balance_paise) FILTER (WHERE days_overdue BETWEEN 61 AND 90), 0)::BIGINT AS b61_90_paise,
      COALESCE(SUM(balance_paise) FILTER (WHERE days_overdue > 90), 0)::BIGINT          AS b90_plus_paise
    FROM open_ms
    GROUP BY customer_id
  ),
  last_receipt AS (
    SELECT e.customer_id, MAX(e.value_date) AS last_date
    FROM ledger_entries e
    WHERE e.direction = 'in'
      AND e.reverses_id IS NULL
      AND e.customer_id IS NOT NULL
    GROUP BY e.customer_id
  )
  SELECT
    cp.id                                        AS "customerId",
    NULLIF(TRIM(CONCAT_WS(' ', cp.first_name, cp.last_name)), '') AS "customerName",
    cp.phone                                     AS "customerPhone",
    cp.email                                     AS "customerEmail",
    (agg.total_paise    / 100.0)::float8         AS "totalOutstanding",
    (agg.current_paise  / 100.0)::float8         AS "current",
    (agg.b0_30_paise    / 100.0)::float8         AS "bucket0to30",
    (agg.b31_60_paise   / 100.0)::float8         AS "bucket31to60",
    (agg.b61_90_paise   / 100.0)::float8         AS "bucket61to90",
    (agg.b90_plus_paise / 100.0)::float8         AS "bucket90plus",
    lr.last_date                                 AS "lastReceiptDate",
    agg.open_term_count                          AS "openTermCount"
  FROM agg
  JOIN customer_profiles cp ON cp.id = agg.customer_id
  LEFT JOIN last_receipt lr ON lr.customer_id = agg.customer_id
  ORDER BY agg.total_paise DESC
  LIMIT $1
`;
```

- [ ] **Step 2: Add the service method**

In `finance-reporting.service.ts`, add the import and the method:

```typescript
import { CUSTOMERS_AR_SQL } from './finance-ledger-queries.sql';
import { CustomerAgingDto } from '../dto';

  /** Customer AR ageing, derived from the ledger. */
  async getCustomersAr(limit = 500): Promise<CustomerAgingDto[]> {
    const rows = await this.dataSource.query<CustomerAgingDto[]>(CUSTOMERS_AR_SQL, [limit]);
    return rows;
  }
```

- [ ] **Step 3: Repoint the route**

In `finance.controller.ts`, change the `customers/ar` handler body from
`return this.aggregationService.getCustomersAr(query);` to:

```typescript
    return this.reportingService.getCustomersAr(query.limit);
```

- [ ] **Step 4: Verify the shape is unchanged**

```bash
curl -s -H "Authorization: Bearer $T" "http://localhost:8085/api/v1/finance/customers/ar" \
  | python3 -c "import sys,json;d=json.load(sys.stdin);print(sorted(d[0].keys()))"
```

Expected exactly:
`['bucket0to30','bucket31to60','bucket61to90','bucket90plus','current','customerEmail','customerId','customerName','customerPhone','lastReceiptDate','openTermCount','totalOutstanding']`

- [ ] **Step 5: Verify the bug is fixed**

Create a customer → property → quote → accept → project, leave it unpaid, then:

```bash
curl -s -H "Authorization: Bearer $T" "http://localhost:8085/api/v1/finance/customers/ar" \
  | python3 -c "import sys,json;print([r for r in json.load(sys.stdin) if 'ZZQA' in (r['customerName'] or '')])"
```

Expected: the customer appears with `totalOutstanding` matching the project's `outstandingPaise / 100`.
Before this change they were absent entirely.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/finance
git commit -m "fix(finance): derive customer AR from the ledger

/customers/ar read project_payment_terms, which no project created after
the ledger cutover writes to, so customers owing money rendered as
'All settled' on their own Finance tab. DTO shape is unchanged."
```

---

## Task 7: Rewrite `/finance/outstanding` on the ledger

**Files:**
- Modify: `apps/backend/src/modules/finance/services/finance-ledger-queries.sql.ts` — add `OUTSTANDING_SQL` and `OUTSTANDING_COUNT_SQL`
- Modify: `apps/backend/src/modules/finance/services/finance-reporting.service.ts` — add `getOutstanding`
- Modify: `apps/backend/src/modules/finance/controllers/finance.controller.ts` — repoint the route

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `FinanceReportingService.getOutstanding(params: { page: number; limit: number }): Promise<PaginatedResponse<OutstandingTermDto>>`.

**Context.** `OutstandingTermDto` keeps its exact shape: `id`, `projectId`, `projectNumber`, `projectName`, `customerId`, `customerName`, `stage`, `name`, `dueDate`, `expectedAmount`, `paidAmount`, `outstandingAmount`, `status`, `daysOverdue`, `agingBucket`, `createdAt`. `finance-tab.tsx` consumes it unchanged. `status` maps from the view's `derived_status`; `cancelled` is never emitted.

- [ ] **Step 1: Add the queries**

Append to `finance-ledger-queries.sql.ts`:

```typescript
/**
 * Open payment terms, derived from the ledger.
 *
 * Shapes rows as OutstandingTermDto so the customer Finance tab needs no
 * change. `status` is the view's derived status — the row itself only ever
 * stores `active | waived`, and `cancelled` is never emitted.
 * Amounts are RUPEES to match the DTO contract.
 */
export const OUTSTANDING_SQL = `
  SELECT
    v.milestone_id    AS "id",
    v.project_id      AS "projectId",
    pr.project_number AS "projectNumber",
    pr.name           AS "projectName",
    cp.id             AS "customerId",
    NULLIF(TRIM(CONCAT_WS(' ', cp.first_name, cp.last_name)), '') AS "customerName",
    v.stage,
    v.name,
    to_char(v.due_date, 'YYYY-MM-DD')      AS "dueDate",
    (v.expected_paise  / 100.0)::float8    AS "expectedAmount",
    (v.allocated_paise / 100.0)::float8    AS "paidAmount",
    (v.balance_paise   / 100.0)::float8    AS "outstandingAmount",
    v.derived_status                       AS "status",
    v.days_overdue                         AS "daysOverdue",
    CASE
      WHEN v.days_overdue <= 0            THEN 'current'
      WHEN v.days_overdue BETWEEN 1  AND 30 THEN '0-30'
      WHEN v.days_overdue BETWEEN 31 AND 60 THEN '31-60'
      WHEN v.days_overdue BETWEEN 61 AND 90 THEN '61-90'
      ELSE '90+'
    END                                    AS "agingBucket",
    -- v_milestone_balance does NOT expose created_at (its columns are
    -- milestone_id, project_id, display_order, name, stage, status,
    -- payer_type, due_date, expected_paise, allocated_paise, balance_paise,
    -- over_allocated_paise, derived_status, days_overdue, entry_count), so the
    -- DTO's createdAt comes from the milestone row itself.
    pm.created_at                          AS "createdAt"
  FROM v_milestone_balance v
  JOIN payment_milestones pm    ON pm.id = v.milestone_id
  JOIN projects pr              ON pr.id = v.project_id AND pr.deleted_at IS NULL
  LEFT JOIN customer_properties prop ON prop.id = pr.property_id
  LEFT JOIN customer_profiles cp     ON cp.id = prop.customer_id
  WHERE v.status = 'active'
    AND v.balance_paise > 0
  ORDER BY v.days_overdue DESC, v.due_date NULLS LAST, pr.project_number
  LIMIT $1 OFFSET $2
`;

export const OUTSTANDING_COUNT_SQL = `
  SELECT COUNT(*)::int AS count
  FROM v_milestone_balance v
  JOIN projects pr ON pr.id = v.project_id AND pr.deleted_at IS NULL
  WHERE v.status = 'active' AND v.balance_paise > 0
`;
```

- [ ] **Step 2: Add the service method**

In `finance-reporting.service.ts`, add the imports first — `finance-reporting.service.ts` does not
yet import `PaginatedResponse`; the deleted `finance-aggregation.service.ts` was the only file in
this module that did:

```typescript
import { type PaginatedResponse } from '@tejas96/shared/types';
import { OUTSTANDING_SQL, OUTSTANDING_COUNT_SQL } from './finance-ledger-queries.sql';
import { OutstandingTermDto } from '../dto';
```

Then, mirroring the existing `getReceivables`:

```typescript
  /** Open payment terms, derived from the ledger. */
  async getOutstanding(params: {
    page: number;
    limit: number;
  }): Promise<PaginatedResponse<OutstandingTermDto>> {
    const { page, limit } = params;
    const [rows, countRows] = await Promise.all([
      this.dataSource.query<OutstandingTermDto[]>(OUTSTANDING_SQL, [limit, (page - 1) * limit]),
      this.dataSource.query<{ count: number }[]>(OUTSTANDING_COUNT_SQL),
    ]);
    const total = Number(countRows[0]?.count ?? 0);
    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }
```

- [ ] **Step 3: Repoint the route**

In `finance.controller.ts`, change the `outstanding` handler to:

```typescript
    return this.reportingService.getOutstanding({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
```

- [ ] **Step 4: Verify shape and content**

```bash
curl -s -H "Authorization: Bearer $T" "http://localhost:8085/api/v1/finance/outstanding?page=1&limit=3" \
  | python3 -c "
import sys,json;d=json.load(sys.stdin)
print('meta:', d['meta']); print('keys:', sorted(d['data'][0].keys()))
print('statuses:', {r['status'] for r in d['data']})"
```

Expected: keys match `OutstandingTermDto`; statuses are drawn from `pending|partial|paid|waived` only.

- [ ] **Step 5: Delete the now-empty aggregation service**

`finance-aggregation.service.ts` has no remaining callers. Delete it and remove it from `finance.module.ts` providers and from the controller's constructor.

Run: `npm run typecheck:backend`
Expected: PASS.

- [ ] **Step 6: Confirm no backend code reads the legacy tables**

```bash
grep -rn "project_payment_terms\|FROM payments\|project_expenses" apps/backend/src --include="*.ts" \
  | grep -v "modules/payments/\|modules/payment-terms/\|modules/project-expenses/\|/migrations/"
```

Expected: **no output.** Any hit is a reader that still has to move.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/modules/finance
git commit -m "fix(finance): derive outstanding terms from the ledger

Repoints /finance/outstanding at v_milestone_balance and removes
finance-aggregation.service.ts, the last reader of the frozen legacy
tables. DTO shape unchanged."
```

---

## Task 8: Differential oracle — prove the new AR agrees with the old

**Files:**
- Create: `apps/backend/src/database/scripts/ar-differential-oracle.sql`

**Interfaces:**
- Consumes: `CUSTOMERS_AR_SQL` from Task 6.
- Produces: a repeatable check; no runtime code.

**Context.** This is the gate before deleting anything. For the 219 pre-cutover projects both models are computed from the same money, so they should broadly agree. Run this **while the legacy tables still exist** — it is impossible after Task 11, which is why the drop is deferred.

Two divergences are expected and correct, not failures:
- post-cutover projects appear only in the ledger result (the bug being fixed);
- overdue totals shift, because the ledger carries 121 due dates against the legacy table's 2.

- [ ] **Step 1: Write the oracle**

Create `apps/backend/src/database/scripts/ar-differential-oracle.sql`:

```sql
-- Compares ledger-derived customer AR against the legacy project_payment_terms
-- version, restricted to projects that existed before the ledger cutover.
-- Run BEFORE dropping the legacy tables. Any row output is a discrepancy to
-- explain; an empty result is a pass.
\set cutover '2026-07-29'

WITH legacy AS (
  SELECT prop.customer_id,
         SUM(t.expected_amount - t.paid_amount)::numeric(14,2) AS outstanding
  FROM project_payment_terms t
  JOIN projects pr              ON pr.id = t.project_id AND pr.deleted_at IS NULL
  JOIN customer_properties prop ON prop.id = pr.property_id
  WHERE t.deleted_at IS NULL
    AND t.status NOT IN ('waived','cancelled')
    AND t.expected_amount > t.paid_amount
    AND pr.created_at < :'cutover'::date
  GROUP BY prop.customer_id
),
ledger AS (
  SELECT prop.customer_id,
         (SUM(v.balance_paise) / 100.0)::numeric(14,2) AS outstanding
  FROM v_milestone_balance v
  JOIN projects pr              ON pr.id = v.project_id AND pr.deleted_at IS NULL
  JOIN customer_properties prop ON prop.id = pr.property_id
  WHERE v.status = 'active'
    AND v.balance_paise > 0
    AND pr.created_at < :'cutover'::date
  GROUP BY prop.customer_id
)
SELECT
  COALESCE(l.customer_id, g.customer_id) AS customer_id,
  l.outstanding AS legacy_outstanding,
  g.outstanding AS ledger_outstanding,
  COALESCE(g.outstanding,0) - COALESCE(l.outstanding,0) AS diff
FROM legacy l
FULL OUTER JOIN ledger g ON g.customer_id = l.customer_id
WHERE ABS(COALESCE(g.outstanding,0) - COALESCE(l.outstanding,0)) > 1.00
ORDER BY ABS(COALESCE(g.outstanding,0) - COALESCE(l.outstanding,0)) DESC;
```

- [ ] **Step 2: Run it**

```bash
docker exec -i oneohm-postgres psql -U root -d oneohm_epc \
  < apps/backend/src/database/scripts/ar-differential-oracle.sql
```

- [ ] **Step 3: Judge the result**

- **Zero rows** → pass. Proceed.
- **Rows present** → investigate each before continuing. Likely causes, in order: the milestone backfill genuinely redistributed money the legacy terms never reflected (expected for the 114 known projects — cross-check against the migration's before/after CSV); a wrong join in `CUSTOMERS_AR_SQL`; a bucket boundary off by one.

**Do not proceed to Task 9 until every row is explained.** Record the explanation in the commit message.

- [ ] **Step 4: Commit the oracle**

```bash
git add apps/backend/src/database/scripts/ar-differential-oracle.sql
git commit -m "test(finance): add AR differential oracle for the ledger cutover

Compares ledger-derived customer AR against the legacy terms for
pre-cutover projects. Must be run before the legacy tables are dropped."
```

---

## Task 9: End-to-end re-verification of the payment journey

**Files:** none — verification only.

**Interfaces:**
- Consumes: Tasks 1-8.
- Produces: confidence to delete code.

**Context.** Re-runs the assertions that failed on 2026-08-12, on the fixed system.

- [ ] **Step 1: Capture a baseline**

```bash
curl -s -H "Authorization: Bearer $T" http://localhost:8085/api/v1/finance/kpis | tee /tmp/kpis-before.json
```

- [ ] **Step 2: Walk the journey in the UI**

Create customer → property → quote → **Mark as sent** (not WhatsApp) → Accept → Convert to Project.

Assert at each step: quote goes `draft → sent → accepted`; project is `active`; milestones are all `pending`; **the project's Contract equals the quote's You Pay exactly** (this is Task 1's fix — before it they differed by a paise).

- [ ] **Step 3: Record payments covering the allocation rules**

Record, in order: a partial payment; one that exactly completes a milestone; one that spills across two; one that overpays the contract. After each, check the project Money tab.

Assert: statuses move `pending → partial → paid`; the overpayment surfaces as unapplied credit rather than landing on the last milestone; `Σ allocations + credit = received`.

- [ ] **Step 4: Assert the D1 fix on every surface**

With the project still owing money, confirm all of these agree:

| Surface | Expectation |
|---|---|
| Project → Finance | Outstanding = contract − allocated |
| Property → Finance | same figure |
| Customer → Finance | **same figure — not ₹0** |
| Customer header / Overview | **same figure — not ₹0** |
| Finance → Cash | Outstanding rises by that amount |
| Finance → Receivables | milestone listed with the right balance |

- [ ] **Step 5: Assert D4 and D2**

Reverse a receipt with the reason "Cheque bounced — QA". On the customer Finance tab the row must read `Reversal — Cheque bounced — QA`, not `Reversal — correction`.

Confirm the project's milestone sum equals its contract exactly:

```bash
docker exec oneohm-postgres psql -U root -d oneohm_epc -c "
with m as (select project_id, sum(amount_paise) s from payment_milestones where source='quote_snapshot' group by project_id)
select p.project_number, round(qv.final_price*100)::bigint - m.s as drift
from projects p join m on m.project_id=p.id
join quote_versions qv on qv.id=p.contract_quote_version_id
where p.created_at > now() - interval '1 hour';"
```

Expected: `drift = 0`.

- [ ] **Step 6: Reconcile globally, then clean up**

Confirm every KPI moved by exactly the amount recorded, then hard-delete the test data. Substitute
the test customer's id for `:CID`. Note that `ledger_entries`, `ledger_allocations` **and**
`payment_milestones` all carry triggers — disabling only `ledger_entries` fails on the allocations
delete:

```sql
BEGIN;
CREATE TEMP TABLE t_proj AS SELECT id FROM projects WHERE property_id IN
  (SELECT id FROM customer_properties WHERE customer_id = :'CID');
CREATE TEMP TABLE t_prop AS SELECT id FROM customer_properties WHERE customer_id = :'CID';
CREATE TEMP TABLE t_quote AS SELECT id FROM quotes WHERE customer_id = :'CID';

ALTER TABLE ledger_entries     DISABLE TRIGGER USER;
ALTER TABLE ledger_allocations DISABLE TRIGGER USER;
ALTER TABLE payment_milestones DISABLE TRIGGER USER;

DELETE FROM ledger_allocations  WHERE project_id IN (SELECT id FROM t_proj);
DELETE FROM ledger_entries      WHERE project_id IN (SELECT id FROM t_proj);
DELETE FROM payment_milestones  WHERE project_id IN (SELECT id FROM t_proj);

ALTER TABLE ledger_entries     ENABLE TRIGGER USER;
ALTER TABLE ledger_allocations ENABLE TRIGGER USER;
ALTER TABLE payment_milestones ENABLE TRIGGER USER;

DELETE FROM documents            WHERE property_id IN (SELECT id FROM t_prop);
DELETE FROM project_tasks        WHERE project_id  IN (SELECT id FROM t_proj);
DELETE FROM project_team_members WHERE project_id  IN (SELECT id FROM t_proj);
DELETE FROM project_materials    WHERE project_id  IN (SELECT id FROM t_proj);
DELETE FROM projects             WHERE id          IN (SELECT id FROM t_proj);
DELETE FROM quote_versions       WHERE quote_id    IN (SELECT id FROM t_quote);
DELETE FROM quotes               WHERE id          IN (SELECT id FROM t_quote);
DELETE FROM followups            WHERE customer_id = :'CID'
                                    OR property_id IN (SELECT id FROM t_prop);
DELETE FROM notifications        WHERE metadata->>'propertyId' IN (SELECT id::text FROM t_prop);
DELETE FROM customer_properties  WHERE customer_id = :'CID';
DELETE FROM customer_profiles    WHERE id = :'CID';
COMMIT;
```

If any statement errors the whole transaction rolls back, leaving nothing half-deleted — fix the
cause and re-run.

No deletes are needed against `payments`, `project_payment_terms` or `project_expenses`: a project
created after the ledger cutover never writes to them.

Re-run the KPI call and diff against `/tmp/kpis-before.json`. Expected: identical.

Then confirm the guard is live again:

```bash
docker exec oneohm-postgres psql -U root -d oneohm_epc \
  -c "delete from ledger_entries where entry_no='<any existing>';"
```

Expected: `ERROR: ledger is append-only`.

---

## Task 10: Delete the legacy modules

**Files:**
- Delete: `apps/backend/src/modules/payments/` (18 files)
- Delete: `apps/backend/src/modules/payment-terms/` (15 files)
- Delete: `apps/backend/src/modules/project-expenses/` (17 files)
- Modify: `apps/backend/src/app.module.ts:77-86`

**Interfaces:**
- Consumes: Tasks 5-9 (nothing reads these).
- Produces: nothing.

**Context.** Already unmounted; verified to have zero imports outside their own directories. 4,522 lines.

- [ ] **Step 1: Re-confirm zero external imports**

```bash
grep -rn "modules/payments\|modules/payment-terms\|modules/project-expenses\|PaymentEntity\|PaymentTermEntity\|ProjectExpenseEntity" \
  apps/backend/src --include="*.ts" \
  | grep -vE "^apps/backend/src/modules/(payments|payment-terms|project-expenses)/"
```

Expected: no output. **If anything appears, stop and resolve it first.**

- [ ] **Step 2: Delete the directories**

```bash
git rm -r apps/backend/src/modules/payments \
          apps/backend/src/modules/payment-terms \
          apps/backend/src/modules/project-expenses
```

- [ ] **Step 3: Update the stale mount comment**

In `app.module.ts`, replace the comment block at lines 77-86 with:

```typescript
    // The ledger is the only money module. The legacy PaymentsModule,
    // PaymentTermsModule and ProjectExpensesModule were unmounted at cutover
    // and their code has now been deleted. The `payments`,
    // `project_payment_terms`, `project_expenses` and `expense_product_links`
    // TABLES are still present as the rollback artefact — nothing reads them.
    // They are dropped by a separate migration once cutover has been green
    // for an agreed period. See
    // docs/plans/2026-08-12-finance-legacy-removal-design.md
```

- [ ] **Step 4: Typecheck and build**

Run: `npm run typecheck:backend && npx nx build backend`
Expected: PASS.

- [ ] **Step 5: Run the full backend suite**

Run: `npx nx test backend`
Expected: PASS. Specs living inside the deleted directories go with them; no spec outside should reference them.

- [ ] **Step 6: Smoke-test the app**

Start the backend and load Finance, a customer's Finance tab, and a project's Finance tab.
Expected: all render with correct figures; no 500s in the log.

- [ ] **Step 7: Commit**

```bash
git commit -am "refactor: delete the legacy payment modules

PaymentsModule, PaymentTermsModule and ProjectExpensesModule were
unmounted at the ledger cutover and, as of the previous commits, have no
readers. 50 files, 4,522 lines. The underlying tables are retained as
the rollback artefact and dropped separately."
```

---

## Task 11: Drop the legacy tables — DEFERRED

> **Do not run this task with the others.** It is the only irreversible step. Run it once Tasks 1-10 have been in production and green for the agreed period, and only after Task 8's oracle has passed.

**Files:**
- Create: `apps/backend/src/database/migrations/<timestamp>-DropLegacyPaymentTables.ts`

**Interfaces:**
- Consumes: Tasks 5-10.
- Produces: nothing.

- [ ] **Step 1: Dump the tables first**

```bash
docker exec oneohm-postgres pg_dump -U root -d oneohm_epc \
  -t payments -t project_payment_terms -t project_expenses -t expense_product_links \
  --data-only --column-inserts \
  > legacy-payment-stack-$(date +%Y%m%d).sql
```

Store this outside the repo, with the DB backups. It is what keeps `ledger_entries.source_table='payments'` / `source_id` resolvable after the drop.

- [ ] **Step 2: Confirm the dump is real**

```bash
grep -c "INSERT INTO" legacy-payment-stack-*.sql
```

Expected: at least 743 (204 payments + 539 terms). A near-zero count means the dump failed — **stop**.

- [ ] **Step 3: Write the migration**

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Drops the pre-ledger payment stack.
 *
 * These tables stopped being written at the ledger cutover and were kept as
 * the rollback artefact. Their last readers were removed when
 * finance-aggregation.service.ts was deleted; their modules were deleted after
 * that. Data was dumped to legacy-payment-stack-<date>.sql before this ran.
 *
 * `down` intentionally does not restore data — recreating empty tables would
 * be worse than useless, because the aggregation queries that read them are
 * gone. Restore from the dump if it is ever needed.
 */
export class DropLegacyPaymentTables1855000000000 implements MigrationInterface {
  name = 'DropLegacyPaymentTables1855000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // FK order: expense_product_links references project_expenses.
    await queryRunner.query(`DROP TABLE IF EXISTS expense_product_links`);
    await queryRunner.query(`DROP TABLE IF EXISTS project_expenses`);
    await queryRunner.query(`DROP TABLE IF EXISTS project_payment_terms`);
    await queryRunner.query(`DROP TABLE IF EXISTS payments`);
  }

  public async down(): Promise<void> {
    throw new Error(
      'DropLegacyPaymentTables cannot be reversed automatically. Restore from ' +
        'legacy-payment-stack-<date>.sql.',
    );
  }
}
```

- [ ] **Step 3b: Decide what happens to `scripts/ledger-dry-run.ts`**

Found during Task 7: `apps/backend/src/scripts/ledger-dry-run.ts` reads `payments` and
`project_payment_terms` **by design** — it is the cutover validation harness that compares the two
models. It is not part of the running app, so it did not block Phases 2-3, but it stops working the
moment these tables go.

Pick one and do it in this task, not later:
- **Delete it** — its job finishes when the tables do. Recommended; the comparison it performs is
  meaningless once one side no longer exists.
- **Keep it** — only sensible if it is pointed at a restored copy of the dump.

- [ ] **Step 4: Verify no dependency blocks the drop**

```bash
docker exec oneohm-postgres psql -U root -d oneohm_epc -c "
select tc.table_name, ccu.table_name as references
from information_schema.table_constraints tc
join information_schema.constraint_column_usage ccu on ccu.constraint_name=tc.constraint_name
where tc.constraint_type='FOREIGN KEY'
  and ccu.table_name in ('payments','project_payment_terms','project_expenses')
  and tc.table_name not in ('payments','project_payment_terms','project_expenses','expense_product_links');"
```

Expected: no rows.

- [ ] **Step 5: Run the migration**

Run the project's migration command against local first.
Then confirm the ledger is untouched:

```bash
docker exec oneohm-postgres psql -U root -d oneohm_epc -c "
select count(*) entries from ledger_entries;
select count(*) from information_schema.tables where table_name in
  ('payments','project_payment_terms','project_expenses','expense_product_links');"
```

Expected: entry count unchanged; table count `0`.

- [ ] **Step 6: Full regression**

Run: `npx nx test backend && npm run typecheck:backend`
Then load Finance, customer Finance, property Finance and project Finance in the browser.
Expected: all correct, no 500s.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/database/migrations
git commit -m "chore(db): drop the legacy payment stack

Drops payments, project_payment_terms, project_expenses and
expense_product_links. Unwritten since the ledger cutover, unread since
finance-aggregation.service.ts was deleted. Data dumped to
legacy-payment-stack-<date>.sql before dropping; down() deliberately
throws rather than recreating empty tables."
```

---

## Sequencing

Tasks 1-4 are independent and can ship in any order, or in parallel.
Tasks 5 → 6 → 7 must run in order (Task 7 removes the service Task 5 partially empties).
Task 8 gates Task 10. Task 9 should follow Tasks 1-7.
**Task 11 is deferred and must not be bundled with the rest.**
