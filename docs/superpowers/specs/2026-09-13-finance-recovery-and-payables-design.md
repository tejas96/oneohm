# Project Recovery and Vendor Payables — Design

**Date:** 2026-09-13
**Branch:** `feat/finance-recovery-payables`
**Status:** approved for planning

## 1. What this is for

Five asks from the owner, in his words:

1. A **Recovery Dashboard** for completed meter-installation projects, split by Loan and Cash customers.
2. A **Receivables Dashboard** tracking payments against milestones.
3. A **two-tier payment verification** flow — recorded by a Jr. Accountant or Salesperson (name **and role** shown), verified by the Finance Head.
4. **Vendor selection and payable balance** when recording an expense.
5. **`Credit`** as a payment method on expenses.

Two of these already exist. The audit in §2 is what decided the shape of the other three,
and it also turned up defects worth fixing while we are in here.

Overriding goal stated by the owner: a financier must decide **fast**, the business team must
understand the screen **without training**, and every number must be **right**. Where those
three pull against each other, correctness wins and the screen explains itself in words.

## 2. What the live data says

Run against the production-shaped local database on 2026-09-13 (239 projects).

### 2.1 The ledger itself is sound

| Check | Result |
|---|---|
| Contract cross-foots on every project | **0 mismatches** |
| Milestones with money pinned beyond what was owed | **0** |
| Reversals unwind allocations | 12 reversals → 13 negative allocation rows. Correct. |
| Customers holding unused credit while being chased | **0** — the credit sweep works |
| Milestones with a zero or negative amount | **0** |

The append-only ledger rebuild did its job. Every defect below is in how numbers are
**labelled, fed or surfaced** — none is in the ledger's arithmetic.

### 2.2 The cross-foot identity

```
contract = collected + outstanding + written_off + cancelled
```

227 of 239 projects satisfy the first three terms alone. The remaining 12 are the 13
cancelled projects carrying 42 cancelled milestones (₹38.5 lakh), which `v_project_balance`
already reports separately as `cancelled_paise`.

**Any new money figure must be cross-footed against this identity before it ships.**
A headline that cannot be reconciled to the milestone rows is not shippable.

### 2.3 Defects found

| # | Defect | Size | Fixed here |
|---|---|---|---|
| 1 | `waivedPaise` on `GET /projects/:id/ledger/summary` is the **expected** amount of a waived milestone, not the amount written off. Money already collected is counted twice. | ₹1.53L over 2 projects | Yes |
| 2 | `project.status = 'completed'` is not maintained. 7 projects say completed; **41** have the meter installed. | 34 projects invisible to any status-driven report | Yes — Recovery never reads `status` |
| 3 | Expense `category` is dirty. 77% of spend carries no category, plus `Other`, `labour`, `labor`, `Insurance` sit outside the seven-value enum. Not visible today — the only query that groups by category is unreachable (§5.0.1) — but it makes the new per-row category display wrong. | ₹4.39L of ₹5.68L total spend | Yes — normalised at read time |
| 4 | Expense payee is free text. Live values are `Customer`, `QA Test Vendor`, `Site Inspector`, `Sunrise Solar Distributors` — **none** matches either real vendor. Vendor spend cannot be reported at all. | all 12 expenses | Yes — ask 4 |
| 5 | 58 loan projects (₹20.1L open) have no `payer_type = 'lender'` milestone, and 149 of 153 loan customers have no `financing_bank` recorded. A collector chases the customer for the bank's share and cannot tell which bank to call. | ₹20.1L | Surfaced, not guessed |
| 6 | The `Current` ageing chip means "days_overdue = 0", which merges ₹3.3L genuinely not yet due with ₹72.2L that has **no due date at all**. | ₹72.2L mislabelled | Yes — relabelled |

Also noted and deliberately **not** changed: 3 sets of same-day, same-amount receipts
totalling ₹42,885. The approval queue already warns on possible duplicates.

### 2.4 A claim that turned out to be wrong

An earlier reading of defect 6 treated the ₹72.2 lakh as hidden overdue debt. It is not.
178 of those 198 milestones have **zero** tasks done. The money is genuinely not owed yet.

Open money has exactly **two** states, not three:

| State | Amount | Milestones |
|---|---|---|
| Overdue — has a due date, past it | ₹1.20 crore | 216 |
| Not due yet — work unfinished | ₹75.6 lakh | 202 |

"Work complete but not yet overdue" is **empty**: every milestone whose tasks are all done
already carries a due date. So the ₹72.2L undated money is a **cash-forecasting gap**, not a
collection gap. The fix is a label and a note, not an alarm.

### 2.5 Recovery, sized

Projects with the net meter installed and money still open:

| Segment | Projects | Open |
|---|---|---|
| Cash | 23 | ₹13.2 lakh |
| Loan | 15 | ₹5.0 lakh |

One project's meter task predates activity logging and has no `completed_at`. Its
"days since meter" is unknown and renders as `—`, never as 0.

## 3. Decisions

Locked before design, and not to be reopened without the owner:

1. **Recovery lives inside Receivables**, as a scope control — not a separate page. Two pages
   quoting overlapping outstanding figures must agree to the paisa or both lose trust.
2. **Payables is a new fourth tab under Finance.** A Finance Head must not have to open
   Inventory to answer "who do we owe?".
3. **Payables nets per vendor. No bill-by-bill matching.** Two vendors, twelve expenses. A net
   balance cannot drift; an allocation table can.
4. **The bank-share gap is surfaced, never guessed.** Backfilling `payer_type = 'lender'` onto
   58 projects would silently move money off customers' names and stop real collection calls.
5. **No new permission codes.** The five existing finance codes cover every new surface, per
   the standing decision that finance takes codes from the shared catalog and invents none.
6. **Everything stays cash-basis.** No accrual P&L, no TDS, no GST. We are not building Tally.

## 4. Data model

### 4.1 Migration `1857140000000-FinanceRecoveryAndPayables.ts`

**No row is updated.** `ledger_entries` carries an append-only trigger
(`trg_ledger_entries_append_only`) that rejects every `UPDATE` and `DELETE`. That guarantee is
the foundation of the whole module and this migration does not weaken it, not even temporarily.
Adding a column with a constant `DEFAULT` does not rewrite rows in Postgres 11+, so the
trigger never fires.

Two consequences, both accepted:

- **The dirty categories cannot be rewritten in place.** They are normalised at read time
  instead (§4.3). Stored rows keep their original spelling; totals come out right.
- **Old payee text cannot be mapped to vendors.** It would match zero rows anyway — the live
  payee strings share no name with either vendor.

Steps:

```
1.  ledger_entries          ADD COLUMN vendor_id UUID NULL REFERENCES vendors(id)
2.  ledger_entries          ADD COLUMN is_cash BOOLEAN NOT NULL DEFAULT true
3.  pending_ledger_entries  ADD COLUMN vendor_id UUID NULL REFERENCES vendors(id)
4.  REPLACE chk_ledger_entries_type            -- allow 'vendor_payment'
5.  REPLACE chk_ledger_entries_type_direction  -- vendor_payment must be 'out'
6.  REPLACE chk_ple_kind                       -- allow 'vendor_payment'
7.  ADD     chk_ledger_entries_credit_vendor   -- is_cash = false  =>  vendor_id NOT NULL
8.  ADD     chk_ledger_entries_credit_is_out   -- is_cash = false  =>  direction = 'out'
9.  CREATE INDEX idx_ledger_entries_vendor ON ledger_entries (vendor_id) WHERE vendor_id IS NOT NULL
10. CREATE FUNCTION ledger_norm_category(text) RETURNS text  IMMUTABLE
11. CREATE VIEW v_project_commissioning
12. CREATE VIEW v_vendor_payable
13. CREATE OR REPLACE VIEW v_project_balance   -- waived fix + committed_unpaid_paise
```

Steps 7 and 8 are database-level guarantees, not form validation. A credit bill owed to
nobody, or money *received* on credit, must be impossible regardless of which caller writes it.

**`down()` refuses to run while any credit data exists.** It drops `is_cash` and both
`vendor_id` columns, and dropping a column destroys what it holds — re-running `up()` brings
the columns back holding only their defaults. So if any ledger entry has `is_cash = false`, or
any ledger entry or approval request names a vendor, a rollback would silently record every
credit bill as cash spent and forget which vendor each bill and payment belonged to, and the
append-only trigger would stop those rows ever being corrected. Instead `down()` stops with an
error giving the counts and says to fix forward or restore a backup. This happened for real on a
development database during review on 2026-09-14, before the guard existed. With nothing to
lose — every `is_cash` true, every `vendor_id` empty — the rollback proceeds.

When it does proceed, `down()` removes the columns, the index, the function and both new views; that DDL is
permitted by the trigger the same way `up()`'s column adds are. The widened entry-type CHECK
constraints on `ledger_entries` and `pending_ledger_entries` are the one exception and stay
permissive rather than being narrowed back: once a `vendor_payment` row exists,
`trg_ledger_entries_append_only` means it can never be deleted or updated, so no migration can
make it satisfy the original narrow CHECK again. A rolled-back database therefore still accepts
an entry type the pre-migration code has never heard of.

### 4.2 The three shapes of money out

| Shape | `entry_type` | `is_cash` | `vendor_id` | Counts as cash out |
|---|---|---|---|---|
| Normal expense | `expense` | `true` | optional | yes |
| Credit expense | `expense` | `false` | **required** | no |
| Vendor payment | `vendor_payment` | `true` | **required** | yes |

**One definition of spend, everywhere: `is_cash = true`.** One boolean, greppable, and hard to
forget. There is deliberately no second "cost" total competing with it — that divergence is
exactly what `project_payment_terms.paid_amount` did before the rebuild.

`payment_method` gains `credit` in the `PaymentMethod` enum. The column is `varchar(50)` with
no database enum behind it, so this is a TypeScript change only.

Reversals need no special handling in the sums. `chk_ledger_entries_direction_sign` already
forces a reversal to carry the opposite sign, so `SUM` is automatically net of reversals. The
one rule to enforce in code: **`LedgerWriteService.reverse` copies `is_cash` and `vendor_id`
from the entry it reverses.** Reversing an unpaid bill with `is_cash = true` would fabricate
cash coming back in.

### 4.3 `ledger_norm_category(text)`

Maps stored spellings onto the seven canonical categories, at read time:

| Stored | Reported as |
|---|---|
| `labour` | `labor` |
| `Insurance`, `Other` | `miscellaneous` |
| `NULL`, `''` | `uncategorised` |
| anything already canonical | itself, lowercased and trimmed |

`uncategorised` is a reporting-only value. It is never accepted on input — `RecordExpenseDto`
still refuses anything outside the seven. The point is that ₹4.39 lakh of historic spend shows
up honestly under its own label rather than vanishing from a grouped total.

### 4.4 `v_project_commissioning`

```sql
SELECT t.project_id,
       MAX(t.completed_at)                    AS meter_completed_at,
       (MAX(t.completed_at) IS NOT NULL)      AS meter_dated
FROM project_tasks t
WHERE t.deleted_at IS NULL
  AND t.status = 'done'
  AND BTRIM(LOWER(t.milestone_name)) LIKE 'net meter installation%'
GROUP BY t.project_id
```

41 rows today. `'Net Metering Application'` is excluded deliberately: applying to the DISCOM is
not the meter going in, and counting both roughly doubles the figure.

This predicate is currently duplicated inside `KPIS_SQL`. **`KPIS_SQL` is refactored to read
the view**, so "the meter is in" has exactly one definition.

### 4.5 `v_vendor_payable`

```sql
SELECT vn.id, vn.name, vn.code, vn.credit_days,
       SUM(-e.amount_paise) FILTER (WHERE e.is_cash = false)                AS billed_paise,
       SUM(-e.amount_paise) FILTER (WHERE e.entry_type = 'vendor_payment')  AS paid_paise,
       (billed - paid)                                                      AS payable_paise,
       MIN(e.value_date) FILTER (WHERE e.is_cash = false
                                   AND e.reverses_id IS NULL)               AS oldest_bill_date,
       COUNT(*) FILTER (WHERE e.is_cash = false AND e.reverses_id IS NULL)  AS bill_count
FROM vendors vn
LEFT JOIN ledger_entries e ON e.vendor_id = vn.id
WHERE vn.deleted_at IS NULL
GROUP BY vn.id, vn.name, vn.code, vn.credit_days
```

(Written out in full in the migration; the aggregates are repeated rather than aliased because
Postgres will not reference an output alias in the same `SELECT`. Every aggregate is cast
`::BIGINT` — `SUM(bigint)` returns `numeric`, which node-postgres hands to JS as a **string**.)

- **`payable_paise` may be negative.** That is a vendor advance — we have paid ahead. It is
  displayed as **Advance**, mirroring the customer-side unallocated credit, and never clamped
  to zero. Clamping would hide real money.
- **`oldest_bill_date` is the oldest credit bill, not the oldest *unpaid* bill.** Without
  bill-by-bill matching those differ once a partial payment lands. The column is labelled
  "Oldest bill" on screen for exactly this reason. Do not relabel it.

### 4.6 `v_project_balance` changes

Two edits, both appended or in place — the existing column order and types are preserved so
`CREATE OR REPLACE VIEW` succeeds.

**Fix `waived_paise`.** It becomes the unpaid remainder of waived milestones, summed from
`v_milestone_balance.balance_paise`, instead of their expected amount:

```sql
COALESCE((SELECT SUM(b.balance_paise) FROM v_milestone_balance b
           WHERE b.project_id = p.id AND b.status = 'waived'), 0)::BIGINT AS waived_paise
```

Proven on the live rows. `PRJ-ONEOHM_EPC-2026-0225` currently reports ₹1,44,483.89 waived
against a ₹1,60,537.66 contract on which ₹30,000 was collected — ₹30,000 more than the
contract in total. The new definition yields ₹1,14,483.89 and the project cross-foots to the
paisa. The fix moves 225 → 227 projects onto the identity in §2.2.

**`spent_paise` becomes cash-only** (`AND e.is_cash = true`), and a new final column is added:

```sql
COALESCE(SUM(-e.amount_paise) FILTER (WHERE e.direction = 'out'
                                        AND e.is_cash = false), 0)::BIGINT AS committed_unpaid_paise
```

`net_cash_paise` is unchanged in formula and therefore becomes true cash, which is what its
name always claimed.

> **Corrected 2026-09-14 (migration `1857150000000-OwedToVendorsNetOfPayments`).** The column
> above counted credit bills only, and paying one never reduced it — but the payment is cash out,
> so it also lands in `spent_paise`. Since cost is `spent_paise + committed_unpaid_paise`, a paid
> bill was charged to its project **twice**: proved on a ₹1,00,000 bill, cost read ₹1,00,000 after
> the bill and ₹2,00,000 after paying it. `committed_unpaid_paise` is now **credit bills minus
> vendor payments** on the project. Cost is still `spent + committed_unpaid`, and that sum now
> equals cash expenses plus credit bills. It may be negative, meaning vendors hold an advance; the
> Money tab then says "paid to vendors ahead of their bills", and the advance stays out of cost.

**Downstream cleanup, mandatory and in the same change:** `waivedRemainderPaise` in
`apps/web/components/features/projects/components/project-detail/lib/derive.ts` exists solely
to work around the old `waivedPaise`. It is deleted and its callers read `waivedPaise`
directly. Leaving both in place would double-correct and silently under-report the write-off.

## 5. API

### 5.0 Every query and contract that must change

The `is_cash` boolean is only correct if **every** money-out total applies it. This is the
complete list. A query missing from this list is a query that silently counts an unpaid bill
as cash spent.

| File / symbol | Change |
|---|---|
| `finance-ledger-queries.sql.ts` → `KPIS_SQL` | `spend_paise` gains `AND e.is_cash = true`. `expense_count` likewise. New output `vendorPayablePaise`, summed from `v_vendor_payable`, for the "Owed to vendors" tile. Meter count reads `v_project_commissioning` instead of repeating the task predicate. |
| `finance-ledger-queries.sql.ts` → `CASH_FLOW_SQL` | Money-out series gains `AND e.is_cash = true`. A credit bill must not draw a bar on a cash chart. |
| `finance-ledger-queries.sql.ts` → `LEDGER_PAGE_SQL` / `LEDGER_COUNT_SQL` | **No `is_cash` filter** — the list shows everything that happened. Adds `isCash`, `vendorId`, `vendorName` and `ledger_norm_category(e.category)` as `category` to the output. |
| `finance-ledger-queries.sql.ts` → `SPEND_BY_CATEGORY_SQL` | Gains `AND is_cash = true` and `ledger_norm_category(category)`, replacing `COALESCE(category, 'misc')` — which today merges the 5 blank rows into `miscellaneous` while leaving `labour`, `labor`, `Insurance` and `Other` as four separate slices. **Currently unreachable** (see §5.0.1). |
| `finance-ledger-queries.sql.ts` → `TOP_CUSTOMERS_OUTSTANDING_SQL` | No change needed — reads `v_milestone_balance`. **Currently unreachable** (see §5.0.1). |
| `finance-ledger-queries.sql.ts` → `RECEIVABLES_SQL` / `_COUNT_SQL` / bucket query | `scope`, `funding`, `no_due_date` per §5.1, plus `wantsLoan`, `financingBank`, `daysSinceMeter`, and the bank-share banner count. |
| `finance-ledger-queries.sql.ts` → `OUTSTANDING_SQL`, `CUSTOMERS_AR_SQL` | Receivable-side only. **No change.** Verified to follow automatically because both read `v_milestone_balance`. |
| `ledger.repository.ts` → project summary | Selects the new `committed_unpaid_paise`; `waived_paise` now means written off. |
| `ledger-response.dto.ts` → `ProjectLedgerSummaryDto` | New `committedUnpaidPaise`. `waivedPaise` doc comment rewritten — it no longer means expected. |
| `ledger-write.service.ts` → `recordExpense` / `reverse` | Writes `vendor_id` and `is_cash`; `reverse` copies both from the target entry. New `recordVendorPayment`. |
| `payment-approval.service.ts` → `approve` | Derives `is_cash` from `kind` + `paymentMethod` in one place and passes `vendor_id` through. |
| `payment-approval-queries.sql.ts` | Role lists, `vendorId`, `vendorName`, `isCredit` per §5.5. |
| `payment-approval.service.ts` → `previewImpact` | A vendor payment's impact is the vendor's payable before and after, not a milestone waterfall. |
| `derive.ts` → `waivedRemainderPaise` | **Deleted.** Callers read `waivedPaise`. |
| `project-money-tab.tsx` → `marginPaise`, `usedPct` | Cost-based per §6.4. |
| `PaymentMethod` enum (`libs/shared`) | Gains `CREDIT = 'credit'`. |
| `PendingKind`, `LedgerEntryType` types | Gain `vendor_payment`. |

`v_milestone_balance` is **not** touched. Receivables arithmetic is correct today and this work
must not disturb it.

#### 5.0.1 Two dead queries

`SPEND_BY_CATEGORY_SQL` and `TOP_CUSTOMERS_OUTSTANDING_SQL` have service methods
(`getSpendByCategory`, `getTopCustomersOutstanding`) that **nothing calls**. There is no
controller route for either. So the dirty-category problem in §2.3 defect 3 is real data dirt
but is **not currently displayed to anyone**.

They are left in place and given the one-line `is_cash` guard above, so that reviving one later
cannot resurrect the defect. Deleting them is a separate dead-code sweep, not this change.

### 5.1 `GET /finance/receivables` — two new filters, one new bucket

| Param | Values | Meaning |
|---|---|---|
| `scope` | `all` (default), `recovery` | `recovery` inner-joins `v_project_commissioning` |
| `funding` | *(unset)*, `loan`, `cash` | reads `customer_properties.wants_loan` |
| `bucket` | adds `no_due_date` | `due_date IS NULL`; existing values unchanged |

`RECEIVABLES_JOINS` already joins `customer_properties`, so `wants_loan` and `financing_bank`
are free. New response fields: `wantsLoan`, `financingBank`, `meterCompletedAt`,
`daysSinceMeter` (null when `meter_dated` is false).

`current` keeps its present meaning (`days_overdue <= 0`) so nothing breaks. `no_due_date` is a
**subset** of it, reachable from the KPI note rather than from a seventh chip.

The bucket-count query gains `noDueDateCount` and `noDueDatePaise`, and — because `scope` and
`funding` narrow the page — it must honour both. It deliberately keeps ignoring `bucket`, so
selecting one chip does not zero the others. Getting this wrong makes the chips disagree with
the rows, which is how a month-end reconciliation goes wrong.

### 5.2 `GET /finance/payables` — new

Paginated vendors from `v_vendor_payable`, default sorted by `payable_paise` descending.
Supports `search` over vendor name and code, and `onlyOwing` to hide settled vendors.
Response carries a `totals` block: `totalPayablePaise`, `vendorsOwedCount`, `advancePaise`.
Totals come from the server, never summed from the visible page.

### 5.3 `POST /projects/:projectId/ledger/vendor-payments` — new

Body: `amountPaise`, `valueDate`, `vendorId`, `paymentMethod`, `reference`, `notes`,
`proofDocuments`. Submits to the approval queue with `kind = 'vendor_payment'`, exactly like an
expense. Returns the pending row. **Nothing reaches the ledger until a Finance Head approves.**

`paymentMethod` of `credit` is rejected on this route — settling a credit bill with more credit
is not a payment.

### 5.4 `RecordExpenseDto` and `SubmitApprovalDto`

Both gain optional `vendorId`. Validation, enforced in the DTO and again by the database check:

- `paymentMethod === 'credit'` requires `vendorId`.
- `paymentMethod === 'credit'` sets `is_cash = false` at approval time. The pending row does
  not store `is_cash`; it is derived from `kind` and `paymentMethod` when the ledger row is
  inserted, so there is one place that decides it.

### 5.5 Approvals carry roles

`APPROVALS_PAGE_SQL` and `APPROVAL_BY_ID_SQL` gain `submittedByRoles` and `reviewedByRoles`:

```sql
(SELECT STRING_AGG(r.name, ', ' ORDER BY r.level, r.name)
   FROM user_roles ur JOIN roles r ON r.id = ur.role_id
  WHERE ur.user_id = p.submitted_by) AS "submittedByRoles"
```

32 users hold more than one role, so this is a list, not a single value, ordered most senior
first. Accountability means showing the capacity someone acted in; picking one role
arbitrarily would misreport it. Both queries also return `vendorId`, `vendorName` and
`isCredit` so an approver can see that no cash moves yet.

## 6. Screens

### 6.1 Finance → Receivables (existing page, extended)

One new segmented control above the ageing chips:

```
[ All open ]  [ Recovery — Cash ]  [ Recovery — Loan ]
```

One control, three states. The ageing chips, search, sort and pagination all keep working
inside whichever scope is selected.

**Ageing chips.** `Current` is renamed **Not due yet**. No seventh chip is added. Instead the
"Total outstanding" KPI card carries a clickable note:

> ₹72.2L of this has no due date — it cannot be forecast. **Show these →**

That link sets `bucket = no_due_date`. The fact is visible and actionable without another
control, per the house preference for few controls that each do more.

**Recovery rows are a call list.** A financier should be able to work the list without opening
anything: customer name, **phone**, project number, amount open, days since the meter went in,
oldest overdue milestone. `customerPhone` is already returned by `RECEIVABLES_SQL`.

> **Changed 2026-09-14 — one row per project.** Recovery first listed a job once per open
> milestone, so one call took up to four rows (57 rows for 38 jobs). `GET /finance/recovery`
> groups the same `v_milestone_balance` rows per project: still owed, the overdue part, oldest
> overdue, days since the meter, open milestone count, bank, and whether a loan job's bank share
> was ever split out (marked on the row; the banner counts them). Chips count projects by their
> oldest overdue milestone. Opening a row lists its open milestones, which add up to the row.
> Sorts: days since meter, amount owed, oldest overdue, customer (case-insensitive). Checked
> against the milestone list: Cash 23 projects ₹13,22,346.38, Loan 15 projects ₹4,99,575.72, and
> every project equals its milestone rows. "All open" keeps one row per milestone. The scope is
> in the URL (`?scope=recovery-cash`), so a refresh or a link keeps it.

**Recovery — Loan carries a banner** when any project in scope lacks a lender milestone:

> 14 of 15 loan projects have no bank share recorded. You may be chasing the customer for the
> bank's money. **Review these →**

The count is computed server-side alongside the bucket counts. This is defect 5, shown rather
than guessed — the banner reports it, it does not repair it. Repairing the share split means
deciding 10/70/20 versus something else per project, which is the owner's call, not a default.

> **Added 2026-09-14.** The banner first pointed at a fix nobody could make: no screen or API
> could change who pays a milestone. `PATCH ledger/milestones/:id/payer` now sets `customer` or
> `lender`, and a loan project's payment schedule shows a **Customer / Bank** switch on every open
> milestone. It moves no money, mirrors Waive's transaction, audit and permission
> (`finance.payments.record`), refuses a bank on a project with no loan and any closed milestone,
> and the customer app does not read it. A receivable's project link opens the Finance tab, so
> the path is banner → row → switch, and the banner count drops as projects are corrected.

Rows for loan projects show `financingBank`, or a **"Add bank"** button for the 149 properties
that have none. Not muted text and not blank — blank reads as "no bank involved", which is the
opposite of the truth, and muted text tells a collector about a problem they cannot fix from
where they are standing.

#### 6.1.1 Attach bank dialog

Clicking **Add bank** on a row opens a small dialog. Nothing else on the page moves.

- Customer, project and amount open are shown read-only at the top, so the user can see who
  they are answering for.
- One field: a bank select grouped by `BANK_CATEGORY_ORDER`
  (Nationalised / Private / NBFC), built from `BANKS` in `@tejas96/shared/constants`, with
  `BANK_OTHER` revealing a free-text box. **Identical contract to the onboarding wizard** —
  `financing_bank` holds either a `BANKS` code or a typed name, and `bankLabel()` renders both.
- Saves with `PATCH /customers/properties/:id` (`financingBank` is already accepted by
  `UpdateCustomerPropertyDto`). The row updates in place; the list does not reload or lose the
  user's scroll position or filters.

**The select control is extracted** from the onboarding wizard into
`components/features/shared/bank-select.tsx` and both places use it. Two independent copies of
a grouped bank list is how the two would drift, and the wizard is where the defect-5 data comes
from in the first place. This is a targeted refactor of code this change touches, not a
general cleanup.

Gated on `customers.edit`, not on a finance code — it writes a customer property. A user with
finance access but no customer-edit rights sees the button disabled with the usual access
explanation, rather than a button that fails on click.

**Why this and not a bank share split too:** attaching a bank answers "who do I call", which is
missing on 149 of 153 properties and has exactly one right answer per property. Splitting
10/70/20 answers "how much is theirs", which has no safe default (§3, decision 4). The cheap,
unambiguous half is fixed inline; the expensive, ambiguous half stays a warning.

### 6.2 Finance → Payables (new page, `/finance/payables`)

Columns: vendor, payable, oldest bill, days past terms (`oldest_bill_date + credit_days`
against today), bill count, and a **Pay** action.

Three KPI tiles: total payable, vendors owed, advances paid.

A negative payable renders as **Advance ₹X** in the success tone, not as a negative number.

Nav entry added to `navigation.ts` under `MONEY`, and `ROUTES.FINANCE.PAYABLES` to
`routes.ts` plus its `finance` entry in the route-permission map.

### 6.3 Finance → Cash (existing page)

- New tile **"Owed to vendors"**, mirroring the existing "Outstanding". Money owed *to* us and
  *by* us now sit on the same screen. This is the single biggest clarity win for the business
  team and costs one tile.
- The existing **"Meter installations"** tile becomes a link into `Receivables → Recovery`.
  A count that already exists becomes a way in. *(2026-09-14: it opens **Recovery — Cash**
  directly, `?scope=recovery-cash`; Loan is one click away.)*
- **"Spent"** stays cash-only. This is a cash page; that is the correct meaning here.

### 6.4 Project → Money tab

**The margin fix.** `project-money-tab.tsx:356` computes `marginPaise = contractPaise −
spentPaise`, and `usedPct` drives an 80%-of-contract warning. With credit bills excluded from
`spentPaise`, a project carrying ₹1 lakh of unpaid material bills would report ₹1 lakh more
margin than it has, and the warning would stay silent. Both become:

```
cost  = spentPaise + committedUnpaidPaise
margin = contractPaise − cost
usedPct = cost / contractPaise
```

Margin is a **cost** question, not a cash question. It stays one number.

Worked example — a ₹5,00,000 contract, ₹2,00,000 paid in cash, ₹1,00,000 of panels taken on
credit:

| | Today's formula | New formula |
|---|---|---|
| Margin | ₹5,00,000 − ₹2,00,000 = **₹3,00,000** | ₹5,00,000 − ₹3,00,000 = **₹2,00,000** |

Today's figure is wrong by exactly the unpaid bill. The panels are on the roof and the money is
owed; nothing about paying the vendor next month makes the project more profitable this month.

**No existing project changes.** There are zero credit expenses in the database, because the
feature does not exist yet. Every project's margin on the day this ships is identical to the
day before. The two formulas only diverge once someone actually records a bill on credit — and
at that moment the new one is the true one.

Beneath it, one line, shown only when there is something to show:

> \+ ₹1,00,000 owed to vendors, not yet paid

Credit bills appear in the entries list with an **On credit** chip, in a neutral tone, and the
vendor name. Vendor payments appear as **"Paid Arihant Associates"**. Two rows for one cost is
correct and reads correctly, because only one of them is cash.

> **Changed 2026-09-14.** The chip first said "Unpaid". A ledger entry never changes, so it kept
> saying "Unpaid" after the vendor was paid in full. "On credit" describes how the bill was taken
> on, which stays true; whether a vendor is still owed is their balance on Payables.

### 6.5 Finance → Approvals

- The recorder's **role list** beside their name, in the table and in the review drawer.
  The verifier's roles too, on a reviewed row. This closes ask 3.
- A **Credit** chip on credit bills, with the vendor name, so an approver understands that
  approving records an obligation rather than moving cash.
- Vendor payments show which vendor is being paid and that vendor's payable **before and
  after** approval. The approver sees the consequence, not just the amount.

> **Added 2026-09-14 — the bell.** A payment waiting for approval notifies everyone holding
> `finance.approvals.process`, never the person who recorded it; when nobody else holds it, the
> admins are told instead, so a payment never waits unseen. Approving or rejecting tells the
> recorder, reason first on a reject. Each link is one the recipient can open (the project's
> Finance tab, else the approvals list, else none). Sends run after the commit and cannot fail an
> approval. The web bell used to open `/notifications`, a page that was never built; it now opens
> a list where clicking a notice marks it read and goes where it points. The approvals tab is in
> the URL (`?status=rejected`), and the Type filter gains Vendor payment. Vendor payments are
> numbered in their own `VPY-` series; older ones keep `EXP-`.

### 6.6 Record expense dialog

> **Added 2026-09-14 — add a vendor without leaving.** When the typed name matches no vendor, the
> picker offers "Add “Sharma Traders” as a new vendor", last in the list so an existing near-match
> is seen first. It opens a small dialog over the expense asking only for a name, phone and credit
> days, refuses a name that already exists, and selects the new vendor without losing the
> expense. The server generates the code (`VEN-0001`, …) when none is sent. Gated on
> `finance.payments.record` by the owner's choice: whoever may record the bill may name who it is
> owed to. Before this, a finance-only user could not add a vendor at all.

- **Vendor picker**, reusing `components/features/inventory/components/shared/vendor-picker.tsx`.
  Optional in general; **required** the moment `Credit` is chosen, with the reason stated
  inline: *"A credit bill has to be owed to someone."*
- `Credit` added to the method list. Choosing it changes the dialog's description to
  *"No cash leaves now. This becomes a payable."* so the effect is stated before submitting.
- The free-text payee field stays for non-vendor payees (`Site Inspector`, one-off labour) and
  is hidden once a vendor is selected. Two fields naming the same party is how `labour` and
  `labor` both got into the ledger.

### 6.7 Pay vendor dialog (new, reached from Payables and from the vendor page)

Vendor and their current payable are shown read-only at the top. Amount defaults to the full
payable and stays editable — part payments are ordinary. Project is a required picker, with the
reason stated: *"Every ledger entry belongs to a project. One cheque covering three projects is
recorded as three lines."* Paying more than the payable is allowed and warns inline that the
excess becomes an advance.

> **Changed 2026-09-14 — pay project by project.** Prefilling the vendor's whole balance against
> one searched project moved cost between projects while the vendor's figure looked right.
> `GET /finance/payables/:vendorId/projects` returns credit bills less payments per project (only
> projects still owing), plus vendor payments already waiting for approval, using the same
> filters as `v_vendor_payable`. The dialog lists those projects; picking one fills project and
> amount, and a vendor owed on one project gets it picked. It warns when a payment on that
> project is already waiting, and says how much was paid ahead elsewhere when the list adds up to
> more than the balance.

### 6.8 Business dashboard

Adds **"Owed to vendors"** beside the existing money-owed card, so the business view shows both
directions.

The money-owed card's existing behaviour is deliberately left alone: its provider already
excludes milestones with no due date
(`finance.provider.ts` — `v.days_overdue > 0 OR (v.due_date IS NOT NULL AND …)`). Given §2.4
that is correct, not a bug. Do not "fix" it.

### 6.9 Vendor detail (Inventory)

A **Payable** tile and the vendor's bill list, so the loop closes from either direction. This is
`v_vendor_payable` scoped to one vendor — a different scope of the same fact, not a second copy
of it.

> **Built 2026-09-14** — the first pass shipped only the tile. `GET
> /finance/payables/:vendorId/entries` returns every credit bill and payment with the vendor,
> newest first, with the balance after each line, computed across all rows before the newest 100
> are cut. It renders as a **Bills & payments** tab here and as the expanded row under a vendor on
> Payables. No line claims to be paid or unpaid; without bill-by-bill matching a row cannot know.

## 7. RBAC

No new permission codes. Enforcement is front-end, via `useGatedAction` / `can`, matching every
other surface in this app.

| Action | Code |
|---|---|
| Finance section, Cash page, Payables page | `finance.view` |
| Receivables, including both Recovery scopes | `finance.receivables.view` |
| Record an expense, a credit bill, or a vendor payment | `finance.payments.record` |
| See the approval queue | `finance.approvals.view` |
| Approve or reject | `finance.approvals.process` |
| Attach a bank to a property (§6.1.1) | `customers.edit` — it writes a customer property, not a ledger row |

"Jr. Accountant" and "Finance Head" are **roles the owner builds in the admin panel**, not
hardcoded values. Only `super_admin` and `admin` are system roles; every other role is an
editable shell. A Jr. Accountant role is one holding `finance.payments.record`; a Finance Head
role is one holding `finance.approvals.process`.

Separation of duties has two independent layers and both stay:

1. **Permission** — recording and approving are different codes.
2. **Four-eyes** — `chk_ple_four_eyes` refuses `reviewed_by = submitted_by` at the database
   level, so a user holding both codes still cannot approve their own entry.

## 8. Edge cases

| Case | Behaviour |
|---|---|
| Credit bill with no vendor | Refused by the DTO and by `chk_ledger_entries_credit_vendor`. |
| Money *in* marked as credit | Refused by `chk_ledger_entries_credit_is_out`. |
| Reversing a credit bill | `is_cash` and `vendor_id` are copied from the target. Payable drops; cash is untouched. |
| Reversing a vendor payment | Payable rises again. Cash returns. Both correct. |
| Paying a vendor more than owed | Allowed. Payable goes negative, displayed as **Advance**. Warned inline before submit. |
| One cheque across several projects | Recorded as one line per project. The dialog says so. |
| Vendor soft-deleted with bills outstanding | The vendor stays in `v_vendor_payable` while `payable_paise <> 0`, marked **Inactive**. Money does not disappear because someone tidied a list. |
| Meter task done but `completed_at` is null (1 project) | `daysSinceMeter` is null and renders `—`. Never 0, which would read as "commissioned today". |
| Recovery project with zero outstanding | Not listed. Recovery is a collection list, not a project list. |
| Loan project with no bank recorded (149 of 153) | Row shows an **Add bank** button (§6.1.1), and the banner counts it. |
| Bank attached from Recovery, then the customer switches lender | The dialog reopens on the existing value and overwrites it. `financing_bank` is a single current fact, not a history. |
| Bank attached but the share split still missing | The row loses its Add-bank button; the banner still counts it. The two defects are independent and are reported independently. |
| User has finance access but not `customers.edit` | Add-bank renders disabled with the standard access explanation, never as a button that fails on click. |
| A property marked `wants_loan` that is really self-financed | Turning `wants_loan` off clears `financing_bank`, which is existing behaviour from #312. Such a project then leaves Recovery — Loan for Recovery — Cash. Correct. |
| Waived milestone that was part-paid | `waived_paise` counts only the unpaid remainder (§4.6). |
| Expense with a legacy category | Reported under its normalised name; `uncategorised` for the 5 blanks. |
| A project cancelled with open milestones | Unchanged — `cancelled_paise` already separates these, and Recovery only sees meter-done projects. |

## 9. Out of scope

- **Backfilling `payer_type = 'lender'`** onto the 58 loan projects. Decision 4.
- **Bill-by-bill payable matching.** Decision 3.
- **Rewriting the dirty stored categories.** The append-only trigger forbids it and read-time
  normalisation makes it unnecessary.
- **Non-project overheads.** `ledger_entries.project_id` is `NOT NULL`; rent and salaries have
  no home in this ledger. Pre-existing, unchanged, and worth a separate conversation.
- **Dropping the legacy `payments` / `project_expenses` / `project_payment_terms` tables.**
  They are the rollback artefact.
- **Accrual accounting, TDS, GST.** Decision 6.

## 10. How this is verified

Per the standing preference: **no new unit test files.** Each screen is walked in the running
app, through the UI, with no API calls, SQL or scripts standing in for a user.

**Existing tests must still pass**, in particular:

- `consumer-contract.spec.ts` — pins the four payment-term statuses the consumer app reads.
  The consumer app calls `/consumer/projects/:id/payments` and milestone meaning is unchanged,
  so this is a proof, not a hope.
- `derived-status.spec.ts` — pins the SQL/TypeScript status table.
- `ledger-write.service.spec.ts` — must cover the `is_cash` / `vendor_id` copy on reverse.

**The walk-through, end to end:**

1. Record an expense on Credit against a vendor. Confirm cash KPIs do **not** move.
2. See it in the approval queue with the recorder's name **and role**, and a Credit chip.
3. Approve it as a different user. Confirm the payable appears on Finance → Payables.
4. Confirm the project's Money tab shows the Unpaid line and that **margin dropped**.
5. Pay the vendor part of it. Confirm it queues for approval.
6. Approve. Confirm cash out moves, and the payable drops by exactly that amount.
7. Reverse the credit bill. Confirm the payable falls and cash is untouched.
8. Open Receivables → Recovery — Cash. Confirm 23 projects and ₹13.2 lakh.
9. Open Recovery — Loan. Confirm 15 projects, ₹5.0 lakh, and the bank-share banner.
9a. Click **Add bank** on a row with no bank. Pick a listed bank; confirm the row updates in
    place with no reload and no lost filter. Reopen it, choose Other, type a name, confirm it
    saves trimmed. Confirm the same value then renders on the property drawer and the project
    overview, which already read `financingBank` through `bankLabel()`.
10. Click the "no due date" note. Confirm ₹72.2 lakh over 198 milestones.
11. Cross-foot a waived project against §2.2 and confirm it balances to the paisa.

**The numbers to hit**, from §2.5 and §2.3, on the local database as of 2026-09-13:

| Figure | Expected |
|---|---|
| Recovery — Cash | 23 projects, ₹13,22,346.38 |
| Recovery — Loan | 15 projects, ₹4,99,575.72 |
| Loan projects with no lender milestone | 58 org-wide, ₹20,14,310.82 |
| Open money, overdue | ₹1,20,07,287.31 over 216 milestones |
| Open money, not due yet | ₹75,57,212.90 over 202 milestones |
| Of that, no due date | ₹72,22,805.60 over 198 milestones |
| `PRJ-ONEOHM_EPC-2026-0225` written off, after the fix | ₹1,14,483.89 |
| Projects satisfying the cross-foot | 227 of 239; the other 12 are the cancelled ones |

If a screen disagrees with this table, the screen is wrong.
