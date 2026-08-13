# Payment Approval — End-to-End Verification Results

**Date:** 2026-08-13
**Environment:** local (backend :8085, web :3001, Postgres `oneohm_epc` in `oneohm-postgres`)
**Project used:** `004e1b80-34bb-4202-a7df-6f0e939b1872` (Vinod Gaikwad — 2kW)

## Baseline

```
contract=9777806  received=8800000  outstanding=977806
```

## 1. A pending row moves no figure

Submitted ₹1,000.00 through the **existing** record endpoint
(`POST /projects/:id/ledger/receipts`, reference `E2E-INVARIANT-1`).

| | |
|---|---|
| Response | `201`, `requestNo=PA-2026-27-000001`, `status=pending`, **no `entryNo`** |
| Balance after submit | `contract=9777806 received=8800000 outstanding=977806` — **identical** |
| `ledger_entries` rows for that reference | **0** |

The core promise holds: recording money changes nothing until it is approved.

## 2. Four eyes

| Attempt | Result |
|---|---|
| Approve as the submitter | `403` — *"You submitted this payment — another user must approve it"* |
| Approve as a second user | `201`, `status=approved`, `ledgerEntryId` set, `reviewedBy` = the approver |

In the UI, opening a request you submitted shows no Approve button and no
rejection field — only the explanatory notice.

## 3. Approval posts the money, dated correctly

```
received:    8800000 → 8900000   (+100000, exact)
outstanding:  977806 →  877806   (-100000, exact)

RCP-2026-27-000247 | value_date=2026-08-01 | amount=100000 | created=2026-08-13
```

`value_date` is the **payment** date and `created_at` is today, confirming the
back-dating decision: approval is an audit stamp, not an accounting event.

## 4. Rejection posts nothing

Submitted ₹555.55 (`E2E-REJECT`), rejected with a reason. `ledger_entries` rows
for that reference: **0**.

## 5. Reversal, and the double-reversal guard

Reversing the approved entry returned the balance to exactly
`received=8800000 outstanding=977806`.

A second reversal of the same entry, while one was already queued:

- **Before the fix:** `HTTP 500` — the partial unique index raised a raw Postgres
  error and the user would have seen "Internal server error".
- **After the fix:** `HTTP 409` — *"A reversal of this entry is already awaiting
  approval"*.

## 6. Bulk approve reports per-row outcomes

Three ids in one call — one approvable, one self-submitted, one already approved:

```
approved: 1
failed:  You submitted this payment — another user must approve it
failed:  This request is already approved
```

Two failures did not discard the one that succeeded.

## 7. Impact preview

`GET /payment-approvals/:id/impact` returned
`Installation Complete: 100000 paise, settlesFully=false, unallocated=0`, and the
drawer rendered *"Installation Complete: ₹20.00 — ₹9,624.61 still due"*.

## 8. UI

- `/finance/approvals` renders the queue with live data, status tabs and a
  pending count, and appears in the Finance rail.
- Review drawer shows amount, payment date, reference, the proof warning, the
  impact preview, and disables Reject until a reason is typed.
- Project Finance tab shows **Awaiting approval (2)** above the figures, stating
  the amounts are not counted — and RECEIVED / OUTSTANDING below excluded them.
- The record dialog now reads **"Submit payment received"** with a **"Submit for
  approval"** button and the note that the balance changes only after approval.
- No console errors and every network request `200` on a clean page load.

## Defects found and fixed during verification

1. **The controller had no authentication.** `GET /payment-approvals` returned
   `200` with **no token** — the whole queue, including every customer's payment
   amounts and references, was publicly readable. `JwtAuthGuard` is applied
   per-controller in this codebase (only `ThrottlerGuard` is global) and had been
   omitted. Fixed, and pinned by `payment-approval.controller.spec.ts` so it
   cannot regress silently.
2. **Double-reversal returned HTTP 500** instead of a usable conflict. Now `409`
   with a readable message.
3. **Pagination was off by one.** `AdvancedTable`'s `page` prop is zero-indexed
   (it renders `page + 1`) while the API is one-indexed, producing
   "Showing 26–2 of 2 rows / Page 2 of 1". Fixed.

## Final state

```
backend tests   247 passed, 3 skipped, 24 suites
typecheck       backend 0 errors, web 0 errors
lint            0 errors
balance         restored exactly to baseline
                contract=9777806 received=8800000 outstanding=977806
```

Test data was cleaned up through the feature itself — the approved test receipts
were reversed via submit-and-approve rather than deleted, since `ledger_entries`
is append-only. Leftover pending rows, which never affected a balance, were
removed.
