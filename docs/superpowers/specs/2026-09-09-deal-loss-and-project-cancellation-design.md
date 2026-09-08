# Deal loss and project cancellation

- Date: 2026-09-09
- Status: approved design, ready for an implementation plan
- Repo: `oneohm` (backend + web). Mobile follow-on noted in Phase 2.

## Problem

A deal can die at three points. Only the first is handled.

| Where it dies | Today |
|---|---|
| Enquiry, before any site exists | Mark customer lost. Works. |
| Site exists, no accepted quote | Mark property lost. Works. |
| Quote rejected | Reason is stored on the quote. Nothing else happens. |
| Project cancelled | Status flips. Nothing else happens. |

Two consequences.

**The roof is frozen forever.** Once a quote is accepted the property becomes
`converted`. `CustomerPropertyService.markLost` refuses a converted property,
`QuoteService.create` refuses a new quote on a property with an accepted quote,
and `ProjectService` refuses a second project on a property that already has
one. After a cancellation the site can be neither closed nor re-sold.

**Dead projects still ask for money.** The outstanding queries join `projects`
but never read `projects.status`.

Measured on the local database on 2026-09-09:

| Project | Shown as owed | Open tasks | Property |
|---|---|---|---|
| PRJ-ONEOHM_EPC-2026-0052 | ₹1,80,808 | 43 | stuck `converted` |
| PRJ-ONEOHM_EPC-2026-0121 | ₹1,54,444 | 29 | stuck `converted` |
| PRJ-ONEOHM_EPC-2026-0221 | ₹2,15,204 | 44 | stuck `converted` |

₹5,50,457 of receivables that nobody owes, confirmed through
`v_milestone_balance`.

## The idea

A property is a **roof**. A roof does not die; a **deal** does. Today one status
column carries both meanings, so a dead deal freezes the roof record.

We keep the single table and make the roof recoverable, rather than introducing
a separate Deal or Opportunity entity. A separate entity is the textbook answer
and would touch every quote, project, follow-up and report in the product. The
value does not justify that blast radius.

## Decisions

1. A lost site can be reopened and re-quoted. Site survey, roof data, DISCOM and
   photos survive.
2. Cancelling a project asks how the collected money is settled. It does not
   silently leave cash on a dead job.
3. Rejecting a quote asks whether to re-quote or close the site. It never
   decides on its own.
4. A cancelled project leaves nothing hanging. Everything reversible is
   reversed automatically; anything physical that is already out of the
   warehouse becomes an explicit open job.
5. Loss reasons move from free text to a picklist plus a note.
6. `cancelled → active` on a project is removed. Cancellation is final.
7. Project tasks are not cancelled. No new task status.
8. Settlement is split by who paid: customer and lender.

## Non-goals

- No Deal or Opportunity entity.
- No automatic refund payout. The system records what is owed; a person pays it.
- No automatic cancellation of vendor purchase orders. That is a phone call.
- No new unit test files. Existing pinned specs are updated; behaviour is
  verified by walking each screen.

## Data model

No new tables.

### New enum: `LossReason`

Lives in `libs/shared/src/types/enums/customer.enum.ts`, beside
`FollowupOutcome`, and follows the same shape and the same discipline note: if
`OTHER` exceeds about 10% of rows, read the notes and promote a real value.

```
lost_on_price
lost_to_competitor
customer_dropped
not_reachable
site_not_feasible
subsidy_issue
financing_rejected
customer_defaulted
delay_by_us
other
```

One enum covers both lead loss and project cancellation. Two enums would drift.

### Columns

| Table | Column | Type | Purpose |
|---|---|---|---|
| `customer_properties` | `loss_reason` | varchar(40) null | Picklist beside the existing free-text `lost_reason` |
| `customer_profiles` | `loss_reason` | varchar(40) null | Same, for enquiry-level loss |
| `quotes` | `voided_at` | timestamptz null | Releases the permanent property lock |
| `quotes` | `void_reason` | varchar(500) null | Why it was voided |
| `projects` | `cancel_reason` | text null | Free-text note |
| `projects` | `loss_reason` | varchar(40) null | Picklist |
| `projects` | `cancelled_at` | timestamptz null | When |
| `projects` | `settled_at` | timestamptz null | Settlement answered |
| `projects` | `settled_by` | uuid null | Who answered it |
| `employee_commissions` | `recovered_at` | timestamptz null | A paid commission clawed back |
| `employee_commissions` | `recovery_notes` | text null | How |
| `payment_milestones` | — | — | No schema change. `status` is `varchar(10)`; `cancelled` is 9 characters and fits. |

There is deliberately no `settlement_kept_paise` column. The kept amount is
`collected − refunds`, and refunds are ledger rows. A stored copy would drift.

## Quote rejection

`QuoteService.updateStatus` gains a second step when the new status is
`REJECTED`. The request carries an outcome:

- **`requote`** — the quote is rejected and nothing else changes. A follow-up is
  scheduled on the property.
- **`close`** — the quote is rejected, the property is marked lost with the
  chosen `LossReason` and note, every other non-terminal quote on that property
  is voided, and any accepted quote on that property is voided.

Both paths run through `LeadClosureService` so the terminal behaviour cannot
drift from the other closure routes.

Voiding the sibling quotes matters: without it a rep can still send a `sent` or
`draft` quote for a roof that is already closed.

## Project cancellation

Cancellation asks three things in one dialog:

1. `LossReason` plus a note.
2. Is the roof dead, or will we re-quote it? Same two buttons as quote
   rejection, on purpose.
3. Settlement: for each payer that has paid, how much do we keep? Default is
   everything.

Then, in one transaction:

**Reversed automatically**

- Every milestone with `status = 'active'` becomes `status = 'cancelled'`.
- Stock allocations in `allocated` become `cancelled`; the reserved quantity
  returns to free stock.
- `partially_dispatched` allocations release only the quantity still in the
  warehouse. The dispatched part becomes a return request (below).
- Commissions in `pending` or `approved` become `cancelled`.
- The accepted quote on the property is voided.
- The property becomes `lost` (with the reason) or returns to `active` for a
  re-quote, per the choice above.
- Pending follow-ups close via `LeadClosureService` when the roof is closed.

**Recorded as an open job, because a physical thing is out there**

- Dispatched or partly dispatched material creates a `return_requests` row in
  `pending` against the project.
- Every purchase order on the project in `draft`, `pending_approval`,
  `approved`, `sent`, `confirmed` or `partially_received` appears on the
  cleanup checklist as "cancel or redirect PO-xxxx with the vendor". Orders in
  `received` or `cancelled` are already closed and are skipped. Nothing is
  written for these — the checklist reads the orders directly.
- Commissions in `paid` stay `paid` and appear as a recovery item until
  `recovered_at` is set.

**Not touched**

- Project tasks keep their status. See Tasks below.
- Ledger entries that already exist are never edited or deleted.

### Cancellation is final

`validateStatusTransition` drops `CANCELLED → ACTIVE`. `CANCELLED` becomes a
terminal state with an empty transition list.

Undoing a completed cleanup correctly — re-reserving stock that another project
may have consumed, un-refunding money, restoring a roof that has been re-sold —
is a large amount of code for a rare mis-click. To restart work you reopen the
property and quote it fresh.

### Cleanup state

A cancelled project reads **"Cancelled — cleanup pending"** until all four of
these are clear, then **"Cancelled — settled"**:

1. No `return_requests` for the project in `pending`.
2. No purchase orders for the project outside `received` and `cancelled`.
3. No commissions for the project in `paid` with `recovered_at IS NULL`.
4. `projects.settled_at IS NOT NULL`.

This state is derived at read time from those four queries. It is not stored,
so there is no cached flag to fall out of sync.

## Money

### Cancelled milestones

`MilestoneRowStatus` becomes `'active' | 'waived' | 'cancelled'`.
`DerivedMilestoneStatus` gains `'cancelled'`. `derivedMilestoneStatus()` returns
`'cancelled'` for a cancelled row, checked before the allocation branches.

`v_milestone_balance` changes in lockstep, as the warning comment on
`derived-status.ts` requires:

- `balance_paise` is `0` for a cancelled row.
- `expected_paise` keeps the contracted figure, so history stays readable.
- `derived_status` is `'cancelled'`.

Cash already allocated to a cancelled milestone stays allocated and stays
counted as collected. Only the unpaid remainder stops being owed. This is why
cancellation uses its own row status rather than `waived`: the waived path
already counts money that was collected, and building on it would repeat that
mistake.

The consumer mobile app already switches on `cancelled` as one of its five
milestone statuses, so it renders correctly with no client change.
`consumer-contract.spec.ts` currently freezes "we never emit `cancelled`" and
must be updated. `derived-status.spec.ts` pins the outcome table and gains the
cancelled rows.

Write-offs are not used here. A cancelled milestone simply stops being owed.

### Settlement

Collected-by-payer is computed by joining `ledger_allocations` to
`payment_milestones.payer_type`. Entries with no allocation count as
`customer`.

The dialog shows one line per payer that has paid, each defaulting to "keep
everything". Keeping less writes a ledger entry with `entry_type = 'refund'`
and `direction = 'out'`, with the counterparty set to the customer or the
lender. Both types already exist on `LedgerEntryEntity`; no new money plumbing
is needed.

`settled_at` and `settled_by` are stamped once the dialog is answered, including
when the answer is "keep everything".

### Outstanding queries need no change

Verified while planning: every accounts-receivable path already filters
`status = 'active'` on the milestone — `RECEIVABLES_FILTERS`,
`TOP_CUSTOMERS_OUTSTANDING_SQL` and `CUSTOMERS_AR_SQL` in
`finance-ledger-queries.sql.ts`, and the `b.status = 'active'` lateral inside
`v_project_balance`.

So flipping the milestones to `cancelled` is by itself enough to remove the
₹5,50,457. No SQL filter on `projects.status` is added. Adding one would be a
second, redundant definition of the same rule, and the two would eventually
disagree.

## Unlocking the roof

Three guards currently make a converted property permanent. All three change.

1. `QuoteService.create` — the accepted-quote lock ignores quotes with
   `voided_at IS NOT NULL`.
2. `QuoteService.updateStatus` and `send` — same, for the sibling-quote lock.
3. `ProjectService` conversion — `findOneByPropertyId` is replaced by a
   live-project lookup that excludes `cancelled`, ordered newest first. The
   `PropertyStatus.CONVERTED` guard stays; a reopened property is `active`, so
   it passes.

`ConsumerProjectController` uses the same lookup and must also take the live
project, not the newest row, or a consumer would be shown a dead project.

Quote status transitions are unchanged. `ACCEPTED` stays terminal; voiding is
the `voided_at` column, not a status change.

## Reopening a property

A new action on a property in `lost`: set it back to `active`, clear
`lost_reason`, `loss_reason` and `lost_at`, and leave the audit trail as the
record of what happened. Voided quotes stay voided; the next quote is a fresh
one.

The clearing PATCH must send `null`, not `undefined`, for the three fields.
`undefined` is dropped before it reaches the update and the old reason silently
survives.

## Tasks

Tasks are not cancelled and no task status is added. The database enum
`project_tasks_status_enum` holds only `backlog`, `in_progress`, `blocked`,
`done`, and `TaskStatus` matches it. Several comments in the codebase describe
cancelled tasks; they are stale and should be corrected where touched.

Cross-project task reads already exclude cancelled projects in
`findByUserId`, `findAllByUserId` and `countSummaryForUser`. One query does
not: `findUserTaskProjects` (`project-task.repository.ts:761`) has no
project-status filter, so a cancelled project would still appear in the My
Tasks project dropdown. It gains the same filter.

`countCompletedThisWeek` is left alone. It counts `done` tasks, and work that
was genuinely finished before the cancellation should still count.

## Reporting

`LossReason` makes "why do we lose?" a real chart: by month, by owner, by
DISCOM, split between leads lost and projects cancelled. A loss-reason
breakdown is added to the existing analytics surface rather than a new page.

## Backfill

One migration, run after the schema change, covering the three existing
cancelled projects:

1. Set their `active` milestones to `cancelled`. This removes ₹5,50,457 from
   receivables.
2. Set `cancelled_at` from the audit log where available, otherwise
   `updated_at`. Set `loss_reason = 'other'` and `cancel_reason` to
   "backfilled: cancelled before cleanup existed".
3. Set `settled_at` to the same timestamp, since nothing was collected on any
   of them — verified: all three show ₹0 collected.
4. Set their three properties to `lost` with `loss_reason = 'other'` and the
   same note.
5. Void the accepted quote on each of those properties.
6. Leave their 116 tasks untouched.

The single existing `lost` property and single `rejected` quote need no
backfill. Existing free-text `lost_reason` values are kept as-is;
`loss_reason` stays null for them rather than being guessed.

## Phases

**Phase 1 — backend and web.** Everything above, in the `oneohm` repo.

**Phase 2 — mobile.** `oneohm-mobile` already has mark-lost on both the lead
record and the property detail screens, sending free text. It gains the
picklist and the reopen action after `libs/shared` is published. Until then the
API treats `lossReason` as optional and stores `other` when it is missing, so
mobile keeps working through the gap.

## Verification

No new test files. Existing pinned specs are updated: `derived-status.spec.ts`
and `consumer-contract.spec.ts`.

Everything else is verified by walking the screens, with the API on 8085 and
web on 3001:

1. Reject a quote, choose re-quote. Property stays active, follow-up appears,
   a new quote can be created.
2. Reject a quote, choose close. Property is lost with the reason, sibling
   quotes are voided, follow-ups stop.
3. Reopen that property. Create and accept a new quote. Convert it to a
   project. This is the path that the one-project-per-property guard would
   have blocked.
4. Cancel a project that has money collected. Check the settlement split, the
   refund entry, and that the outstanding report drops the remainder.
5. Cancel a project with reserved stock. Check free stock rises by exactly the
   reserved quantity.
6. Cancel a project with dispatched material. Check a pending return request
   appears and the project reads "Cleanup pending".
7. Close that return request. Check the project reads "Cancelled — settled".
8. Confirm the cancelled project is gone from the My Tasks project dropdown,
   the finance dashboard, and the outstanding list.
9. Confirm the consumer app renders a cancelled milestone rather than a locked
   card.
