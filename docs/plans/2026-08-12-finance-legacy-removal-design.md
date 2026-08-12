# Finance: defect fixes and legacy payment-stack removal

**Date:** 2026-08-12
**Status:** Design approved, awaiting implementation plan
**Origin:** End-to-end payment-journey QA run, 2026-08-12

## Problem

The append-only ledger rebuild shipped, and the legacy money modules were correctly unmounted in
`app.module.ts` — `PaymentsModule`, `PaymentTermsModule` and `ProjectExpensesModule` all return 404.
That unmounting deliberately killed the non-transactional `PATCH/DELETE /payments` writes which
caused the original `paid_amount` desync.

**The read path escaped that retirement.** `FinanceModule` imports no entities; instead
`finance-aggregation.service.ts` reaches the legacy tables through raw `dataSource.query(sql)`, which
unmounting cannot prevent. Seven of eleven finance endpoints therefore still read a deliberately
frozen rollback artefact and serve it as live data.

Because project conversion now writes `payment_milestones` rather than `project_payment_terms`,
**every project created since cutover is invisible to those endpoints**. Verified end to end: a
customer owing ₹9,715.66 rendered as `OUTSTANDING ₹0 · All settled · OPEN TERMS 0` on their own
Finance tab.

Five further defects were found in the same run (D2–D6 below).

## Goals

1. Every customer-facing money figure derives from the ledger.
2. The legacy modules, their tables and their dead web hooks are gone.
3. The five smaller defects are fixed.
4. No irreversible step happens before the reversible ones are proven.

## Non-goals

- Building a refund path (D3 is resolved by correcting the copy; refunds are a separate future piece).
- Backfilling the 44 projects that drift 1 paise (exposure is under ₹1 in total).
- Diagnosing the 12 large-drift projects. This design makes them **fail loudly** at conversion; the
  root cause is separate work.
- Touching `organization_id`, RBAC, TDS or GST — all out of scope per standing decisions.

## Key facts established before designing

| Fact | Value | Consequence |
|---|---|---|
| Legacy↔ledger reconciliation | 204 payments = ₹1,84,11,280.00 ↔ 204 ledger entries, same total, **zero drift** | The archive is genuinely redundant |
| Endpoints with zero UI consumers | 5 of 7 | Delete rather than migrate |
| Endpoints with live consumers | `customers/ar` (3 components), `outstanding` (1) | Only these need rewriting |
| External imports of legacy modules | **none** | 50 files / 4,522 lines delete cleanly |
| Due-date coverage | ledger **121** vs legacy **2** | Moving AR to the ledger improves aging |
| FK blocking a drop | `expense_product_links.expense_id → project_expenses` | Drop that table too |
| Views depending on legacy tables | none | `DROP` will not cascade into the ledger |
| Provenance links | 204 entries carry `source_table='payments'` + `source_id` | Dump before dropping |

## Design

### Phase 1 — Defect fixes

Independent of everything else and individually shippable.

**D4 — reversal reason lost on org-wide surfaces.** `LEDGER_PAGE_SQL` selects `reverses_id` but not
`reversal_reason`, so `/finance/entries` omits it and the UI falls back to the literal `'correction'`.
Add `e.reversal_reason AS "reversalReason"` to the projection and the field to the response DTO. The
web already renders `entry.reversalReason ?? 'correction'`; no UI change.

**D5 — quote preview overstates the total.** The create-screen preview rounds each pricing component
to whole rupees then sums them, producing ₹1,62,717 where `finalPrice` is `162715.66`. Render
`pricing.finalPrice` directly, formatted once. The saved contract and the quote detail page are
already correct.

**D6 — blocked submits give no reason.** Future value date, zero amount, blank "Specify category" and
over-30-character category all correctly disable submit, but silently. Surface inline messages using
the existing `error={...}` prop pattern already used by the category field.

**D3 — refunds promised but absent.** `refund` and `write_off` are declared in `LedgerEntryType` and
advertised in the API response enum, with no endpoint, service, UI or rows. Remove the clause
"and can be refunded until then" from `project-money-tab.tsx:136`. Leave the type union alone — it
is harmless and refunds are wanted eventually.

**D2 — milestone schedule drops the rounding remainder.** `resolveAmounts` returns the explicit
amounts path unreconciled whenever the quote supplies amounts, which it always does; the
remainder-to-final rule exists only on the percentage path below it and is never reached.

Reconcile the explicit path against `contractPaise` and place the difference on the final milestone —
but only when the difference is rounding-sized. Tolerance is **one paise per milestone**: each
2-decimal truncation loses under one paise, so N milestones lose under N. Anything larger is not
rounding and must throw rather than be silently absorbed.

The observed data supports this with five orders of magnitude of margin:

```
drift = 1 paise           44 projects   ← absorb
drift ≥ 273,999 paise     12 projects   ← throw
                          (nothing in between)
```

This is a deliberate behaviour change: conversions that currently succeed quietly for the 12
large-drift shapes will begin failing loudly. That is the intent — it converts silent money
corruption into a visible error at the moment of conversion.

### Phase 2 — Cut the archive off the UI (resolves D1)

**Delete outright**, with their DTOs, service methods, web hooks and query keys:

| Endpoint | Hook |
|---|---|
| `/finance/dashboard` | `useOrgFinanceDashboard` |
| `/finance/receipts` | `useOrgReceipts` |
| `/finance/expenses` | `useOrgExpenses` |
| `/finance/vendors/spend` | `useOrgVendorsSpend` |
| `/finance/projects/profitability` | `useOrgProfitability` |

All five have zero UI consumers. Migrating queries nobody calls is wasted work, and `/dashboard` is
the endpoint disagreeing with `/kpis` by ₹1.11 crore — deleting it removes the contradiction.

**Rewrite two** against `v_milestone_balance` + `ledger_entries`, preserving DTO shapes exactly so
the three consuming components — `customer-detail-page.tsx`, `overview-tab.tsx` and `finance-tab.tsx`,
the last consuming both hooks — need no changes:

- `/finance/customers/ar` → `CustomerAgingDto`: `customerId`, `customerName`, `customerPhone`,
  `customerEmail`, `totalOutstanding`, `current`, `bucket0to30`, `bucket31to60`, `bucket61to90`,
  `bucket90plus`, `lastReceiptDate`, `openTermCount`. Buckets come from `v.days_overdue` using the
  existing `AGING_BUCKETS` boundaries; `lastReceiptDate` from `ledger_entries` where `direction='in'`
  and `reverses_id IS NULL`.
- `/finance/outstanding` → `OutstandingTermDto`: one row per active milestone with
  `balance_paise > 0`. `id` = milestone id, `expectedAmount` = expected, `paidAmount` = allocated,
  `outstandingAmount` = balance, `status` mapped from `derived_status` to `PaymentTermStatus`
  (`pending|partial|paid|waived`; `cancelled` is never emitted).

`finance-aggregation.service.ts` is then empty and is deleted.

**Gate: differential oracle.** For the 219 pre-cutover projects, legacy AR and the new ledger AR are
computed from the same underlying money and should broadly agree. Run both, diff row by row, and
investigate every discrepancy before deleting anything. This catches a bad join or an off-by-one
bucket boundary while the old query still exists to compare against — and it is only possible before
Phase 4, which is a further reason to defer the drop.

Expected and acceptable divergences, to be confirmed rather than treated as failures:
- projects created after cutover appear only in the ledger result (this is the bug being fixed);
- overdue counts rise substantially, because the ledger has 121 due dates against the legacy 2.

### Phase 3 — Delete legacy code

Remove `modules/payments`, `modules/payment-terms`, `modules/project-expenses` (50 files, 4,522
lines, no external imports); the dead hooks and types in `lib/hooks/resources/finance-org.ts`; and
update the now-stale mount comment in `app.module.ts`.

### Phase 4 — Retire the tables (deferred)

Only after Phases 1–3 have been green for an agreed period.

1. `pg_dump` `payments`, `project_payment_terms`, `project_expenses`, `expense_product_links` to a
   retained artefact.
2. One migration dropping them in FK order: `expense_product_links` → `project_expenses` →
   `project_payment_terms` → `payments`.

Keep `ledger_entries.source_table` and `source_id`. They become dangling references, but they are
honest historical annotation of where each migrated entry came from, and the dump keeps them
resolvable.

## Testing

- **Phase 1:** unit coverage on `resolveAmounts` for the absorb case, the throw case and the
  exact-sum case. `derived-status.spec.ts` and `consumer-contract.spec.ts` must stay green.
- **Phase 2:** the differential oracle above, then re-run the payment journey end to end and assert
  the customer Finance tab shows the correct outstanding — the exact assertion that failed on
  2026-08-12.
- **Phase 3:** typecheck and build; no runtime behaviour should change at all.
- **Phase 4:** confirm the dump restores, then confirm the app is fully functional with the tables
  absent.

## Risks

| Risk | Mitigation |
|---|---|
| New AR query subtly wrong | Differential oracle against the legacy query before deletion |
| Dropping the rollback artefact too early | Phase 4 deferred and separated; dump retained |
| D2 throw fires on a legitimate shape | Tolerance is data-derived with five orders of magnitude of margin |
| Overdue counts jump and look like a regression | Expected — ledger has 121 due dates vs legacy 2; communicate before release |
