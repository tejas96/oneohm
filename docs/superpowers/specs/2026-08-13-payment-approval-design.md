# Payment Approval — Design

**Date:** 2026-08-13
**Status:** Approved for planning

## Problem

Money recorded in the project Finance tab hits the ledger immediately. The moment a
user saves a receipt, the customer's outstanding drops and a numbered receipt can be
issued — with nobody having checked that the money actually arrived.

A site engineer reporting "customer paid me ₹50,000 cash" and a verified bank credit
are treated identically. There is no second pair of eyes, and no way to see what has
been claimed but not confirmed.

This design adds a verification step in front of every ledger write, and a screen for
managing the queue.

## Decisions

Settled with the owner during brainstorming. Treat as given.

| Decision | Choice |
|---|---|
| Who may approve | Any authenticated user **except the submitter**. No new permission codes. |
| Scope | Receipts, expenses and reversals — every ledger write. |
| Receipt issuance | Only after approval. |
| Rejection | Terminal. A corrected payment is submitted as a new record. |
| Effective date | The real payment date (`value_date`). Approval is an audit stamp only. |
| Threshold | None. Every amount is approved, regardless of size. |
| Existing entries | Grandfathered as approved. No backfill, no balance movement at deploy. |

### Why approval cannot be a column on `ledger_entries`

`LedgerEntryEntity` is INSERT-only. An append-only trigger (migration `1851000000006`)
rejects `UPDATE` outright, and the entity deliberately omits `@UpdateDateColumn`,
`@DeleteDateColumn` and `@VersionColumn`.

The entity documentation states the reason directly: the ledger carries **no status
machine**, because a status machine is what made `project_payment_terms.paid_amount`
drift in the system this replaced. Sums are net of reversals by arithmetic, not by
filtering on state.

Adding `approval_status` would reverse that decision. It would also require every
consumer — `v_project_balance`, `v_milestone_balance`, `v_milestone_completion`,
`CUSTOMERS_AR_SQL`, `OUTSTANDING_SQL`, `KPIS_SQL`, `RECEIVABLES_SQL` — to remember an
extra filter. The first one to forget silently misstates a customer's balance.

Pending money therefore lives outside the ledger, and approval is the act that inserts
the ledger row.

## Non-goals

- Multi-stage or hierarchical approval chains. One approver, one decision.
- Role-based restriction on who may approve. RBAC is a separate app-wide task; this
  feature must not create permission codes that will be thrown away.
- Approval thresholds by amount.
- Notifications or email/WhatsApp alerts on pending items. The queue and its Age
  column are the surface.
- Adopting `apps/backend/src/modules/approvals/`. That generic engine (templates,
  stages, history) exists but **nothing calls it** — it has never run. Putting the
  money path onto unproven code, with the payload in JSON and therefore unfilterable
  by amount or customer, is a worse trade than a purpose-built table.

## Architecture

One new table holds submitted-but-unverified money. Approval runs a single transaction
that inserts the real ledger entry and its allocations, then stamps the pending row
with the resulting entry id.

```
  submit                approve
Finance tab ──► pending_ledger_entries ──► ledger_entries + ledger_allocations
                        │
                        ├──► rejected  (terminal, reason required)
                        └──► cancelled (terminal, submitter only)
```

Because pending rows live in their own table, every existing balance query is
unchanged. Nothing that reads `ledger_entries` needs to learn about approval.

### Ledger write paths

`LedgerWriteService` is called from exactly one place, `ledger.controller.ts`. That is
the only choke point, and it is the one that changes.

`CreditSweepService` inserts into `ledger_allocations` only — never
`ledger_entries`. It re-assigns already-approved money to newly-created milestones and
creates no money fact, so it is correctly out of scope and stays untouched.

## Data model

New table `pending_ledger_entries`. Unlike the ledger, it is mutable — which is
precisely why it must be a separate table.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `request_no` | varchar(30) unique | Human reference, e.g. `PA-2026-0001`. Minted from a Postgres sequence at INSERT, the same mechanism as `entry_no`. |
| `kind` | varchar(20) | `receipt` \| `expense` \| `reversal` |
| `status` | varchar(20) | `pending` \| `approved` \| `rejected` \| `cancelled` |
| `project_id` | uuid | |
| `customer_id` | uuid null | |
| `entry_type` | varchar(30) | Mirrors `LedgerEntryType` |
| `direction` | varchar(3) | `in` \| `out` |
| `amount_paise` | bigint | Signed, same convention as the ledger |
| `value_date` | date | The real payment date |
| `payment_method` | varchar(50) null | |
| `counterparty` | varchar(255) null | |
| `category` | varchar(30) null | |
| `reference` | varchar(255) null | |
| `notes` | text null | |
| `reverses_entry_id` | uuid null | FK → `ledger_entries`, reversal requests only |
| `reversal_reason` | varchar(500) null | |
| `proof_document_id` | uuid null | The customer's own evidence |
| `submitted_by` | uuid not null | |
| `submitted_at` | timestamptz not null | |
| `reviewed_by` | uuid null | |
| `reviewed_at` | timestamptz null | |
| `rejection_reason` | varchar(500) null | |
| `ledger_entry_id` | uuid null unique | FK → `ledger_entries`, set on approval |
| `created_at` / `updated_at` | timestamptz | |

### Constraints

Enforced in the database, so the rules survive any code path:

- `CHECK (reviewed_by IS NULL OR reviewed_by <> submitted_by)` — four-eyes.
- `CHECK (status <> 'approved' OR ledger_entry_id IS NOT NULL)`
- `CHECK (status <> 'rejected' OR rejection_reason IS NOT NULL)`
- `CHECK (kind <> 'reversal' OR reverses_entry_id IS NOT NULL)`
- `CREATE UNIQUE INDEX … ON pending_ledger_entries (reverses_entry_id) WHERE status = 'pending' AND kind = 'reversal'`
  — prevents two queued reversals of the same entry.

### Indexes

`(status, submitted_at)` for the queue, plus `(project_id)`, `(customer_id)`,
`(submitted_by)`.

## Lifecycle

```
        ┌──────────► approved   inserts ledger entry + allocations
pending ├──────────► rejected   reason required
        └──────────► cancelled  submitter only
```

No transition out of a terminal state. Rejected and cancelled rows are retained as
history; a corrected payment is a new submission.

**Allocation is computed at approval, never at submission.** If two payments sit
pending against one project and allocation were computed at submit time, both could
claim the same milestone. Computing FIFO inside the approval transaction preserves the
existing "no over-allocation by construction" guarantee.

**Approving a reversal** re-reads its target inside the transaction. If that entry has
been reversed since submission, approval fails rather than double-reversing.

## Backend

New module `apps/backend/src/modules/payment-approvals/` containing the entity, DTOs,
service, controller and repository, following the layout of the existing modules.

### Endpoints

```
POST   /api/v1/payment-approvals               submit
GET    /api/v1/payment-approvals               list
GET    /api/v1/payment-approvals/:id
POST   /api/v1/payment-approvals/:id/approve
POST   /api/v1/payment-approvals/:id/reject    { reason }
POST   /api/v1/payment-approvals/:id/cancel    submitter only
POST   /api/v1/payment-approvals/bulk-approve  { ids[] }
GET    /api/v1/payment-approvals/summary       pending count for the nav badge
```

List filters: `status`, `kind`, `projectId`, `customerId`, `dateFrom`, `dateTo`,
`search`, `page`, `limit`. Default order: oldest pending first.

`forbidNonWhitelisted` is active globally, so every query parameter must be declared on
the DTO — an undeclared one fails the request rather than being ignored.

### Changes to existing endpoints

The record endpoints on `ledger.controller.ts` (receipt, expense, reverse) create a
pending row and return it, instead of writing to the ledger. They keep their existing
request DTOs, so validation is unchanged.

This is deliberately a behaviour change rather than a set of parallel endpoints. Any
route that still wrote directly to the ledger would be an unguarded hole through the
control this feature exists to provide.

`LedgerWriteService` is not modified. It becomes callable only from
`PaymentApprovalService.approve()`.

### Bulk approve

Each id is processed in its own transaction and the response reports per-row outcomes,
so eight approvals are not lost because two failed. Rows submitted by the caller are
rejected server-side, not merely hidden by the UI.

## Frontend

### New page `/finance/approvals`

Registered in `lib/config/navigation.ts` as a third item in the finance panel's MONEY
section, after Cash and Receivables, carrying a pending-count badge.

Built from existing components — no new primitives:

| Need | Component |
|---|---|
| Table, filters, search, pagination, bulk actions | `components/shared/advanced-table` |
| Status tabs (Pending / Approved / Rejected / All) | `components/shared/filters/filter-tabs` |
| Review panel | `components/shared/drawers/drill-down-drawer` |
| Status pills | `components/ui` → `MUIStatusChip` |
| Dates, selects, dialogs | `mui-date-range-picker`, `mui-select`, `mui-dialog` |
| Layout and cards | MUI `Card`/`Paper` with Tailwind, matching `finance-receivables-page.tsx` |

`AdvancedTable` already provides server-side pagination, per-column filters, search and
`BulkAction`, and is the pattern used by the customer, quote, project and admin-user
list pages.

Columns: Request #, Payment date, Type, Project, Customer, Amount, Method/Reference,
Submitted by, Age, Status, Review. **Age** is elapsed time since `submitted_at`, shown
only while a row is pending.

### Review drawer

Shows the full payload, the customer's uploaded proof document, and a **milestone
impact preview** — which milestones this payment would settle, computed but not
committed — so the approver sees the consequence before agreeing to it.

Approve is disabled with an explanatory tooltip when the viewer is the submitter.
Reject requires a reason.

### Project finance tab

An "Awaiting approval" block, visually separate and excluded from the Received and
Outstanding figures. The record dialog's action becomes **Submit for approval**, and
the success toast states that the customer's balance updates on approval.

The Receipt action remains hidden until approval, which follows naturally because a
receipt prints `entry_no` and that is minted by the ledger insert.

## Edge cases

**Concurrency**
- Simultaneous approvals: `SELECT … FOR UPDATE` on the pending row plus a status
  re-check inside the transaction. The loser receives "already reviewed".
- Cancel racing an approval: resolved by the same lock.

**Reversals**
- Target already reversed: re-checked at approval; fails with a clear message. The
  partial unique index prevents the queue from holding two at once.
- A reversal can only reference a row in `ledger_entries`, so it can never target
  something still pending.

**Drift between submit and approve**
- Milestone schedule re-priced while pending: harmless, because allocation happens at
  approval.
- Payment now exceeds outstanding: the excess becomes unallocated credit, which the
  existing credit sweep already handles.
- Project cancelled or deleted while pending: approval is blocked with a clear error.

**Duplicates**
- Double submit: an `inFlight` ref guard on the dialog, the pattern already used in
  `use-receipt-pdf.ts`.
- Two users recording the same cash payment: on submission the server checks for
  another pending or approved row with the same `project_id`, `amount_paise` and
  `value_date` submitted within the previous 24 hours, and flags the match as a
  possible duplicate shown in the review drawer. A warning rather than a block, because
  genuine same-day repeat payments occur.

**Verification quality**
- Missing proof document: warned, not blocked. Cash frequently has no digital proof.
- Future-dated `value_date`: rejected at validation.
- Long-pending items: surfaced by the Age column.

**Bulk**
- Partial failure reported per row.
- Self-submitted rows filtered client-side and rejected server-side.

**Rollout**
- Existing ledger entries are untouched and implicitly approved. No pending rows are
  created at deploy, so no customer balance moves.

## Testing

**Unit** — every state transition; self-approval rejection; reversal double-guard;
allocation computed at approval; duplicate detection; bulk partial failure.

**Integration, against a real database** — the four CHECK constraints rejecting bad
rows; the partial unique index; concurrent approval under `FOR UPDATE`.

**The invariant test that matters most:** a pending row must not move any figure.
Assert `v_project_balance`, outstanding and customers-AR are identical before and after
submission, and change only on approval.

**End-to-end through the UI**, not only the API: submit → appears in queue →
self-approval blocked → second user approves → balance moves → receipt becomes
available. The gap found in the previous QA pass was precisely a UI flow that had only
been exercised through the API.
