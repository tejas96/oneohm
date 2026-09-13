# Project Recovery and Vendor Payables Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the finance team a recovery view of commissioned projects split by loan and cash, a payables view of what the company owes vendors, and expenses that can be taken on credit against a real vendor — while repairing four number defects found in the live data.

**Architecture:** One migration adds `vendor_id` and `is_cash` to the append-only `ledger_entries`, widens three CHECK constraints for a new `vendor_payment` entry type, and adds three read-model objects (`v_project_commissioning`, `v_vendor_payable`, `ledger_norm_category`). Every money-out total then filters on `is_cash = true`, so a credit bill is a cost the company carries without ever touching a cash figure. Recovery is a scope filter on the existing Receivables page rather than a second page, because two screens quoting overlapping outstanding figures must agree to the paisa or both lose trust.

**Tech Stack:** NestJS + TypeORM + raw SQL views (Postgres 15), Next.js App Router + MUI + TanStack Query, Nx monorepo, `@tejas96/shared` for cross-app types.

**Spec:** `docs/superpowers/specs/2026-09-13-finance-recovery-and-payables-design.md` — read it before Task 1. The plan argues from the spec; §2 (the audit) explains why several of these tasks exist at all.

## Global Constraints

- **No new unit test files.** Standing project rule. Existing suites must keep passing; extend an existing `.spec.ts` only where the spec names one. Verification is by running the screen and by checking numbers against §10 of the spec.
- **`ledger_entries` is append-only.** `trg_ledger_entries_append_only` rejects every `UPDATE` and `DELETE`. Never disable it, not even inside a migration. `ALTER TABLE … ADD COLUMN … DEFAULT <constant>` does not rewrite rows and is safe.
- **Money is integer paise everywhere.** Never a decimal, never a float. Cast every SQL aggregate `::BIGINT` — `SUM(bigint)` returns `numeric`, which node-postgres hands to JS as a **string**.
- **Money out is stored negative.** `SUM(-amount_paise)` is the spend convention. Reversals carry the opposite sign, so sums are automatically net of them.
- **One definition of spend: `is_cash = true`.** There is deliberately no second "cost" total competing with it.
- **No new permission codes.** Use the five existing finance codes plus `customers.edit` for the bank dialog.
- **Cash basis only.** No accrual P&L, no TDS, no GST.
- **Servers:** backend `8085`, web `3001`. Both usually already running — check with `lsof -nP -iTCP -sTCP:LISTEN | grep -E '3001|8085'` before starting anything. `preview_start` configs live at `/Volumes/works-space/oneohm/.claude/launch.json`, the **workspace root**, not this worktree.
- **Database:** `docker exec -e PGPASSWORD=root oneohm-postgres psql -U root -d oneohm_epc`.
- **Checks after every task:** `npm run typecheck` and `npm run lint`. Both must be clean before commit.

## File Structure

**Backend — new files**

| File | Responsibility |
|---|---|
| `apps/backend/src/database/migrations/1857140000000-FinanceRecoveryAndPayables.ts` | The one migration. Calls into the SQL modules below. |
| `apps/backend/src/database/migrations/sql/ledger/13-commissioning.sql.ts` | `v_project_commissioning` — the single definition of "the meter is in". |
| `apps/backend/src/database/migrations/sql/ledger/14-vendor-payable.sql.ts` | `ledger_norm_category` + `v_vendor_payable`. |
| `apps/backend/src/database/migrations/sql/ledger/15-project-balance-v2.sql.ts` | Replacement `v_project_balance`. |
| `apps/backend/src/modules/finance/dto/payables-query.dto.ts` | Query DTO for the payables list. |
| `apps/backend/src/modules/finance/services/finance-payables-queries.sql.ts` | Payables SQL, kept out of the 500-line `finance-ledger-queries.sql.ts`. |

**Backend — modified**

`ledger-entry.entity.ts`, `pending-ledger-entry.entity.ts`, `ledger-write.service.ts`, `ledger.repository.ts`, `ledger-request.dto.ts`, `ledger-response.dto.ts`, `ledger.controller.ts`, `payment-approval.service.ts`, `payment-approval-queries.sql.ts`, `submit-approval.dto.ts`, `finance-ledger-queries.sql.ts`, `finance-reporting.service.ts`, `finance.controller.ts`.

**Shared — modified**

`libs/shared/src/types/enums/payment.enum.ts` (adds `CREDIT`).

**Web — new files**

| File | Responsibility |
|---|---|
| `apps/web/components/features/shared/bank-select.tsx` | Grouped bank select, extracted from the onboarding wizard so both render one list. |
| `apps/web/components/features/ledger/attach-bank-dialog.tsx` | The §6.1.1 popup. |
| `apps/web/components/features/ledger/pay-vendor-dialog.tsx` | The §6.7 popup. |
| `apps/web/components/features/ledger/finance-payables-page.tsx` | The Payables page. |
| `apps/web/components/features/ledger/payables-columns.tsx` | Its column defs. |
| `apps/web/app/(dashboard)/finance/payables/page.tsx` | Route shim. |

**Web — modified**

`lib/hooks/resources/ledger.ts`, `lib/config/routes.ts`, `lib/config/navigation.ts`, `finance-receivables-page.tsx`, `receivables-columns.tsx`, `finance-cash-page.tsx`, `record-money-dialog.tsx`, `project-money-tab.tsx`, `payment-approvals/columns.tsx`, `payment-approvals/approval-review-drawer.tsx`, `projects/.../project-detail/lib/derive.ts`, `inventory/components/shared/vendor-picker.tsx`, `inventory/components/vendor-detail-page.tsx`, `dashboard/business/components/money-owed-card.tsx`, `onboarding/components/onboarding-wizard/index.tsx`.

**Task order rationale:** Tasks 1–4 build the write path bottom-up, so nothing can write a malformed row. Tasks 5–8 fix and extend the read path. Tasks 9–16 build the screens. A reviewer can reject any one task without unpicking its neighbours.

---
## Task 1: Migration — columns, constraints, views

**Files:**
- Create: `apps/backend/src/database/migrations/sql/ledger/13-commissioning.sql.ts`
- Create: `apps/backend/src/database/migrations/sql/ledger/14-vendor-payable.sql.ts`
- Create: `apps/backend/src/database/migrations/sql/ledger/15-project-balance-v2.sql.ts`
- Create: `apps/backend/src/database/migrations/1857140000000-FinanceRecoveryAndPayables.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: columns `ledger_entries.vendor_id`, `ledger_entries.is_cash`, `pending_ledger_entries.vendor_id`; views `v_project_commissioning`, `v_vendor_payable`, replaced `v_project_balance` (new last column `committed_unpaid_paise`, changed meaning of `waived_paise`); function `ledger_norm_category(text)`.

- [ ] **Step 1: Write `13-commissioning.sql.ts`**

```ts
/**
 * When did a project's net meter actually go in?
 *
 * `projects.status = 'completed'` cannot answer this: 7 projects claim it while
 * 41 have the meter installed. Status is not maintained, so nothing that must be
 * right may read it.
 *
 * 'Net Metering Application' is deliberately NOT matched. Applying to the DISCOM
 * is not the meter going in, and counting both roughly doubles the figure.
 *
 * `meter_dated` is false for the one project whose meter task predates activity
 * logging and therefore has no `completed_at`. Its age is unknown, and the UI
 * must render that as em-dash rather than as zero days.
 */
export const CREATE_V_PROJECT_COMMISSIONING = `
  CREATE OR REPLACE VIEW v_project_commissioning AS
  SELECT
    t.project_id,
    MAX(t.completed_at)                 AS meter_completed_at,
    (MAX(t.completed_at) IS NOT NULL)   AS meter_dated
  FROM project_tasks t
  WHERE t.deleted_at IS NULL
    AND t.status = 'done'
    AND BTRIM(LOWER(t.milestone_name)) LIKE 'net meter installation%'
  GROUP BY t.project_id
`;

export const DROP_V_PROJECT_COMMISSIONING = `DROP VIEW IF EXISTS v_project_commissioning`;
```

- [ ] **Step 2: Write `14-vendor-payable.sql.ts`**

```ts
/**
 * Legacy expense categories, mapped at READ time.
 *
 * The live ledger holds `labour` beside `labor`, plus `Insurance` and `Other`,
 * and 5 rows with no category at all — 77% of all spend. They cannot be
 * rewritten: `trg_ledger_entries_append_only` rejects every UPDATE, and that
 * guarantee is worth more than tidy rows.
 *
 * `uncategorised` is a REPORTING value only. `RecordExpenseDto` still refuses
 * anything outside the seven canonical categories on input.
 */
export const CREATE_LEDGER_NORM_CATEGORY = `
  CREATE OR REPLACE FUNCTION ledger_norm_category(raw TEXT)
  RETURNS TEXT
  LANGUAGE SQL
  IMMUTABLE
  AS $$
    SELECT CASE BTRIM(LOWER(COALESCE(raw, '')))
      WHEN ''          THEN 'uncategorised'
      WHEN 'labour'    THEN 'labor'
      WHEN 'insurance' THEN 'miscellaneous'
      WHEN 'other'     THEN 'miscellaneous'
      ELSE BTRIM(LOWER(raw))
    END
  $$
`;

/**
 * What the company owes each vendor, netted — no bill-by-bill matching.
 *
 * Two vendors and twelve expenses do not justify an allocation table, and a net
 * balance cannot drift out of step with the rows behind it.
 *
 * `payable_paise` may be NEGATIVE. That is a vendor advance — we paid ahead — and
 * it is displayed as "Advance", never clamped to zero. Clamping hides real money.
 *
 * `oldest_bill_date` is the oldest credit bill, NOT the oldest unpaid one. Without
 * bill-by-bill matching those differ once a part payment lands, which is why the
 * column is labelled "Oldest bill" on screen. Do not relabel it.
 *
 * Reversals need no special case: `chk_ledger_entries_direction_sign` forces a
 * reversal to carry the opposite sign, so both SUMs are already net of them.
 */
export const CREATE_V_VENDOR_PAYABLE = `
  CREATE OR REPLACE VIEW v_vendor_payable AS
  SELECT
    vn.id                                                                    AS vendor_id,
    vn.name,
    vn.code,
    vn.credit_days,
    vn.deleted_at,
    COALESCE(SUM(-e.amount_paise) FILTER (WHERE e.is_cash = false), 0)::BIGINT
                                                                             AS billed_paise,
    COALESCE(SUM(-e.amount_paise) FILTER (WHERE e.entry_type = 'vendor_payment'), 0)::BIGINT
                                                                             AS paid_paise,
    (COALESCE(SUM(-e.amount_paise) FILTER (WHERE e.is_cash = false), 0)
     - COALESCE(SUM(-e.amount_paise) FILTER (WHERE e.entry_type = 'vendor_payment'), 0)
    )::BIGINT                                                                AS payable_paise,
    MIN(e.value_date) FILTER (WHERE e.is_cash = false AND e.reverses_id IS NULL)
                                                                             AS oldest_bill_date,
    COUNT(*) FILTER (WHERE e.is_cash = false AND e.reverses_id IS NULL)::int  AS bill_count
  FROM vendors vn
  LEFT JOIN ledger_entries e ON e.vendor_id = vn.id
  GROUP BY vn.id, vn.name, vn.code, vn.credit_days, vn.deleted_at
`;

export const DROP_V_VENDOR_PAYABLE = `DROP VIEW IF EXISTS v_vendor_payable`;
export const DROP_LEDGER_NORM_CATEGORY = `DROP FUNCTION IF EXISTS ledger_norm_category(TEXT)`;
```

Note: `deleted_at` is selected rather than filtered, so a soft-deleted vendor still
carrying a payable can be listed as **Inactive**. Money must not disappear because
someone tidied a list.

- [ ] **Step 3: Write `15-project-balance-v2.sql.ts`**

Copy `CREATE_V_PROJECT_BALANCE` from `06-views.sql.ts` verbatim, then make exactly
three edits. Everything else, including column order, must stay identical or
`CREATE OR REPLACE VIEW` will fail.

```ts
/**
 * v_project_balance, second edition. Three changes, no others.
 *
 * 1. `waived_paise` was SUM(expected) over waived milestones, so anything
 *    collected before the waiver was counted twice — once in received, once in
 *    waived. On PRJ-ONEOHM_EPC-2026-0225 that reported Rs 1,44,483.89 written off
 *    against a Rs 1,60,537.66 contract on which Rs 30,000 had been collected:
 *    Rs 30,000 more than the contract in total. It now sums `balance_paise` from
 *    v_milestone_balance, i.e. the UNPAID remainder, and the project cross-foots.
 *
 * 2. `spent_paise` gains `AND e.is_cash = true`, so a bill taken on credit is
 *    never reported as cash gone. `net_cash_paise` is unchanged in formula and
 *    therefore becomes true cash, which its name always claimed.
 *
 * 3. `committed_unpaid_paise` is appended LAST — CREATE OR REPLACE VIEW permits
 *    new columns only at the end. It is what the project owes vendors and has
 *    not paid, and it is what makes the margin tile honest.
 */
export const CREATE_V_PROJECT_BALANCE_V2 = `...`;
```

The three edits, exactly:

```sql
-- 1. replace the waived_paise line inside the `ms` lateral's output usage
COALESCE((SELECT SUM(b.balance_paise) FROM v_milestone_balance b
           WHERE b.project_id = p.id AND b.status = 'waived'), 0)::BIGINT AS waived_paise,

-- 2. inside the `le` lateral
SUM(-e.amount_paise) FILTER (WHERE e.direction = 'out' AND e.is_cash = true)::BIGINT AS spent_paise,

-- 3. appended as the final SELECT column, fed by a new lateral field
COALESCE(le.committed_unpaid_paise, 0)::BIGINT AS committed_unpaid_paise
-- …with this added to the `le` lateral:
SUM(-e.amount_paise) FILTER (WHERE e.direction = 'out' AND e.is_cash = false)::BIGINT
  AS committed_unpaid_paise
```

- [ ] **Step 4: Write the migration**

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

import { CREATE_V_PROJECT_COMMISSIONING, DROP_V_PROJECT_COMMISSIONING } from './sql/ledger/13-commissioning.sql';
import { CREATE_LEDGER_NORM_CATEGORY, CREATE_V_VENDOR_PAYABLE, DROP_LEDGER_NORM_CATEGORY, DROP_V_VENDOR_PAYABLE } from './sql/ledger/14-vendor-payable.sql';
import { CREATE_V_PROJECT_BALANCE_V2 } from './sql/ledger/15-project-balance-v2.sql';
import { CREATE_V_PROJECT_BALANCE } from './sql/ledger/06-views.sql';

/**
 * Vendors and credit on the ledger, and the read model Recovery and Payables need.
 *
 * NO ROW IS UPDATED. `trg_ledger_entries_append_only` rejects every UPDATE and
 * DELETE on `ledger_entries`, and that guarantee is not weakened here, not even
 * temporarily. Adding a column with a constant DEFAULT does not rewrite rows in
 * Postgres 11+, so the trigger never fires.
 *
 * Two consequences, both accepted. The dirty legacy categories cannot be
 * rewritten in place and are normalised at read time by `ledger_norm_category`
 * instead. And the old free-text payees cannot be mapped onto vendors — which
 * would match zero rows anyway, since no live payee string shares a name with
 * either vendor.
 *
 * Steps 7 and 8 are database guarantees, not form validation. A credit bill owed
 * to nobody, or money RECEIVED on credit, must be impossible regardless of which
 * caller writes it.
 */
export class FinanceRecoveryAndPayables1857140000000 implements MigrationInterface {
  name = 'FinanceRecoveryAndPayables1857140000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS vendor_id UUID NULL REFERENCES vendors(id)`,
    );
    await queryRunner.query(
      `ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS is_cash BOOLEAN NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE pending_ledger_entries ADD COLUMN IF NOT EXISTS vendor_id UUID NULL REFERENCES vendors(id)`,
    );

    await queryRunner.query(`ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS chk_ledger_entries_type`);
    await queryRunner.query(`
      ALTER TABLE ledger_entries ADD CONSTRAINT chk_ledger_entries_type
        CHECK (entry_type IN ('receipt','expense','refund','write_off','vendor_payment'))`);

    await queryRunner.query(`ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS chk_ledger_entries_type_direction`);
    await queryRunner.query(`
      ALTER TABLE ledger_entries ADD CONSTRAINT chk_ledger_entries_type_direction
        CHECK ((entry_type = 'receipt' AND direction = 'in')
            OR (entry_type IN ('expense','refund','write_off','vendor_payment') AND direction = 'out'))`);

    await queryRunner.query(`ALTER TABLE pending_ledger_entries DROP CONSTRAINT IF EXISTS chk_ple_kind`);
    await queryRunner.query(`
      ALTER TABLE pending_ledger_entries ADD CONSTRAINT chk_ple_kind
        CHECK (kind IN ('receipt','expense','reversal','vendor_payment'))`);

    // A credit bill owed to nobody is not a payable, it is a hole.
    await queryRunner.query(`
      ALTER TABLE ledger_entries ADD CONSTRAINT chk_ledger_entries_credit_vendor
        CHECK (is_cash OR vendor_id IS NOT NULL)`);
    // Money cannot be RECEIVED on credit. That is a receivable, and it already
    // has a home in payment_milestones.
    await queryRunner.query(`
      ALTER TABLE ledger_entries ADD CONSTRAINT chk_ledger_entries_credit_is_out
        CHECK (is_cash OR direction = 'out')`);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ledger_entries_vendor
        ON ledger_entries (vendor_id) WHERE vendor_id IS NOT NULL`);

    await queryRunner.query(CREATE_LEDGER_NORM_CATEGORY);
    await queryRunner.query(CREATE_V_PROJECT_COMMISSIONING);
    await queryRunner.query(CREATE_V_VENDOR_PAYABLE);
    await queryRunner.query(CREATE_V_PROJECT_BALANCE_V2);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // v_project_balance first: it is the only object that depends on is_cash.
    await queryRunner.query(CREATE_V_PROJECT_BALANCE);
    await queryRunner.query(DROP_V_VENDOR_PAYABLE);
    await queryRunner.query(DROP_V_PROJECT_COMMISSIONING);
    await queryRunner.query(DROP_LEDGER_NORM_CATEGORY);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ledger_entries_vendor`);
    await queryRunner.query(`ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS chk_ledger_entries_credit_is_out`);
    await queryRunner.query(`ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS chk_ledger_entries_credit_vendor`);
    await queryRunner.query(`ALTER TABLE pending_ledger_entries DROP CONSTRAINT IF EXISTS chk_ple_kind`);
    await queryRunner.query(`
      ALTER TABLE pending_ledger_entries ADD CONSTRAINT chk_ple_kind
        CHECK (kind IN ('receipt','expense','reversal'))`);
    await queryRunner.query(`ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS chk_ledger_entries_type_direction`);
    await queryRunner.query(`
      ALTER TABLE ledger_entries ADD CONSTRAINT chk_ledger_entries_type_direction
        CHECK ((entry_type = 'receipt' AND direction = 'in')
            OR (entry_type IN ('expense','refund','write_off') AND direction = 'out'))`);
    await queryRunner.query(`ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS chk_ledger_entries_type`);
    await queryRunner.query(`
      ALTER TABLE ledger_entries ADD CONSTRAINT chk_ledger_entries_type
        CHECK (entry_type IN ('receipt','expense','refund','write_off'))`);
    await queryRunner.query(`ALTER TABLE pending_ledger_entries DROP COLUMN IF EXISTS vendor_id`);
    await queryRunner.query(`ALTER TABLE ledger_entries DROP COLUMN IF EXISTS is_cash`);
    await queryRunner.query(`ALTER TABLE ledger_entries DROP COLUMN IF EXISTS vendor_id`);
  }
}
```

- [ ] **Step 5: Run it**

```bash
cd apps/backend && npm run migration:run
```

Expected: `FinanceRecoveryAndPayables1857140000000 has been executed successfully.`

- [ ] **Step 6: Prove the numbers**

```bash
docker exec -e PGPASSWORD=root oneohm-postgres psql -U root -d oneohm_epc -tA -c "
SELECT 'commissioned projects', COUNT(*) FROM v_project_commissioning;
SELECT 'undated meter projects', COUNT(*) FROM v_project_commissioning WHERE NOT meter_dated;
SELECT 'vendors in payable view', COUNT(*) FROM v_vendor_payable;
SELECT 'total payable (must be 0 today)', SUM(payable_paise) FROM v_vendor_payable;
SELECT 'all existing rows are cash', COUNT(*) FILTER (WHERE NOT is_cash) FROM ledger_entries;
SELECT 'category norm', ledger_norm_category('labour'), ledger_norm_category('Other'), ledger_norm_category(NULL);
SELECT 'PRJ-0225 written off, must be 11448389' , vb.waived_paise
  FROM v_project_balance vb JOIN projects p ON p.id=vb.project_id
 WHERE p.project_number='PRJ-ONEOHM_EPC-2026-0225';
"
```

Expected, exactly: `41`, `1`, `2`, `0`, `0`, `labor|miscellaneous|uncategorised`, `11448389`.

- [ ] **Step 7: Prove the constraints bite**

```bash
docker exec -e PGPASSWORD=root oneohm-postgres psql -U root -d oneohm_epc -tA -c "
INSERT INTO ledger_entries (project_id, entry_no, entry_type, direction, amount_paise, value_date, is_cash, created_by)
SELECT id, 'BAD-1', 'expense', 'out', -100, CURRENT_DATE, false, gen_random_uuid() FROM projects LIMIT 1;
" 2>&1 | grep -c "chk_ledger_entries_credit_vendor"
```

Expected: `1` — the insert is refused because a credit bill has no vendor.

- [ ] **Step 8: Prove `down()` is clean**

```bash
cd apps/backend && npm run migration:revert && npm run migration:run
```

Expected: both succeed. Reverting and re-running proves `down()` restores the
original `v_project_balance` rather than leaving the v2 definition behind.

- [ ] **Step 9: Commit**

```bash
git add apps/backend/src/database/migrations
git commit -m "feat(ledger): vendors, credit, and the read model recovery needs"
```

---

## Task 2: Entities and shared types

**Files:**
- Modify: `libs/shared/src/types/enums/payment.enum.ts`
- Modify: `apps/backend/src/modules/ledger/entities/ledger-entry.entity.ts`
- Modify: `apps/backend/src/modules/payment-approvals/entities/pending-ledger-entry.entity.ts`

**Interfaces:**
- Consumes: Task 1's columns.
- Produces: `PaymentMethod.CREDIT = 'credit'`; `LedgerEntryType` gains `'vendor_payment'`; `PendingKind` gains `'vendor_payment'`; `LedgerEntryEntity.vendorId?: string | null` and `.isCash!: boolean`; `PendingLedgerEntryEntity.vendorId?: string | null`.

- [ ] **Step 1: Add the enum value**

In `libs/shared/src/types/enums/payment.enum.ts`, inside `PaymentMethod`:

```ts
  DEMAND_DRAFT = 'demand_draft',
  /**
   * Bought now, paid later. Not a way money moved — a statement that it has
   * NOT yet. A credit expense becomes a vendor payable and is excluded from
   * every cash total until a vendor payment settles it.
   */
  CREDIT = 'credit',
```

- [ ] **Step 2: Widen the ledger entry type and add the columns**

In `ledger-entry.entity.ts`:

```ts
export type LedgerEntryType = 'receipt' | 'expense' | 'refund' | 'write_off' | 'vendor_payment';
```

and, after the `category` column:

```ts
  /** The vendor this entry is owed to or paid to. Required when `isCash` is false. */
  @Column({ name: 'vendor_id', type: 'uuid', nullable: true })
  vendorId?: string | null;

  /**
   * Did cash actually move?
   *
   * False means the cost is taken on and the money is still in the bank — a bill
   * on credit. Every money-out total in this codebase filters on `is_cash = true`,
   * so a credit bill never reaches a cash figure; the `vendor_payment` that
   * settles it does.
   *
   * One boolean rather than a compound condition on purpose: it is greppable, and
   * a query that forgets it is visibly wrong rather than subtly wrong.
   */
  @Column({ name: 'is_cash', type: 'boolean', default: true })
  isCash!: boolean;
```

- [ ] **Step 3: Same for the pending entity**

In `pending-ledger-entry.entity.ts`:

```ts
export type PendingKind = 'receipt' | 'expense' | 'reversal' | 'vendor_payment';
```

and, after `category`:

```ts
  /**
   * The vendor, carried through approval. `is_cash` is deliberately NOT stored
   * here — it is derived from `kind` and `paymentMethod` at approval, so exactly
   * one place decides it.
   */
  @Column({ name: 'vendor_id', type: 'uuid', nullable: true })
  vendorId?: string | null;
```

- [ ] **Step 4: Typecheck and lint**

```bash
npm run typecheck && npm run lint
```

Expected: clean. If `LedgerEntryType` widening breaks an exhaustive `switch`,
fix that switch now — an unhandled `vendor_payment` would render as a blank row.

- [ ] **Step 5: Commit**

```bash
git add libs/shared apps/backend/src/modules/ledger/entities apps/backend/src/modules/payment-approvals/entities
git commit -m "feat(ledger): a credit method, a vendor, and a cash flag on an entry"
```

---
## Task 3: The write path — vendor, credit, and vendor payments

**Files:**
- Modify: `apps/backend/src/modules/ledger/services/ledger-write.service.ts`
- Modify: `apps/backend/src/modules/ledger/services/ledger-write.service.spec.ts`

**Interfaces:**
- Consumes: `LedgerEntryEntity.vendorId` / `.isCash`, `PaymentMethod.CREDIT` (Task 2).
- Produces: `RecordExpenseInput` gains `vendorId?: string`; new `RecordVendorPaymentInput { projectId, amountPaise, valueDate?, vendorId, paymentMethod?, reference?, notes?, proofDocument? }`; new `LedgerWriteService.recordVendorPayment(input, createdBy, externalManager?): Promise<LedgerEntryEntity>`.

- [ ] **Step 1: Widen `RecordExpenseInput`**

```ts
export interface RecordExpenseInput {
  projectId: string;
  amountPaise: number;
  valueDate?: string;
  category: string;
  payee?: string;
  paymentMethod?: string;
  notes?: string;
  proofDocument?: ProofDocumentInput;
  /** Required when `paymentMethod` is `credit`. A bill is owed to someone. */
  vendorId?: string;
}

export interface RecordVendorPaymentInput {
  projectId: string;
  amountPaise: number;
  valueDate?: string;
  vendorId: string;
  paymentMethod?: string;
  reference?: string;
  notes?: string;
  proofDocument?: ProofDocumentInput;
}
```

- [ ] **Step 2: Teach `recordExpense` about credit**

Inside `recordExpense`, before the transaction:

```ts
    const onCredit = input.paymentMethod === PaymentMethod.CREDIT;
    if (onCredit && !input.vendorId) {
      throw new BadRequestException('A credit bill has to be owed to a vendor');
    }
```

and in the `insertEntry` values object add:

```ts
        vendorId: input.vendorId ?? null,
        // A bill on credit is a cost taken on, not cash gone. Every money-out
        // total filters on `is_cash`, so this one flag keeps it off the cash
        // page, the cash-flow chart and the project's Spent figure until a
        // vendor payment settles it.
        isCash: !onCredit,
```

- [ ] **Step 3: Add `recordVendorPayment`**

Place it directly after `recordExpense`. It reuses `FinanceSequenceScope.EXPENSE`
for its number — a vendor payment is money out and shares that series, so no new
sequence scope is introduced.

```ts
  /**
   * Settle what we owe a vendor.
   *
   * This is cash leaving, so `isCash` is true and it lands in every spend total.
   * The credit bill it settles stays exactly where it is — the ledger is
   * append-only, and `v_vendor_payable` nets the two rather than matching them
   * bill by bill.
   *
   * Deliberately NOT allocated against milestones. Money out never changes what
   * the customer owes; extra scope the customer agreed to pay for is a change
   * order, not an expense.
   */
  async recordVendorPayment(
    input: RecordVendorPaymentInput,
    createdBy: string,
    externalManager?: EntityManager,
  ): Promise<LedgerEntryEntity> {
    this.assertWritesAllowed();
    if (input.paymentMethod === PaymentMethod.CREDIT) {
      throw new BadRequestException('Settling a credit bill with more credit is not a payment');
    }
    const valueDate = this.resolveValueDate(input.valueDate);
    this.assertAmount(input.amountPaise);
    await this.assertProjectInOrg(input.projectId);

    return this.runInTransaction(externalManager, async (manager) =>
      this.insertEntry(manager, {
        projectId: input.projectId,
        customerId: null,
        entryNo: await this.sequenceService.getNextNumber(FinanceSequenceScope.EXPENSE, manager),
        entryType: 'vendor_payment',
        direction: 'out',
        amountPaise: -input.amountPaise,
        valueDate,
        paymentMethod: input.paymentMethod ?? null,
        reference: input.reference ?? null,
        notes: input.notes ?? null,
        vendorId: input.vendorId,
        isCash: true,
        createdBy,
      }),
    );
  }
```

- [ ] **Step 4: Make `reverse` carry both fields**

In `reverse`, the reversal's `insertEntry` values must copy from `original`:

```ts
        vendorId: original.vendorId ?? null,
        // Copied, never defaulted. A reversal of an unpaid bill written with
        // `isCash: true` would report cash coming back into a bank account that
        // never sent any — and `v_vendor_payable` would stop netting it off.
        isCash: original.isCash,
```

- [ ] **Step 5: Extend the existing spec file**

This is the one place the spec permits touching tests, and it covers pure logic
rather than a screen. Add to `ledger-write.service.spec.ts`:

```ts
  it('a reversal inherits the original entry cash flag and vendor', async () => {
    const original = await service.recordExpense(
      {
        projectId,
        amountPaise: 100_000,
        category: 'materials',
        paymentMethod: PaymentMethod.CREDIT,
        vendorId,
      },
      userId,
    );
    expect(original.isCash).toBe(false);

    const reversal = await service.reverse(original.id, 'Wrong vendor', otherUserId);

    expect(reversal.isCash).toBe(false);
    expect(reversal.vendorId).toBe(vendorId);
  });

  it('refuses a credit bill with no vendor', async () => {
    await expect(
      service.recordExpense(
        { projectId, amountPaise: 100_000, category: 'materials', paymentMethod: PaymentMethod.CREDIT },
        userId,
      ),
    ).rejects.toThrow(/owed to a vendor/);
  });
```

- [ ] **Step 6: Run the existing ledger suite**

```bash
npx nx test backend --testPathPattern="ledger"
```

Expected: PASS, including the two new cases.

- [ ] **Step 7: Typecheck, lint, commit**

```bash
npm run typecheck && npm run lint
git add apps/backend/src/modules/ledger/services
git commit -m "feat(ledger): a bill on credit, and the payment that settles it"
```

---

## Task 4: Approvals — carry the vendor through, and derive `is_cash` once

**Files:**
- Modify: `apps/backend/src/modules/payment-approvals/dto/submit-approval.dto.ts`
- Modify: `apps/backend/src/modules/payment-approvals/services/payment-approval.service.ts`

**Interfaces:**
- Consumes: `recordVendorPayment` (Task 3), `PendingKind` (Task 2).
- Produces: `SubmitApprovalDto.vendorId?: string`; `approve()` handles `kind === 'vendor_payment'`; `submit()` persists `vendorId`.

- [ ] **Step 1: Add `vendorId` to the submit DTO**

```ts
  @ApiPropertyOptional({ description: 'The vendor this money is owed to or paid to' })
  @IsUUID()
  @IsOptional()
  vendorId?: string;
```

Add `'vendor_payment'` to the `kind` enum validator in the same file.

- [ ] **Step 2: Persist it in `submit()`**

Add `vendorId: dto.vendorId ?? null,` to the object handed to `repo.save`, beside
`counterparty`.

- [ ] **Step 3: Guard the pairing at submit time**

Immediately after the existing validation in `submit()`:

```ts
    // Refused here as well as by the database check, so the operator gets a
    // sentence rather than a constraint-violation stack trace.
    if (dto.paymentMethod === PaymentMethod.CREDIT && !dto.vendorId) {
      throw new BadRequestException('A credit bill has to be owed to a vendor');
    }
    if (dto.kind === 'vendor_payment' && !dto.vendorId) {
      throw new BadRequestException('Say which vendor is being paid');
    }
```

- [ ] **Step 4: Add the `vendor_payment` branch to `approve()`**

Change the final `else` into an explicit chain. The expense branch gains
`vendorId`; the new branch comes before it.

```ts
      } else if (pending.kind === 'vendor_payment') {
        entry = await this.ledgerWrite.recordVendorPayment(
          {
            projectId: pending.projectId,
            amountPaise: Math.abs(pending.amountPaise),
            valueDate: pending.valueDate,
            vendorId: pending.vendorId as string,
            paymentMethod: pending.paymentMethod ?? undefined,
            reference: pending.reference ?? undefined,
            notes: pending.notes ?? undefined,
          },
          approverId,
          manager,
        );
      } else {
        entry = await this.ledgerWrite.recordExpense(
          {
            // …existing fields unchanged…
            vendorId: pending.vendorId ?? undefined,
          },
          approverId,
          manager,
        );
      }
```

`is_cash` is never read from the pending row. `recordExpense` derives it from
`paymentMethod`, so exactly one place decides it and the two cannot disagree.

- [ ] **Step 5: Run the approvals suite**

```bash
npx nx test backend --testPathPattern="payment-approval"
```

Expected: PASS.

- [ ] **Step 6: Typecheck, lint, commit**

```bash
npm run typecheck && npm run lint
git add apps/backend/src/modules/payment-approvals
git commit -m "feat(approvals): a vendor payment waits for the same two pairs of eyes"
```

---

## Task 5: Routes and request DTOs

**Files:**
- Modify: `apps/backend/src/modules/ledger/dto/ledger-request.dto.ts`
- Modify: `apps/backend/src/modules/ledger/controllers/ledger.controller.ts`

**Interfaces:**
- Consumes: Task 4's DTO and service changes.
- Produces: `RecordExpenseDto.vendorId?: string`; new `RecordVendorPaymentDto`; new route `POST /projects/:projectId/ledger/vendor-payments`.

- [ ] **Step 1: Add `vendorId` to `RecordExpenseDto`**

```ts
  @ApiPropertyOptional({ description: 'The vendor billed. Required when paymentMethod is credit.' })
  @IsUUID()
  @IsOptional()
  vendorId?: string;
```

- [ ] **Step 2: Add `RecordVendorPaymentDto`**

Place it after `RecordExpenseDto` in the same file.

```ts
/**
 * Money paid to a vendor against what we owe them.
 *
 * There is no `category`: a settlement is not a new cost. The cost was recorded
 * when the bill was taken on. Categorising it again would double-count spend the
 * moment anyone groups by category.
 */
export class RecordVendorPaymentDto {
  @ApiProperty({ description: 'Amount paid, in paise', example: 5000000 })
  @IsInt()
  @IsPositive()
  amountPaise!: number;

  @ApiPropertyOptional({ description: 'The date the money left (IST). Defaults to today.' })
  @IsDateString()
  @IsOptional()
  valueDate?: string;

  @ApiProperty({ description: 'Who was paid' })
  @IsUUID()
  vendorId!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(50)
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'UTR, cheque number, or other bank reference' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  reference?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ type: [ProofDocumentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProofDocumentDto)
  @IsOptional()
  proofDocuments?: ProofDocumentDto[];
}
```

- [ ] **Step 3: Pass `vendorId` through the expense route**

In `recordExpense` on the controller, add `vendorId: dto.vendorId,` to the object
handed to `this.approvals.submit`.

- [ ] **Step 4: Add the vendor-payment route**

Directly after `recordExpense` on the controller:

```ts
  @Post('projects/:projectId/ledger/vendor-payments')
  @ApiOperation({
    summary: 'Pay a vendor what we owe them',
    description:
      'Settles a payable. Every ledger entry belongs to a project, so one cheque covering ' +
      'three projects is recorded as three lines. Waits for approval like any other money out.',
  })
  @ApiParam({ name: 'projectId', type: String })
  async recordVendorPayment(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() dto: RecordVendorPaymentDto,
  ): Promise<PendingLedgerEntryEntity> {
    return this.approvals.submit(
      {
        kind: 'vendor_payment',
        projectId,
        amountPaise: dto.amountPaise,
        valueDate: dto.valueDate,
        vendorId: dto.vendorId,
        paymentMethod: dto.paymentMethod,
        reference: dto.reference,
        notes: dto.notes,
        proofDocuments: mergeProofs(dto),
      },
      currentUser.id,
    );
  }
```

- [ ] **Step 5: Prove both routes against the running backend**

Mint a token (see `oneohm-local-verification` — a JWT is minted locally to test
permission combinations), then:

```bash
TOKEN=<jwt>; PROJECT=<a project uuid>; VENDOR=$(docker exec -e PGPASSWORD=root oneohm-postgres psql -U root -d oneohm_epc -tA -c "SELECT id FROM vendors WHERE deleted_at IS NULL LIMIT 1")
curl -s -X POST "http://localhost:8085/projects/$PROJECT/ledger/expenses" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"amountPaise\":100000,\"category\":\"materials\",\"paymentMethod\":\"credit\"}" | head -c 200
```

Expected: a 400 saying the bill has to be owed to a vendor. Repeat with
`"vendorId":"$VENDOR"` and expect a pending row with `"kind":"expense"`.

- [ ] **Step 6: Typecheck, lint, commit**

```bash
npm run typecheck && npm run lint
git add apps/backend/src/modules/ledger
git commit -m "feat(ledger): record a bill against a vendor, and pay one off"
```

---
## Task 6: Every money-out total learns about `is_cash`

**Files:**
- Modify: `apps/backend/src/modules/finance/services/finance-ledger-queries.sql.ts`
- Modify: `apps/backend/src/modules/finance/services/finance-reporting.service.ts`

**Interfaces:**
- Consumes: `is_cash`, `v_project_commissioning`, `v_vendor_payable`, `ledger_norm_category` (Task 1).
- Produces: `getKpis()` return gains `vendorPayablePaise: number`; ledger rows gain `isCash`, `vendorId`, `vendorName` and a normalised `category`.

This is the task the whole design rests on. A query missed here silently reports
an unpaid bill as cash spent. The list below is complete — work it top to bottom.

- [ ] **Step 1: `KPIS_SQL` — cash only, plus the payable total**

In the `flows` CTE, both money-out aggregates gain the filter:

```sql
      SUM(-e.amount_paise) FILTER (WHERE e.direction = 'out' AND e.is_cash)::BIGINT AS spend_paise,
      COUNT(*) FILTER (WHERE e.direction = 'out' AND e.is_cash AND e.reverses_id IS NULL)::int AS expense_count
```

Replace the whole `meters` CTE with a read of the view, so "the meter is in" has
one definition:

```sql
  -- Was a copy of this predicate inline. It now lives in v_project_commissioning
  -- so Recovery and this KPI can never drift apart.
  meters AS (
    SELECT COUNT(*)::int AS meter_installations
    FROM v_project_commissioning c
    JOIN projects pr ON pr.id = c.project_id AND pr.deleted_at IS NULL
    WHERE c.meter_completed_at::date >= $1::date
      AND c.meter_completed_at::date <= $2::date
  ),
  -- What WE owe, so the page that shows money owed to us shows both directions.
  -- A snapshot as of today, like `outstanding` — a debt does not belong to a month.
  payable AS (
    SELECT COALESCE(SUM(payable_paise) FILTER (WHERE payable_paise > 0), 0)::BIGINT AS vendor_payable_paise
    FROM v_vendor_payable
  ),
```

Add `payable.vendor_payable_paise AS "vendorPayablePaise"` to the final SELECT and
`payable` to the `FROM flows, snapshot, credit, meters` list.

Note the `FILTER (WHERE payable_paise > 0)`: a vendor advance is not a debt, and
netting it against what we owe another vendor would understate the liability.

- [ ] **Step 2: `CASH_FLOW_SQL` — cash only**

The money-out series gains `AND e.is_cash`. A bill on credit must not draw a bar
on a cash chart.

- [ ] **Step 3: `LEDGER_PAGE_SQL` and `LEDGER_COUNT_SQL` — no filter, more columns**

**Do not** add an `is_cash` filter here. This list shows everything that happened;
hiding a credit bill from the ledger is how it gets forgotten. Add to the SELECT
of `LEDGER_PAGE_SQL` only:

```sql
    e.is_cash                     AS "isCash",
    e.vendor_id                   AS "vendorId",
    vn.name                       AS "vendorName",
    ledger_norm_category(e.category) AS "category",
```

and the join `LEFT JOIN vendors vn ON vn.id = e.vendor_id`. Remove the existing
raw `e.category` line — two columns of the same name is a silent overwrite.

`LEDGER_COUNT_SQL` needs the join only if a future search touches the vendor name;
it does not today, so leave it alone.

- [ ] **Step 4: `SPEND_BY_CATEGORY_SQL` — both fixes**

```sql
export const SPEND_BY_CATEGORY_SQL = `
  SELECT
    ledger_norm_category(category)        AS "category",
    SUM(-amount_paise)::BIGINT            AS "totalPaise"
  FROM ledger_entries
  WHERE direction = 'out'
    AND is_cash
    AND value_date >= $1::date
    AND value_date <= $2::date
  GROUP BY ledger_norm_category(category)
  ORDER BY "totalPaise" DESC
`;
```

This replaces `COALESCE(category, 'misc')`, which merged the 5 blank rows into
`miscellaneous` while leaving `labour`, `labor`, `Insurance` and `Other` as four
separate slices. Nothing calls this query today (no controller route), but a
one-line guard now beats reviving the defect later.

- [ ] **Step 5: Surface `vendorPayablePaise` on the service**

In `finance-reporting.service.ts`, `getKpis` maps the row. Add
`vendorPayable: rs(r.vendorPayablePaise),` alongside the other rupee conversions,
matching whatever convention the neighbouring fields already use — read them
first, do not assume.

- [ ] **Step 6: Prove it**

```bash
docker exec -e PGPASSWORD=root oneohm-postgres psql -U root -d oneohm_epc -tA -c "
SELECT 'total spend all time, must still be 568000 paise-rupees',
       ROUND(SUM(-amount_paise) FILTER (WHERE direction='out' AND is_cash)/100.0,2)
  FROM ledger_entries;
SELECT 'meter count via view, must be 41', COUNT(*) FROM v_project_commissioning;
SELECT 'category rollup — no labour, no Other, no NULL';
SELECT ledger_norm_category(category), COUNT(*) FROM ledger_entries WHERE direction='out' GROUP BY 1 ORDER BY 2 DESC;
"
```

Expected: spend unchanged from before the migration (nothing is on credit yet),
`41`, and a category list containing only canonical values plus `uncategorised`.

- [ ] **Step 7: Typecheck, lint, commit**

```bash
npm run typecheck && npm run lint
git add apps/backend/src/modules/finance/services
git commit -m "fix(finance): a bill taken on credit is not cash out"
```

---

## Task 7: Receivables gains recovery scope and an honest bucket

**Files:**
- Modify: `apps/backend/src/modules/finance/dto/ledger-query.dto.ts`
- Modify: `apps/backend/src/modules/finance/services/finance-ledger-queries.sql.ts`
- Modify: `apps/backend/src/modules/finance/services/finance-reporting.service.ts`
- Modify: `apps/backend/src/modules/finance/controllers/finance.controller.ts`

**Interfaces:**
- Consumes: `v_project_commissioning` (Task 1).
- Produces: `ReceivablesQueryDto` gains `scope?: 'all' | 'recovery'`, `funding?: 'loan' | 'cash'`, and `bucket` gains `'no_due_date'`. Response rows gain `wantsLoan: boolean`, `financingBank: string | null`, `meterCompletedAt: string | null`, `daysSinceMeter: number | null`. The buckets block gains `noDueDate: number`, `noDueDatePaise: number`, `missingLenderProjects: number`, `recoveryProjects: number`.

- [ ] **Step 1: Widen the DTO**

```ts
  @ApiPropertyOptional({
    enum: ['current', '1-30', '31-60', '61-90', '90plus', 'no_due_date'],
    description:
      'Ageing bucket. `no_due_date` is a SUBSET of `current` — money with no due date at all, ' +
      'which can be collected but cannot be forecast.',
  })
  @IsIn(['current', '1-30', '31-60', '61-90', '90plus', 'no_due_date'])
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  bucket?: 'current' | '1-30' | '31-60' | '61-90' | '90plus' | 'no_due_date';

  @ApiPropertyOptional({
    enum: ['all', 'recovery'],
    description:
      '`recovery` keeps only projects whose net meter is installed — the job is delivered and ' +
      'the money is still open. Never reads projects.status, which is not maintained: 7 rows ' +
      'claim completed while 41 have the meter in.',
  })
  @IsIn(['all', 'recovery'])
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  scope?: 'all' | 'recovery';

  @ApiPropertyOptional({ enum: ['loan', 'cash'], description: 'Reads customer_properties.wants_loan.' })
  @IsIn(['loan', 'cash'])
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  funding?: 'loan' | 'cash';
```

- [ ] **Step 2: Extend `RECEIVABLES_JOINS`**

```sql
  FROM v_milestone_balance v
  JOIN projects pr                   ON pr.id = v.project_id AND pr.deleted_at IS NULL
  LEFT JOIN customer_properties prop ON prop.id = pr.property_id
  LEFT JOIN customer_profiles cp     ON cp.id = prop.customer_id
  LEFT JOIN v_project_commissioning com ON com.project_id = pr.id
```

A LEFT join, not an inner one, so the default `scope = all` is unaffected. The
`recovery` scope is expressed as a predicate below rather than by swapping join
types, so one join clause serves every query.

- [ ] **Step 3: Extend `RECEIVABLES_FILTERS`**

Renumber the existing placeholders and append two. `$1` bucket, `$2` search stay;
`$3` scope and `$4` funding are new, and the page query's sort/limit/offset shift
to `$5`–`$8`. **Update every caller's argument array in the same edit** — a
shifted placeholder that nobody renumbers is a silent wrong-column filter.

```sql
    AND (
      $1::text IS NULL
      OR ($1 = 'current'     AND v.days_overdue <= 0)
      OR ($1 = '1-30'        AND v.days_overdue BETWEEN 1 AND 30)
      OR ($1 = '31-60'       AND v.days_overdue BETWEEN 31 AND 60)
      OR ($1 = '61-90'       AND v.days_overdue BETWEEN 61 AND 90)
      OR ($1 = '90plus'      AND v.days_overdue > 90)
      OR ($1 = 'no_due_date' AND v.due_date IS NULL)
    )
    AND ($3::text IS NULL OR $3 <> 'recovery' OR com.project_id IS NOT NULL)
    AND (
      $4::text IS NULL
      OR ($4 = 'loan' AND prop.wants_loan = true)
      OR ($4 = 'cash' AND COALESCE(prop.wants_loan, false) = false)
    )
```

`COALESCE(prop.wants_loan, false)` on the cash branch: a milestone whose project
has no property row would otherwise vanish from both segments, and money that
appears in neither tab is worse than money in the wrong one.

- [ ] **Step 4: Add the new output columns**

In `RECEIVABLES_SQL`'s SELECT:

```sql
    COALESCE(prop.wants_loan, false)                AS "wantsLoan",
    prop.financing_bank                             AS "financingBank",
    to_char(com.meter_completed_at, 'YYYY-MM-DD')   AS "meterCompletedAt",
    CASE WHEN com.meter_completed_at IS NULL THEN NULL
         ELSE (CURRENT_DATE - com.meter_completed_at::date)::int
    END                                             AS "daysSinceMeter",
```

`daysSinceMeter` is NULL, never 0, for the one project whose meter task predates
activity logging. Zero would read as "commissioned today".

- [ ] **Step 5: Extend `RECEIVABLES_BUCKETS_SQL`**

Add to the SELECT:

```sql
    COUNT(*) FILTER (WHERE v.due_date IS NULL)                          AS "noDueDate",
    COALESCE(SUM(v.balance_paise) FILTER (WHERE v.due_date IS NULL), 0) AS "noDueDatePaise",
    COUNT(DISTINCT pr.id)                                              AS "recoveryProjects",
    -- Defect 5: a loan project with no lender milestone means the customer is
    -- being chased for the bank's share. Counted, never repaired — a 10/70/20
    -- guess would silently move money off a customer's name.
    COUNT(DISTINCT pr.id) FILTER (
      WHERE COALESCE(prop.wants_loan, false)
        AND NOT EXISTS (SELECT 1 FROM payment_milestones m2
                         WHERE m2.project_id = pr.id AND m2.payer_type = 'lender')
    )                                                                  AS "missingLenderProjects",
```

and add the same `scope`/`funding` predicates from Step 3 to its WHERE clause, so
the chips describe the list actually on screen. It keeps ignoring `bucket` — that
is deliberate, so selecting one chip does not zero the others.

- [ ] **Step 6: Thread the params through service and controller**

`getReceivables` gains `scope` and `funding` in its options object and passes them
to all three queries in the right positions. `finance.controller.ts` passes
`query.scope` and `query.funding` straight down.

- [ ] **Step 7: Prove the segments against the spec's numbers**

```bash
docker exec -e PGPASSWORD=root oneohm-postgres psql -U root -d oneohm_epc -tA -c "
SELECT CASE WHEN cp.wants_loan THEN 'LOAN' ELSE 'CASH' END,
       COUNT(DISTINCT p.id), ROUND(SUM(v.balance_paise)/100.0,2)
FROM v_milestone_balance v
JOIN projects p ON p.id=v.project_id AND p.deleted_at IS NULL
JOIN customer_properties cp ON cp.id=p.property_id
JOIN v_project_commissioning c ON c.project_id=p.id
WHERE v.status='active' AND v.balance_paise>0 GROUP BY 1;
"
```

Expected exactly: `CASH|23|1322346.38` and `LOAN|15|499575.72`.

Then hit the API and confirm it agrees:

```bash
curl -s "http://localhost:8085/finance/receivables?scope=recovery&funding=cash&limit=1" -H "Authorization: Bearer $TOKEN" | head -c 400
```

- [ ] **Step 8: Typecheck, lint, commit**

```bash
npm run typecheck && npm run lint
git add apps/backend/src/modules/finance
git commit -m "feat(finance): the money still owed on a job that is already done"
```

---

## Task 8: `GET /finance/payables`

**Files:**
- Create: `apps/backend/src/modules/finance/services/finance-payables-queries.sql.ts`
- Create: `apps/backend/src/modules/finance/dto/payables-query.dto.ts`
- Modify: `apps/backend/src/modules/finance/dto/index.ts`
- Modify: `apps/backend/src/modules/finance/services/finance-reporting.service.ts`
- Modify: `apps/backend/src/modules/finance/controllers/finance.controller.ts`

**Interfaces:**
- Consumes: `v_vendor_payable` (Task 1).
- Produces: `GET /finance/payables` returning `{ data: PayableRow[], total, page, limit, totals: { totalPayablePaise, vendorsOwedCount, advancePaise } }` where `PayableRow = { vendorId, vendorName, vendorCode, creditDays, payablePaise, billedPaise, paidPaise, oldestBillDate, billCount, daysPastTerms, isInactive }`.

- [ ] **Step 1: Write the SQL module**

```ts
/**
 * What we owe each vendor.
 *
 * `daysPastTerms` is null when there is no bill or no agreed credit period —
 * "0 days late" against terms nobody set would be an invented fact.
 *
 * A soft-deleted vendor still carrying a balance is INCLUDED, flagged inactive.
 * Money must not disappear because someone tidied a list.
 */
export const PAYABLES_PAGE_SQL = `
  SELECT
    p.vendor_id                                   AS "vendorId",
    p.name                                        AS "vendorName",
    p.code                                        AS "vendorCode",
    p.credit_days                                 AS "creditDays",
    p.payable_paise                               AS "payablePaise",
    p.billed_paise                                AS "billedPaise",
    p.paid_paise                                  AS "paidPaise",
    to_char(p.oldest_bill_date, 'YYYY-MM-DD')     AS "oldestBillDate",
    p.bill_count                                  AS "billCount",
    CASE WHEN p.oldest_bill_date IS NULL OR p.credit_days IS NULL THEN NULL
         ELSE GREATEST(CURRENT_DATE - (p.oldest_bill_date + p.credit_days * INTERVAL '1 day')::date, 0)::int
    END                                           AS "daysPastTerms",
    (p.deleted_at IS NOT NULL)                    AS "isInactive"
  FROM v_vendor_payable p
  WHERE ($1::text IS NULL OR p.name ILIKE '%' || $1 || '%' OR p.code ILIKE '%' || $1 || '%')
    AND ($2::boolean IS NOT TRUE OR p.payable_paise <> 0)
    AND (p.deleted_at IS NULL OR p.payable_paise <> 0)
  ORDER BY p.payable_paise DESC, p.name
  LIMIT $3 OFFSET $4
`;

export const PAYABLES_COUNT_SQL = `
  SELECT COUNT(*)::int AS count
  FROM v_vendor_payable p
  WHERE ($1::text IS NULL OR p.name ILIKE '%' || $1 || '%' OR p.code ILIKE '%' || $1 || '%')
    AND ($2::boolean IS NOT TRUE OR p.payable_paise <> 0)
    AND (p.deleted_at IS NULL OR p.payable_paise <> 0)
`;

/**
 * Headline figures, from the server.
 *
 * Debts and advances are summed SEPARATELY and never netted. Owing one vendor
 * Rs 1,00,000 while holding a Rs 20,000 advance with another is not an Rs 80,000
 * liability — it is a debt and a credit, and they are settled with different people.
 */
export const PAYABLES_TOTALS_SQL = `
  SELECT
    COALESCE(SUM(payable_paise) FILTER (WHERE payable_paise > 0), 0)::BIGINT  AS "totalPayablePaise",
    COUNT(*) FILTER (WHERE payable_paise > 0)::int                            AS "vendorsOwedCount",
    COALESCE(SUM(-payable_paise) FILTER (WHERE payable_paise < 0), 0)::BIGINT AS "advancePaise"
  FROM v_vendor_payable
  WHERE ($1::text IS NULL OR name ILIKE '%' || $1 || '%' OR code ILIKE '%' || $1 || '%')
`;
```

- [ ] **Step 2: Write the query DTO**

`search?: string`, `onlyOwing?: boolean` (`@Transform` the string `'true'`),
`page` and `limit` copied from `ReceivablesQueryDto` so paging behaves identically
across the module. Export it from `dto/index.ts`.

- [ ] **Step 3: Add the service method and the route**

`getPayables(options)` runs the three queries in a `Promise.all`, exactly as
`getReceivables` does. The controller route:

```ts
  @Get('payables')
  @ApiOperation({
    summary: 'What we owe each vendor',
    description:
      'A net balance per vendor — bills taken on credit, less what has been paid. No ' +
      'bill-by-bill matching: a net figure cannot drift from the rows behind it. A negative ' +
      'balance is an advance, not a debt, and is reported separately rather than netted off.',
  })
  async getPayables(@Query() query: PayablesQueryDto) { … }
```

Declare it **before** any `:param` route on this controller so the literal path is
not captured, the same way `payment-approvals/summary` already is.

- [ ] **Step 4: Prove it**

```bash
curl -s "http://localhost:8085/finance/payables" -H "Authorization: Bearer $TOKEN"
```

Expected today: two vendors, every `payablePaise` `0`, totals all `0`. Then record
and approve one ₹1,000 credit bill and confirm that vendor reads `100000`.

- [ ] **Step 5: Typecheck, lint, commit**

```bash
npm run typecheck && npm run lint
git add apps/backend/src/modules/finance
git commit -m "feat(finance): who we owe, and how far past their terms"
```

---
## Task 9: The approval queue shows who acted, and in what role

**Files:**
- Modify: `apps/backend/src/modules/payment-approvals/services/payment-approval-queries.sql.ts`
- Modify: `apps/backend/src/modules/payment-approvals/services/payment-approval.service.ts`

**Interfaces:**
- Consumes: `pending_ledger_entries.vendor_id` (Task 1).
- Produces: `ApprovalRow` gains `submittedByRoles: string | null`, `reviewedByRoles: string | null`, `vendorName: string | null`, `isCredit: boolean`.

This is the one gap in an otherwise complete two-tier flow: the queue already
names the recorder, but not the capacity they acted in.

- [ ] **Step 1: Add the role lists to both queries**

Add to the SELECT of `APPROVALS_PAGE_SQL` and `APPROVAL_BY_ID_SQL`:

```sql
    -- A list, not one value: 32 users hold more than one role, and picking one
    -- arbitrarily would misreport the capacity someone acted in. Ordered most
    -- senior first (roles.level ascending, 0 = super_admin).
    (SELECT STRING_AGG(r.name, ', ' ORDER BY r.level, r.name)
       FROM user_roles ur JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = p.submitted_by)                                  AS "submittedByRoles",
    (SELECT STRING_AGG(r.name, ', ' ORDER BY r.level, r.name)
       FROM user_roles ur JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = p.reviewed_by)                                   AS "reviewedByRoles",
    p.vendor_id                                                           AS "vendorId",
    vn.name                                                               AS "vendorName",
    (p.payment_method = 'credit')                                         AS "isCredit",
```

and the join `LEFT JOIN vendors vn ON vn.id = p.vendor_id` to both.

Correlated subqueries rather than a join: joining `user_roles` would multiply the
approval rows by each user's role count and silently inflate the page total.

- [ ] **Step 2: Widen the `ApprovalRow` interface**

```ts
export interface ApprovalRow extends Omit<PendingLedgerEntryEntity, 'createdAt' | 'updatedAt'> {
  // …existing fields…
  /** Comma-separated, most senior first. Null for a user with no role granted. */
  submittedByRoles?: string | null;
  reviewedByRoles?: string | null;
  vendorName?: string | null;
  /** True when approving records an obligation rather than moving cash. */
  isCredit?: boolean;
}
```

- [ ] **Step 3: Make `previewImpact` honest about a vendor payment**

`previewImpact` runs the milestone waterfall, which means nothing for money out.
Return the vendor's balance instead:

```ts
    if (pending.kind === 'vendor_payment') {
      const [row] = await this.dataSource.query<Array<{ payablePaise: string }>>(
        `SELECT payable_paise AS "payablePaise" FROM v_vendor_payable WHERE vendor_id = $1`,
        [pending.vendorId],
      );
      const before = Number(row?.payablePaise ?? 0);
      return {
        lines: [
          {
            label: 'Payable before',
            amountPaise: before,
          },
          {
            label: 'Payable after',
            amountPaise: before - Math.abs(pending.amountPaise),
          },
        ],
        unallocatedPaise: 0,
      };
    }
```

Match `ImpactLine`'s actual field names — read the interface before writing this;
the two labels above are the intent, not necessarily the exact property names.

- [ ] **Step 4: Prove the roles come back**

```bash
curl -s "http://localhost:8085/payment-approvals?limit=3" -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import json,sys; [print(r['submittedByName'], '|', r.get('submittedByRoles')) for r in json.load(sys.stdin)['data']]"
```

Expected: each pending row prints a name and at least one role name.

- [ ] **Step 5: Typecheck, lint, commit**

```bash
npm run typecheck && npm run lint
npx nx test backend --testPathPattern="payment-approval"
git add apps/backend/src/modules/payment-approvals
git commit -m "feat(approvals): say what role the person who recorded this holds"
```

---

## Task 10: Web data layer

**Files:**
- Modify: `apps/web/lib/hooks/resources/ledger.ts`
- Modify: `apps/web/lib/hooks/resources/payment-approvals.ts`
- Modify: `apps/web/lib/config/routes.ts`
- Modify: `apps/web/lib/config/navigation.ts`

**Interfaces:**
- Consumes: Tasks 6–9's API shapes.
- Produces: `ReceivableFilters` gains `scope`, `funding`, and `'no_due_date'`; `Receivable` gains the four new fields; `ReceivablesPage.buckets` gains four counters; new `usePayables(filters)`; new `useRecordVendorPayment(projectId)`; `LedgerEntry` gains `isCash`, `vendorId`, `vendorName`; `ROUTES.FINANCE.PAYABLES`.

- [ ] **Step 1: Widen the receivables types**

```ts
export interface ReceivableFilters {
  bucket?: 'current' | '1-30' | '31-60' | '61-90' | '90plus' | 'no_due_date';
  /** `recovery` = the net meter is in and money is still open. */
  scope?: 'all' | 'recovery';
  funding?: 'loan' | 'cash';
  search?: string;
  sortBy?: 'daysOverdue' | 'outstandingAmount' | 'dueDate' | 'customerName';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
```

On `Receivable`:

```ts
  wantsLoan: boolean;
  /** A BANKS code or a typed name. Render through `bankLabel`. */
  financingBank?: string | null;
  meterCompletedAt?: string | null;
  /**
   * Null, never 0, when the meter task predates activity logging. Zero would
   * read as "commissioned today" on a project commissioned months ago.
   */
  daysSinceMeter?: number | null;
```

On `buckets`: `noDueDate: number; noDueDatePaise: Paise; recoveryProjects: number; missingLenderProjects: number;`

- [ ] **Step 2: Add the payables types and hook**

```ts
export interface PayableRow {
  vendorId: string;
  vendorName: string;
  vendorCode: string;
  creditDays?: number | null;
  /** NEGATIVE means we have paid ahead — an advance, not a debt. */
  payablePaise: Paise;
  billedPaise: Paise;
  paidPaise: Paise;
  oldestBillDate?: string | null;
  billCount: number;
  daysPastTerms?: number | null;
  isInactive: boolean;
}

export interface PayablesPage extends Paginated<PayableRow> {
  totals: { totalPayablePaise: Paise; vendorsOwedCount: number; advancePaise: Paise };
}

export function usePayables(
  filters: { search?: string; onlyOwing?: boolean; page?: number; limit?: number } = {},
): UseQueryResult<PayablesPage, AxiosError> {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== ''),
  );
  return useQuery({
    queryKey: [...ledgerKeys.root(), 'payables', params],
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<PayablesPage>('/finance/payables', { params, signal });
      return data;
    },
    staleTime: 30_000,
  });
}
```

- [ ] **Step 3: Add the vendor-payment mutation**

Inside `useLedgerMutations`, beside `recordExpense`, following its exact
invalidation and toast pattern — read `recordExpense` first and mirror it. It must
also invalidate the payables key, or the Payables page shows a stale balance right
after a payment is approved:

```ts
  const recordVendorPayment = useMutation({
    mutationFn: async (input: {
      amountPaise: number; valueDate: string; vendorId: string;
      paymentMethod?: string; reference?: string; notes?: string;
      proofDocument?: ProofDocumentInput;
    }) => {
      const { data } = await apiClient.post<PaymentApproval>(
        `/projects/${projectId}/ledger/vendor-payments`,
        input,
      );
      return data;
    },
    onSuccess: () => {
      showToast.success('Sent for approval', 'No money moves until it is approved.');
      void queryClient.invalidateQueries({ queryKey: ledgerKeys.root() });
    },
    onError: (e: AxiosError) => showToast.error('Could not submit', getErrorMessage(e)),
  });
```

- [ ] **Step 4: Widen `LedgerEntry` and `PaymentApproval`**

`LedgerEntry` gains `isCash?: boolean; vendorId?: string | null; vendorName?: string | null;`
`PaymentApproval` gains `submittedByRoles?: string | null; reviewedByRoles?: string | null; vendorName?: string | null; isCredit?: boolean;`

- [ ] **Step 5: Route and nav**

In `routes.ts`, beside `RECEIVABLES`: `PAYABLES: '/finance/payables',` and its
`[ROUTES.FINANCE.PAYABLES]: 'finance',` entry in the route-permission map.

In `navigation.ts`, a fourth item in the `MONEY` section, placed **between**
Receivables and Payment Approvals so money-in and money-out sit together:

```ts
            {
              id: 'finance-payables',
              permission: 'finance.view',
              icon: Wallet,
              label: 'Payables',
              href: ROUTES.FINANCE.PAYABLES,
            },
```

Import `Wallet` from `lucide-react` alongside the existing icons. Update the
section's comment, which currently says "Two items, down from nine".

- [ ] **Step 6: Typecheck, lint, commit**

```bash
npm run typecheck && npm run lint
git add apps/web/lib
git commit -m "feat(web): types and routing for recovery and payables"
```

---

## Task 11: The shared bank select, and the attach-bank dialog

**Files:**
- Create: `apps/web/components/features/shared/bank-select.tsx`
- Create: `apps/web/components/features/ledger/attach-bank-dialog.tsx`
- Modify: `apps/web/components/features/onboarding/components/onboarding-wizard/index.tsx`

**Interfaces:**
- Consumes: `BANKS`, `BANK_OTHER`, `BANK_CATEGORY_LABELS`, `BANK_CATEGORY_ORDER`, `bankLabel` from `@tejas96/shared/constants`.
- Produces: `<BankSelect value onChange label? required? error? />` where `value` is a BANKS code or a typed name; `<AttachBankDialog open onClose propertyId customerName projectNumber outstandingPaise currentValue />`.

- [ ] **Step 1: Extract the select**

Find the bank field currently rendered inside the onboarding wizard and move its
markup verbatim into `bank-select.tsx` as a controlled component. It owns one
piece of state — whether "Other" is showing — and nothing else.

```tsx
/**
 * Pick the bank financing a property.
 *
 * `financing_bank` is one free-text column holding EITHER a `BANKS` code OR a
 * name typed under Other, so there is nothing to strip on send and no
 * cross-field rule to keep in sync across two apps. `bankLabel` renders both.
 *
 * Extracted from the onboarding wizard so the wizard and the recovery dialog
 * render one list. Two hand-maintained copies of a grouped bank list is how the
 * two drift, and the wizard is where the missing data this dialog repairs comes
 * from in the first place.
 */
export function BankSelect({ value, onChange, label = 'Financing bank', required = false, error }: BankSelectProps): JSX.Element
```

Then make the wizard import and use it. Its behaviour must not change — the
wizard is the source of this data and a regression there is worse than the gap
this feature fixes.

- [ ] **Step 2: Write the dialog**

```tsx
/**
 * Attach a bank to a property, from the row where the gap was noticed.
 *
 * 149 of 153 loan properties have no bank on file, so a collector looking at
 * Recovery — Loan cannot tell which bank to call. Sending them to the property
 * edit wizard to fix one field loses their filters and their place in the list.
 *
 * Saves one field and nothing else. This deliberately does NOT split the bank's
 * share off the customer's: "who do I call" has one right answer per property,
 * "how much is theirs" has no safe default, and guessing 10/70/20 would silently
 * move money off a customer's name.
 */
export function AttachBankDialog({ open, onClose, propertyId, customerName, projectNumber, outstandingPaise, currentValue }: AttachBankDialogProps): JSX.Element
```

Body: customer, project number and `formatPaise(outstandingPaise)` read-only at
the top so the user can see who they are answering for, then one `<BankSelect>`.
Save calls `PATCH /customers/properties/:propertyId` with `{ financingBank }`,
then invalidates `ledgerKeys.root()` so the row updates in place.

**Send `null`, not `undefined`, to clear it.** A PATCH with `undefined` silently
fails to clear an optional field in this codebase.

Gate the save with `useGatedAction('customers.edit', …, 'Attach bank')` — it
writes a customer property, not a ledger row.

- [ ] **Step 3: Verify in the browser**

Start or attach the web server, then open a property that has `wants_loan` and no
bank. Confirm: the grouped list renders Nationalised / Private / NBFC; a listed
bank saves; Other reveals a text box and saves trimmed; reopening shows the saved
value. Confirm the onboarding wizard still saves a bank exactly as before.

Read `web-local-verification` before debugging any console error here: a Next dev
server left running across a refactor serves stale build errors that name files
already fixed. Restart it and read the console in a **new tab** before believing it.

- [ ] **Step 4: Typecheck, lint, commit**

```bash
npm run typecheck && npm run lint
git add apps/web/components/features/shared apps/web/components/features/ledger/attach-bank-dialog.tsx apps/web/components/features/onboarding
git commit -m "feat(web): name the bank from the screen that noticed it was missing"
```

---
## Task 12: Record expense — a vendor, and paying on credit

**Files:**
- Modify: `apps/web/components/features/inventory/components/shared/vendor-picker.tsx`
- Modify: `apps/web/components/features/ledger/record-money-dialog.tsx`

**Interfaces:**
- Consumes: `recordExpense` mutation (Task 10), `PaymentMethod.CREDIT` (Task 2).
- Produces: `VendorPickerControlled` exported for non-react-hook-form callers.

- [ ] **Step 1: Export the controlled picker**

`vendor-picker.tsx` exports only the react-hook-form wrapper, and
`RecordMoneyDialog` uses plain `useState`. Export the inner controlled component
rather than pulling RHF into a dialog that does not need it:

```tsx
export interface VendorPickerControlledProps { … }   // rename `ControlledProps`
export function VendorPickerControlled({ … })        // add `export`
```

No behaviour change. The RHF wrapper keeps using it exactly as it does now.

- [ ] **Step 2: Add vendor state to the dialog**

```tsx
  const [vendorId, setVendorId] = useState('');
  const [vendorQuery, setVendorQuery] = useState('');
```

Reset both in `reset()` alongside the other fields.

- [ ] **Step 3: Render the picker and Credit, on the expense side only**

Inside the `isReceipt ? … : (…)` expense branch, above Category:

```tsx
              <VendorPickerControlled
                value={vendorId}
                onChange={setVendorId}
                inputValue={vendorQuery}
                onInputChange={setVendorQuery}
                label="Vendor"
                required={onCredit}
                placeholder="Search vendors"
                error={
                  onCredit && !vendorId ? 'A credit bill has to be owed to someone.' : undefined
                }
                options={vendorOptions}
                loading={vendorsLoading}
              />
```

Hide the free-text `payee` field once `vendorId` is set. Two fields naming the
same party is how `labour` and `labor` both reached the ledger.

`credit` joins the method list automatically — the select maps
`Object.values(PaymentMethod)` — but `m.toUpperCase()` renders it `CREDIT`, which
reads like a shout next to `UPI`. Give it an explicit label:

```tsx
            options={Object.values(PaymentMethod).map((m) => ({
              value: m,
              label: m === PaymentMethod.CREDIT ? 'Credit (pay later)' : m.toUpperCase(),
            }))}
```

- [ ] **Step 4: Say what Credit does, before they submit**

```tsx
  const onCredit = !isReceipt && method === PaymentMethod.CREDIT;
```

and in `MUIDialogDescription`:

```tsx
          {isReceipt
            ? 'Enter the date the money actually arrived — not today, if it came in earlier.'
            : onCredit
              ? 'No cash leaves now. This becomes a payable you settle later.'
              : 'Company cost. This never changes what the customer owes.'}
```

`Credit` is hidden entirely on the receipt side: money cannot be *received* on
credit, and the database refuses it, so offering the option would be a trap.

- [ ] **Step 5: Block submit and send the field**

```tsx
  const valid = parsedAmount.ok && valueDate <= todayIst() && (!onCredit || Boolean(vendorId));
```

and add `vendorId: vendorId || undefined,` to the `recordExpense.mutateAsync` body.

- [ ] **Step 6: Verify in the browser**

Open a project's Money tab → Record expense. Confirm: picking Credit changes the
description and makes Vendor required; submit stays disabled until a vendor is
chosen; submitting creates a **pending** row; the Cash page KPIs do **not** move.

Then check the row directly:

```bash
docker exec -e PGPASSWORD=root oneohm-postgres psql -U root -d oneohm_epc -tA -c "
SELECT kind, payment_method, vendor_id IS NOT NULL AS has_vendor, status
FROM pending_ledger_entries ORDER BY submitted_at DESC LIMIT 1"
```

Expected: `expense|credit|t|pending`.

- [ ] **Step 7: Typecheck, lint, commit**

```bash
npm run typecheck && npm run lint
git add apps/web/components/features/inventory apps/web/components/features/ledger/record-money-dialog.tsx
git commit -m "feat(web): buy on credit, from a vendor you can name"
```

---

## Task 13: Pay vendor dialog

**Files:**
- Create: `apps/web/components/features/ledger/pay-vendor-dialog.tsx`

**Interfaces:**
- Consumes: `useLedgerMutations(projectId).recordVendorPayment` (Task 10), `PayableRow` (Task 10).
- Produces: `<PayVendorDialog open onClose vendor />` where `vendor: PayableRow`.

- [ ] **Step 1: Write it**

```tsx
/**
 * Settle what we owe a vendor.
 *
 * The project picker is required and is not an accident of the schema: every
 * ledger entry belongs to a project, so one cheque covering three projects is
 * three lines. Saying that in the dialog is cheaper than a support call.
 *
 * Paying more than the balance is allowed. A vendor advance is ordinary in this
 * trade, and refusing it would push people into recording a false amount.
 */
export function PayVendorDialog({ open, onClose, vendor }: PayVendorDialogProps): JSX.Element
```

Layout, top to bottom:

1. Read-only header: vendor name, and `formatPaise(vendor.payablePaise)` labelled
   **"Currently owed"**, or **"Advance held"** when the balance is negative.
2. Amount, defaulting to `paiseToRupees(Math.max(vendor.payablePaise, 0)).toFixed(2)`,
   editable. Part payments are ordinary.
3. Date, defaulting to `todayIst()`, capped at today — copy the exact validation
   from `RecordMoneyDialog`, including the future-date message.
4. Project picker, **required**, with helper text: *"Every ledger entry belongs to
   a project. One cheque covering three projects is recorded as three lines."*
5. Method — the same list **minus** `CREDIT`. Settling a credit bill with more
   credit is not a payment, and the backend refuses it.
6. Reference and Notes.

Warn inline, not blocking, when the amount exceeds the balance:

> ₹15,000 more than we owe. The extra becomes an advance with this vendor.

Use the same `inFlight` ref guard as `RecordMoneyDialog` — two clicks in one tick
both read the pre-render value of a state flag, so state cannot stop a double
submission.

Gate with `useGatedAction('finance.payments.record', …, 'Pay vendor')`.

- [ ] **Step 2: Verify**

Rendered from the Payables page in Task 14, so verify it there. Confirm
submitting creates a pending row with `kind = 'vendor_payment'`.

- [ ] **Step 3: Typecheck, lint, commit**

```bash
npm run typecheck && npm run lint
git add apps/web/components/features/ledger/pay-vendor-dialog.tsx
git commit -m "feat(web): pay a vendor down, or pay them ahead"
```

---

## Task 14: The Payables page

**Files:**
- Create: `apps/web/components/features/ledger/payables-columns.tsx`
- Create: `apps/web/components/features/ledger/finance-payables-page.tsx`
- Create: `apps/web/app/(dashboard)/finance/payables/page.tsx`

**Interfaces:**
- Consumes: `usePayables` (Task 10), `PayVendorDialog` (Task 13).
- Produces: the `/finance/payables` screen.

- [ ] **Step 1: Columns**

Vendor (with an **Inactive** chip when `isInactive`), Payable, Oldest bill, Past
terms, Bills, and a ⋮ row menu whose first item is **Pay**.

Two rules, both from house convention:

```tsx
// A negative payable is an advance, not a debt. Rendering it as "-₹20,000" in
// the same column as money owed reads as a mistake; naming it does not.
payablePaise < 0 ? `Advance ${formatPaise(-payablePaise)}` : formatPaise(payablePaise)

// Null past-terms renders em-dash, never "0 days". There is no agreed credit
// period on this vendor, so "on time" is not a fact we hold.
daysPastTerms == null ? '—' : `${daysPastTerms} days`
```

The row menu stays visible, never hover-only.

- [ ] **Step 2: The page**

Copy the structure of `finance-receivables-page.tsx` exactly — overline, title,
one-line explanation, KPI cards, `CrmTable`. Three KPI cards: **Total payable**,
**Vendors owed**, **Advances paid**. Every figure from `query.data?.totals`;
nothing summed client-side.

Explanation line:

> What we owe vendors — bills taken on credit, less what has been paid. A net
> balance per vendor, not bill by bill.

Quick filters: `All vendors` / `Owing only` (`onlyOwing`).

Empty message: `Nothing owed to anyone.`

- [ ] **Step 3: The route shim**

```tsx
import { type JSX } from 'react';

import { FinancePayablesPage } from '@/components/features/ledger/finance-payables-page';

export default function PayablesPage(): JSX.Element {
  return <FinancePayablesPage />;
}
```

- [ ] **Step 4: Verify in the browser**

Navigate to `/finance/payables`. Confirm the nav item appears between Receivables
and Payment Approvals. Confirm two vendors, all zeros.

Then walk the whole loop: record a ₹1,000 credit bill → approve it as a different
user → the vendor shows **₹1,000** → Pay ₹400 → approve → the vendor shows
**₹600** and the Cash page's Spent rose by ₹400 but not by ₹1,000.

With the Browser pane hidden, `window.innerWidth` reports 0 and every responsive
class drops out. Call `resize_window` with an explicit width before judging the
layout, and confirm claims from the network response rather than a screenshot.

- [ ] **Step 5: Typecheck, lint, commit**

```bash
npm run typecheck && npm run lint
git add apps/web/components/features/ledger apps/web/app/\(dashboard\)/finance/payables
git commit -m "feat(web): a page for the money going the other way"
```

---

## Task 15: Receivables — recovery scope, honest chips, the loan banner

**Files:**
- Modify: `apps/web/components/features/ledger/finance-receivables-page.tsx`
- Modify: `apps/web/components/features/ledger/receivables-columns.tsx`

**Interfaces:**
- Consumes: `ReceivableFilters.scope` / `.funding` (Task 10), `AttachBankDialog` (Task 11).
- Produces: the three-way scope control and the recovery columns.

- [ ] **Step 1: Scope state and control**

```tsx
type Scope = 'all' | 'recovery-cash' | 'recovery-loan';
const [scope, setScope] = useState<Scope>('all');
```

Render a `ToggleButtonGroup` above the ageing chips with the three options
`All open` / `Recovery — Cash` / `Recovery — Loan`. One control, three states.
Changing it resets `page` to 0, as every other filter here does.

Map it to the query:

```tsx
  const query = useReceivables({
    scope: scope === 'all' ? undefined : 'recovery',
    funding: scope === 'recovery-cash' ? 'cash' : scope === 'recovery-loan' ? 'loan' : undefined,
    bucket, search: search || undefined, /* …unchanged… */
  });
```

- [ ] **Step 2: Rename the Current chip**

```tsx
      { key: 'current', label: 'Not due yet', count: buckets?.current, tone: 'success', dot: true },
```

`Current` merged ₹3.3L genuinely not yet due with ₹72.2L that has no due date at
all, and read as "under control". No seventh chip is added — see Step 3.

- [ ] **Step 3: The forecasting note**

Under the **Total outstanding** KPI card, when `buckets.noDueDate > 0`:

```tsx
  ₹72,22,805.60 of this has no due date — it cannot be forecast. Show these →
```

built from `formatPaise(buckets.noDueDatePaise)`, with the link setting
`bucket = 'no_due_date'`. The fact is visible and actionable without another
control. Per §2.4 of the spec this is a **forecasting** gap, not hidden debt —
178 of those 198 milestones have zero work done. Word it that way; an alarm here
would be wrong.

- [ ] **Step 4: The loan banner**

Above the table, only when `scope === 'recovery-loan'` and
`buckets.missingLenderProjects > 0`:

```tsx
  {buckets.missingLenderProjects} of {buckets.recoveryProjects} loan projects have no bank
  share recorded. You may be chasing the customer for the bank's money.
```

Warning tone, not danger — it is a data gap, not an overdue debt.

- [ ] **Step 5: Recovery columns**

In `receivables-columns.tsx`, export a second array `RECOVERY_COLUMNS` that
reuses the existing column objects and appends two:

- **Since meter** — `daysSinceMeter == null ? '—' : `${daysSinceMeter}d``. Never 0.
- **Bank** — `bankLabel(row.financingBank)`, or an **Add bank** button when
  `wantsLoan && !financingBank`, opening `AttachBankDialog`. Not muted text: it
  tells a collector about a problem they cannot fix from where they stand.

The page picks `scope === 'all' ? RECEIVABLE_COLUMNS : RECOVERY_COLUMNS`.

- [ ] **Step 6: Verify against the spec's numbers**

Open `/finance/receivables`. Confirm, exactly:

| Tab | Expect |
|---|---|
| Recovery — Cash | 23 projects, ₹13,22,346.38 |
| Recovery — Loan | 15 projects, ₹4,99,575.72, banner showing |
| Not due yet chip | 202 milestones |
| The no-due-date link | 198 milestones, ₹72,22,805.60 |

Click **Add bank** on a loan row with none. Confirm the row updates in place with
**no reload and no lost filter or scroll position**.

- [ ] **Step 7: Typecheck, lint, commit**

```bash
npm run typecheck && npm run lint
git add apps/web/components/features/ledger
git commit -m "feat(web): the money still owed on a job already delivered"
```

---
## Task 16: Project Money tab — the margin fix

**Files:**
- Modify: `apps/web/components/features/projects/components/project-detail/lib/derive.ts`
- Modify: `apps/web/components/features/ledger/project-money-tab.tsx`
- Modify: `apps/web/components/features/ledger/cash-columns.tsx`

**Interfaces:**
- Consumes: `committedUnpaidPaise` and the corrected `waivedPaise` (Task 6 / Task 1).
- Produces: cost-based margin; `waivedRemainderPaise` deleted.

- [ ] **Step 1: Delete the waived workaround**

`waivedRemainderPaise` in `derive.ts` exists only to repair the old `waivedPaise`,
which reported a waived milestone's *expected* amount. The backend now reports the
unpaid remainder, so this helper double-corrects and under-reports the write-off.

Delete it and point every caller at `summary.waivedPaise`. Leaving both in place
is worse than leaving neither.

- [ ] **Step 2: Make margin cost-based**

```tsx
  /**
   * Cost, not cash.
   *
   * `spentPaise` is cash that has left. A bill taken on credit is a cost the
   * project already carries, and leaving it out reported a project holding
   * Rs 1,00,000 of unpaid material bills as Rs 1,00,000 more profitable than it
   * is — with the 80%-of-contract warning staying silent on top.
   *
   * Paying the vendor next month does not make the job more profitable this month.
   */
  const costPaise = s.spentPaise + (s.committedUnpaidPaise ?? 0);
  const marginPaise = s.contractPaise > 0 ? s.contractPaise - costPaise : null;
  const usedPct = s.contractPaise > 0 ? Math.round((costPaise / s.contractPaise) * 100) : 0;
```

**"Spent" stays `s.spentPaise`.** It is a cash figure and its label says so. Only
margin and the overrun warning move to cost.

- [ ] **Step 3: Show the unpaid bills, once**

Directly under the figures, only when `s.committedUnpaidPaise > 0`:

```tsx
  + {formatPaise(s.committedUnpaidPaise)} owed to vendors, not yet paid
```

One line, one home. This is why margin and Spent differ, said plainly rather than
left for someone to work out.

- [ ] **Step 4: Mark credit rows in the entries list**

In `cash-columns.tsx`, a row with `isCash === false` gets an **Unpaid** chip and
shows `vendorName`. A `vendor_payment` row reads `Paid {vendorName}`.

Two rows for one cost is correct and reads correctly, because only one of them is
cash — but only if both are labelled.

- [ ] **Step 5: Verify**

Open a project with a credit bill recorded and approved. Confirm: Spent excludes
it, margin includes it, the "owed to vendors" line shows the right figure, and the
entry carries an Unpaid chip.

Then cross-foot a waived project against §2.2 of the spec:

```bash
docker exec -e PGPASSWORD=root oneohm-postgres psql -U root -d oneohm_epc -tA -c "
SELECT ROUND(contract_paise/100.0,2) contract, ROUND(received_paise/100.0,2) received,
       ROUND(outstanding_paise/100.0,2) outstanding, ROUND(waived_paise/100.0,2) written_off
FROM v_project_balance vb JOIN projects p ON p.id=vb.project_id
WHERE p.project_number='PRJ-ONEOHM_EPC-2026-0225'"
```

Expected: `160537.66|30000.00|16053.77|114483.89`, and those last three sum to the
contract exactly. The old value was `144483.89`, which overshot by ₹30,000.

- [ ] **Step 6: Typecheck, lint, commit**

```bash
npm run typecheck && npm run lint
git add apps/web/components/features
git commit -m "fix(projects): an unpaid bill is not profit"
```

---

## Task 17: Approvals, Cash page, and the last two surfaces

**Files:**
- Modify: `apps/web/components/features/payment-approvals/columns.tsx`
- Modify: `apps/web/components/features/payment-approvals/approval-review-drawer.tsx`
- Modify: `apps/web/components/features/ledger/finance-cash-page.tsx`
- Modify: `apps/web/components/features/inventory/components/vendor-detail-page.tsx`
- Modify: `apps/web/components/features/dashboard/business/components/money-owed-card.tsx`

**Interfaces:**
- Consumes: `submittedByRoles` / `isCredit` / `vendorName` (Task 9), `vendorPayablePaise` (Task 6), `usePayables` (Task 10).
- Produces: nothing downstream. This task closes every remaining surface.

- [ ] **Step 1: Roles in the approvals table**

Under `submittedByName` in the `submittedByName` cell:

```tsx
    renderCell: (row) => (
      <Stack spacing={0}>
        <span>{row.submittedByName ?? <Empty />}</span>
        {row.submittedByRoles ? (
          <span style={{ fontSize: crm['text-row-sm'], color: color['text-tertiary'] }}>
            {row.submittedByRoles}
          </span>
        ) : null}
      </Stack>
    ),
```

- [ ] **Step 2: Roles and the credit chip in the drawer**

Change the existing line to name the capacity:

```tsx
  Submitted by {data.submittedByName ?? 'unknown'}
  {data.submittedByRoles ? ` (${data.submittedByRoles})` : ''} on {…}
```

Add the same for the reviewer on a reviewed row. Above the amount, when
`data.isCredit`:

```tsx
  On credit · {data.vendorName}. Approving records what we owe. No cash moves.
```

An approver must know which of the two they are signing off.

- [ ] **Step 3: The Cash page tiles**

Add a sixth tile beside **Outstanding**:

```tsx
    {
      label: 'Owed to vendors',
      value: data?.vendorPayable ?? 0,
    },
```

Money owed *to* us and *by* us now sit on one screen. Make the existing **Meter
installations** tile a link to `/finance/receivables` — a count that already
exists becomes a way in. Match whatever link affordance the other tiles use; do
not invent a new one.

- [ ] **Step 4: Vendor detail**

Add a **Payable** tile to `vendor-detail-page.tsx`, reading the single row from
`usePayables({ search: vendor.code })` or a direct fetch — follow whichever
pattern the page's existing KPI tiles use. Same **Advance** wording for a negative
balance as the Payables page, so one concept has one name.

- [ ] **Step 5: The business dashboard**

Add an **Owed to vendors** figure beside the existing money-owed card so the
business view shows both directions.

**Do not change how the money-owed card buckets anything.** Its provider already
drops milestones with no due date
(`finance.provider.ts`: `v.days_overdue > 0 OR (v.due_date IS NOT NULL AND …)`),
and per §2.4 of the spec that is correct — the work behind that money is not done.
It looks like a bug and is not one.

- [ ] **Step 6: Verify every surface**

Walk each one in the browser: approvals table shows a role under each name; the
drawer shows the credit line; the Cash page shows the payable tile and the meter
tile links through; the vendor page shows its balance; the dashboard shows both
directions.

- [ ] **Step 7: Typecheck, lint, commit**

```bash
npm run typecheck && npm run lint
git add apps/web/components/features
git commit -m "feat(web): say who recorded it, and show what we owe beside what we are owed"
```

---

## Task 18: Whole-flow verification

**Files:** none. This task changes nothing and exists to catch what per-task checks miss.

- [ ] **Step 1: Full checks**

```bash
npm run typecheck && npm run lint && npm run test
```

Expected: all clean. `consumer-contract.spec.ts` passing is the proof that the
consumer app is untouched — milestone meaning did not change, and that test pins
the four payment-term statuses the app reads.

- [ ] **Step 2: The end-to-end walk**

Through the UI only. No API calls, no SQL, no scripts standing in for a user.

1. Record an expense on Credit against a vendor. Cash KPIs do **not** move.
2. The approval queue shows it with the recorder's name **and role**, and a Credit chip.
3. Approve as a **different** user. It appears on Finance → Payables.
4. The project's Money tab shows the Unpaid line and **margin dropped**.
5. Pay part of it. It queues for approval.
6. Approve. Cash out moves; the payable drops by exactly that amount.
7. Reverse the credit bill. The payable falls; **cash is untouched**.
8. Receivables → Recovery — Cash: 23 projects, ₹13,22,346.38.
9. Recovery — Loan: 15 projects, ₹4,99,575.72, banner showing.
10. **Add bank** on a row with none: saves in place, no reload, filters kept.
11. The no-due-date link: 198 milestones, ₹72,22,805.60.
12. Cross-foot a waived project. It balances to the paisa.

- [ ] **Step 3: Try to break it**

```bash
docker exec -e PGPASSWORD=root oneohm-postgres psql -U root -d oneohm_epc -tA -c "
-- No credit row may exist without a vendor.
SELECT 'orphan credit rows, must be 0', COUNT(*) FROM ledger_entries WHERE NOT is_cash AND vendor_id IS NULL;
-- No money IN may be on credit.
SELECT 'credit receipts, must be 0', COUNT(*) FROM ledger_entries WHERE NOT is_cash AND direction = 'in';
-- A reversal must match its target's cash flag.
SELECT 'reversals disagreeing with their target, must be 0', COUNT(*)
  FROM ledger_entries r JOIN ledger_entries o ON o.id = r.reverses_id
 WHERE r.is_cash <> o.is_cash;
-- The payable must equal bills minus payments, vendor by vendor.
SELECT 'payable rows that do not reconcile, must be 0', COUNT(*)
  FROM v_vendor_payable WHERE payable_paise <> billed_paise - paid_paise;
-- The cross-foot identity, still holding.
SELECT 'projects off the identity, must be 12 (the cancelled ones)', COUNT(*)
  FROM (SELECT project_id, SUM(allocated_paise) a,
               COALESCE(SUM(balance_paise) FILTER (WHERE status='active'),0) o,
               COALESCE(SUM(balance_paise) FILTER (WHERE status='waived'),0) w,
               SUM(expected_paise) c
          FROM v_milestone_balance GROUP BY 1) t
 WHERE c <> a + o + w;
"
```

Every count must be `0` except the last, which must be `12`.

- [ ] **Step 4: Open the pull request**

```bash
git push -u origin feat/finance-recovery-payables
gh pr create --fill
```

---

## Self-Review

Checked against the spec on 2026-09-13.

**Spec coverage.** Every section maps to a task: §4.1 migration → Task 1; §4.2 the
three shapes → Tasks 2–3; §4.3 `ledger_norm_category` → Tasks 1, 6; §4.4–4.5 views
→ Task 1; §4.6 `v_project_balance` → Tasks 1, 16; §5.0 the query checklist →
Tasks 6, 7, 9; §5.1 receivables filters → Task 7; §5.2 payables → Task 8; §5.3
vendor payments → Task 5; §5.4 DTOs → Tasks 4, 5; §5.5 roles → Task 9; §6.1 +
6.1.1 → Tasks 11, 15; §6.2 payables page → Task 14; §6.3 cash page → Task 17;
§6.4 money tab → Task 16; §6.5 approvals → Task 17; §6.6 expense dialog → Task 12;
§6.7 pay dialog → Task 13; §6.8 dashboard and §6.9 vendor detail → Task 17; §7
RBAC → gates named in Tasks 11, 12, 13; §8 edge cases → covered where they arise,
re-checked in Task 18; §10 verification → Tasks 1, 7, 14, 15, 16, 18.

**Placeholders.** None. Task 1 Step 3 says "copy the existing view and make these
three edits" with all three written out rather than pasting 60 unchanged lines —
that is an instruction, not a gap. Task 17 Steps 4 and 5 say to follow the page's
existing KPI pattern rather than inventing markup, which is the right instruction
for a two-tile addition to a page this plan does not otherwise restructure.

**Type consistency.** `is_cash`/`isCash`, `vendor_id`/`vendorId`,
`committed_unpaid_paise`/`committedUnpaidPaise`, `payable_paise`/`payablePaise`
and `daysSinceMeter` are spelled identically everywhere they appear.
`recordVendorPayment` is the service method, the mutation and the controller
handler, all three. `VendorPickerControlled` is exported in Task 12 before Task 12
uses it.

**One risk worth naming.** Task 7 Step 3 renumbers SQL placeholders. A caller left
un-renumbered filters on the wrong column and returns plausible, wrong rows —
the one failure in this plan that would not throw. Step 7 checks the segment
totals against exact rupee figures specifically to catch it.
