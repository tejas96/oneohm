# Reseller Commissions — Step 1 (Backend + Web) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Commissions are born when a reseller's quote is accepted. Admin approves them and pays them through the existing approval queue. Superadmin and admin see every reseller on `/resellers`. A server-side wall keeps each reseller to his own data.

**Architecture:** Money state lives in `employee_commissions`. The screen state is **derived** in one SQL select (`COMMISSION_ROW_SQL`), so there is nothing to keep in sync. Payouts reuse `pending_ledger_entries` (new kind `commission`), and approval writes a normal `expense` ledger entry. The reseller wall is one global interceptor. It denies by default, is opened per route with `@ResellerAllowed()`, scopes lists through a forced `resellerId` filter, checks single ids with `ResellerOwnershipService`, and strips cost fields from every reseller response.

**Tech Stack:** NestJS + TypeORM (raw SQL where the house already uses it), Postgres, Next.js 15 + MUI + TanStack Query, shared lib `@tejas96/shared`.

**Spec:** `docs/superpowers/specs/2026-09-28-reseller-commissions-design.md` (branch `feat/reseller-commissions`). Read it before starting. §-numbers below refer to it.

**Step 2 (mobile)** gets its own plan after this one is merged, so it is written against the real API.

## Global Constraints

- **No new unit test files.** Verify every task by type-checking, by running the existing suites of the modules you touched, and by a live check against the local backend (port **8085**) or web (port **3001**). This is the owner's standing rule.
- **Never `migration:revert` the shared local database.** Migrations are forward-only. The `down()` exists for completeness only.
- **Never create a git worktree.** Work in `/Volumes/works-space/oneohm/oneohm` on branch `feat/reseller-commissions`. The owner was on `feat/wcr-group-h` with work in progress. **Ask before switching branches.**
- **Local WhatsApp and SMS reach real phones.** For quotes, use "Mark as sent", never "Send via WhatsApp". The approved test customer is QA-0808 (+91 9000000808).
- **Local uploads go to the production bucket.** Do not upload files in this work.
- Money: the DB stores rupees as `numeric(15,2)`. The API returns **integer paise** for every money field, named `*Paise`. The web formats with `formatPaise`.
- Commission base = `discountedBasePrice`, falling back to `basePrice − discountAmount`. **Subsidy and GST are never used.**
- Dates and periods are in **IST** (`Asia/Kolkata`). FY = April 1 to March 31.
- Permission codes (existing catalog only, nothing new): `finance.view` to see; `finance.payments.record` to act; `finance.approvals.process` for the queue; `customers.assign` to change a customer's reseller. `admin` and `super_admin` always pass.
- UI rules: the `⋮` row menu is always visible (never on hover only). A fact appears in one place only. Use "Reseller" in all copy, never "Partner".
- Commit after each task. Commit messages end with:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

## Spec amendments (made while planning; already applied to the spec)

1. **New displayed state `on_hold`.** The quote is accepted, no project exists yet, and its site is marked **lost**. Approve and Record payment are blocked. The reseller sees "On hold". The state is derived, so reopening the site clears it by itself. (Found: `customer-property.service.ts:147` lets a site with an accepted quote be marked lost before it is converted.)
2. **Payout re-check (§8 step 4).** If the commission is no longer `approved` with this request, approval **throws 409**. Nothing is posted, and the finance head rejects the request. The server does not auto-reject.
3. **Installation pricing (§7.2).** `GET /quote-calculator/installation-pricing` stays open to resellers. It is the customer rate card that the quote's line prices are built from, and the phone blocks pricing without it. `installation-pricing/all`, `quote-configurations`, `product prices` and `subsidy-configurations` admin routes stay closed.
4. **Project cost (§7.3).** Project responses carry `actualCost` (`project-response.dto.ts:133`). The redaction list therefore also removes `actualCost` and `costMultiplier`, and `profitMarginTiers` from quote config.
5. **Quote reseller (§10.4).** A new quote **always** takes `reseller_id` from its customer. The client value is ignored. On update, a quote's reseller may only be **cleared**, and only while the quote is `draft`.
7. **Edge case 26 cannot happen in code.** An accepted quote is voided only by project cancellation (`quote.service.ts:817` refuses it otherwise), so "quote voided, no project" never arises. The site-lost case is covered by `on_hold`.
8. **Nav placement (§10.1).** The web app has no "People" panel. `/resellers` goes in the **Finance** panel under a "RESELLERS" section, gated on `finance.view`.
6. **Existing data (local, 2026-09-28):** 2 commission rows, both `cancelled`, both linked to projects → `quote_id` is back-filled through `projects.quote_id`. 11 resellers, 2 of them with a NULL rate. Only 1 customer has `lead_source = 'reseller'`.

## File map

**Shared (`libs/shared/src`)**
- `types/enums/finance.enum.ts` — `ExpenseCategory.COMMISSION`
- `constants/labels.ts` — its label
- `utils/commission.ts` — **new.** Base, amount, state types and labels. The one place the maths lives.
- `utils/index.ts` — export it

**Backend (`apps/backend/src`)**
- `database/migrations/1857300000000-ResellerCommissions.ts` — **new**
- `common/reseller/*` — **new.** The wall: decorator, context, ownership, interceptor, redaction, module
- `modules/employees/commissions/`
  - `entities/employee-commission.entity.ts` — new columns
  - `commission-birth.module.ts`, `services/commission-birth.service.ts` — **new.** Birth at acceptance, with no module imports (avoids cycles)
  - `sql/commission-read.sql.ts` — **new.** Row select with the derived state
  - `sql/commission-payout.sql.ts` — **new.** Paid and release helpers that run inside the queue's transaction
  - `services/commission-actions.service.ts` — **new.** Approve, edit, cancel, record payment, close recovery
  - `services/reseller-dashboard.service.ts`, `sql/reseller-dashboard.sql.ts` — **new.** Metrics, the missing list, and the "me" summary
  - `controllers/employee-commission.controller.ts` — **rewritten**
  - `controllers/reseller-dashboard.controller.ts` — **new**
  - `dto/commission-actions.dto.ts` — **new.** The old DTOs are deleted.
  - `utils/require-permission.ts` — **new**
  - deleted: `services/employee-commission.service.ts`, `repositories/employee-commission.repository.ts`, `dto/create-commission.dto.ts`, `dto/update-commission.dto.ts`, `dto/update-commission-status.dto.ts`, `dto/commission-response.dto.ts`
- `modules/payment-approvals/*` — kind `commission`
- `modules/ledger/services/ledger-write.service.ts` — `reference` on expenses
- `modules/projects/services/project-cancellation.service.ts` — quote join, payout cancel
- `modules/quotes/services/quote.service.ts` — birth hook, reseller from customer
- `modules/customers/*` — `reseller_id`, the lead-source rule, reseller change, scoping
- `modules/employees/*` — drop the dead counters, lock the profile kind, scoping
- Every controller in the §7.2 route table (Task 10–12)
- `app.module.ts` — register `ResellerModule`

**Web (`apps/web`)**
- `lib/config/routes.ts`, `lib/config/navigation.ts`, `lib/rbac/route-map.ts`
- `lib/hooks/resources/resellers.ts` — **new**
- `components/features/resellers/*` — **new** (pages, columns, dialogs, strip)
- `app/(dashboard)/resellers/page.tsx`, `app/(dashboard)/resellers/[id]/page.tsx` — **new**
- `lib/hooks/resources/payment-approvals.ts` and the approvals page — kind label
- `components/features/onboarding/components/onboarding-wizard/*` — reseller picker
- `app/(dashboard)/layout.tsx` — reseller web block

## Local tooling (used by many tasks)

Start the servers with the Browser pane `preview_start` names `backend` and `web` (from `/Volumes/works-space/oneohm/.claude/launch.json`). Never start them from Bash.

**Mint a token** (API checks only; UI walks use real logins):

```bash
cd /Volumes/works-space/oneohm/oneohm && node -e "require('dotenv').config({path:'apps/backend/.env'});const jwt=require('jsonwebtoken');const [sub,roles,perms]=process.argv.slice(1);console.log(jwt.sign({sub,roles:roles?roles.split(','):[],permissions:perms?perms.split(','):[]},process.env.JWT_SECRET,{expiresIn:'2h'}))" "<users.id>" "<roles csv>" "<permissions csv>"
```

**Read-only SQL:**

```bash
docker exec oneohm-postgres psql -U root -d oneohm_epc -c "<select ...>"
```

**Pick test people:**

```bash
docker exec oneohm-postgres psql -U root -d oneohm_epc -c "select ep.id as reseller_id, ep.user_id, u.first_name, ep.commission_percentage from employee_profiles ep join users u on u.id = ep.user_id where ep.profile_kind='reseller' and ep.deleted_at is null order by u.first_name limit 5"
```

---

### Task 0: Branch check

- [ ] **Step 1: Confirm the branch with the owner**

Run: `git -C /Volumes/works-space/oneohm/oneohm status --short && git -C /Volumes/works-space/oneohm/oneohm branch --show-current`
If the current branch is not `feat/reseller-commissions`, **stop and ask the owner** whether to switch now. Then run `git switch feat/reseller-commissions` and `git merge --ff-only origin/main` (or rebase if main moved).

- [ ] **Step 2: Confirm the spec already carries the amendments**

They were applied to the spec when this plan was written. Run: `grep -n "On hold" docs/superpowers/specs/2026-09-28-reseller-commissions-design.md`. Expected: a hit in §6.1. If it is missing, you are on an older branch tip, so stop and ask.

---

### Task 1: Shared maths, enums and labels

**Files:**
- Create: `libs/shared/src/utils/commission.ts`
- Modify: `libs/shared/src/utils/index.ts`
- Modify: `libs/shared/src/types/enums/finance.enum.ts` (the `ExpenseCategory` enum)
- Modify: `libs/shared/src/constants/labels.ts` (`EXPENSE_CATEGORY_LABELS`)

**Interfaces:**
- Produces: `commissionBase(pricing) → { base: number; source: CommissionBaseSource }`, `commissionAmount(base: number, ratePercent: number) → number` (rupees, 2 dp), `type CommissionState`, `COMMISSION_STATE_LABEL`, `RESELLER_STATE_LABEL`, `ExpenseCategory.COMMISSION`.

- [ ] **Step 1: Create `libs/shared/src/utils/commission.ts`**

```ts
/**
 * Reseller commission maths — the ONE place it lives.
 *
 * The server freezes a commission with these functions, and the reseller's
 * phone shows "Your commission at this price" with the same ones, so the two
 * can never disagree by a paisa.
 *
 * The base is the price BEFORE GST, AFTER discount. Subsidy is government
 * money paid to the customer and never enters this file.
 */

export type CommissionBaseSource = 'discounted_base' | 'derived' | 'manual' | 'missing';
export type CommissionRateSource = 'profile' | 'manual' | 'missing';

/** The slice of `quote_snapshot.pricing` this needs. Every field may be absent on old quotes. */
export interface CommissionPricingInput {
  basePrice?: number | string | null;
  discountAmount?: number | string | null;
  discountedBasePrice?: number | string | null;
}

function num(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

export function commissionBase(pricing: CommissionPricingInput | null | undefined): {
  base: number;
  source: CommissionBaseSource;
} {
  if (!pricing) return { base: 0, source: 'missing' };

  const discounted = num(pricing.discountedBasePrice);
  if (discounted !== null && discounted >= 0) {
    return { base: round2(discounted), source: 'discounted_base' };
  }

  const base = num(pricing.basePrice);
  if (base !== null) {
    const discount = Math.max(0, num(pricing.discountAmount) ?? 0);
    return { base: round2(Math.max(0, base - discount)), source: 'derived' };
  }

  return { base: 0, source: 'missing' };
}

/**
 * base × rate / 100, rounded half-up to the paisa.
 *
 * Done in integers: rupees → paise, rate → basis points. Floating point would
 * make ₹3,90,000 × 3% come out as 11699.999… on some inputs.
 */
export function commissionAmount(base: number, ratePercent: number): number {
  if (!Number.isFinite(base) || !Number.isFinite(ratePercent) || base <= 0 || ratePercent <= 0) {
    return 0;
  }
  const basePaise = Math.round(base * 100);
  const rateBp = Math.round(ratePercent * 100);
  return Math.round((basePaise * rateBp) / 10_000) / 100;
}

/** The state a screen shows. Derived server-side from status + project + queue; never stored. */
export type CommissionState =
  | 'pending'
  | 'needs_amount'
  | 'on_hold'
  | 'waiting_for_project'
  | 'approved'
  | 'payment_in_review'
  | 'paid'
  | 'to_recover'
  | 'recovered'
  | 'cancelled';

/** Office words (web). */
export const COMMISSION_STATE_LABEL: Record<CommissionState, string> = {
  pending: 'Pending',
  needs_amount: 'Needs amount',
  on_hold: 'On hold — site lost',
  waiting_for_project: 'Waiting for project',
  approved: 'Approved',
  payment_in_review: 'Payment in review',
  paid: 'Paid',
  to_recover: 'To recover',
  recovered: 'Recovered',
  cancelled: 'Cancelled',
};

/** Reseller words (phone). The office's internal steps collapse into what he cares about. */
export const RESELLER_STATE_LABEL: Record<CommissionState, string> = {
  pending: 'Pending',
  needs_amount: 'Pending',
  on_hold: 'On hold',
  waiting_for_project: 'Approved',
  approved: 'Approved',
  payment_in_review: 'Approved',
  paid: 'Paid',
  to_recover: 'Cancelled — owed back',
  recovered: 'Cancelled — settled',
  cancelled: 'Cancelled',
};
```

- [ ] **Step 2: Export it**

Add to `libs/shared/src/utils/index.ts`, next to the other `export *` lines:

```ts
export * from './commission';
```

- [ ] **Step 3: Add the expense category and its label**

In `libs/shared/src/types/enums/finance.enum.ts`, add a member to `ExpenseCategory` after `MISC = 'misc',`:

```ts
  /** Reseller commission, written only by the commission payout approval. */
  COMMISSION = 'commission',
```

In `libs/shared/src/constants/labels.ts`, add to `EXPENSE_CATEGORY_LABELS`:

```ts
  [ExpenseCategory.COMMISSION]: 'Commission',
```

- [ ] **Step 4: Verify**

Run: `cd /Volumes/works-space/oneohm/oneohm && npm run typecheck:libs && npm run typecheck:backend && npm run typecheck:web`
Expected: all three pass. `EXPENSE_CATEGORY_LABELS` is a `Record<ExpenseCategory, …>`, so a missing label fails here. That is the point of the check.

Run the maths once by hand:

```bash
cd /Volumes/works-space/oneohm/oneohm && npx tsx -e "import {commissionBase,commissionAmount} from './libs/shared/src/utils/commission'; console.log(commissionAmount(390000,3), commissionAmount(337679.78,4), commissionAmount(0,3), JSON.stringify(commissionBase({basePrice:400000,discountAmount:10000})), JSON.stringify(commissionBase(null)))"
```

Expected: `11700 13507.19 0 {"base":390000,"source":"derived"} {"base":0,"source":"missing"}`. The second value matches the real row already in the local DB.

- [ ] **Step 5: Commit**

```bash
git add libs/shared/src
git commit -m "feat(shared): commission maths, states and the commission expense category

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Migration and entities

**Files:**
- Create: `apps/backend/src/database/migrations/1857300000000-ResellerCommissions.ts`
- Modify: `apps/backend/src/modules/employees/commissions/entities/employee-commission.entity.ts`
- Modify: `apps/backend/src/modules/customers/entities/customer-profile.entity.ts`
- Modify: `apps/backend/src/modules/employees/entities/employee-profile.entity.ts` (drop 4 counters)
- Modify: `apps/backend/src/modules/employees/dto/employee-response.dto.ts:200-215`, `apps/backend/src/modules/employees/services/employee.service.ts:405-411`, `apps/backend/src/modules/employees/repositories/employee-profile.repository.ts:153-159` (remove the counter fields)
- Modify: `apps/backend/src/modules/payment-approvals/entities/pending-ledger-entry.entity.ts:12`

**Interfaces:**
- Produces: the `employee_commissions` columns `quote_id` (unique), `base_amount`, `base_source`, `rate_source`, `payout_request_id`, `payout_rejected_reason`, `expense_entry_id`, `recovered_amount` and `cancel_reason`. Also `customer_profiles.reseller_id` and `PendingKind` now including `'commission'`.

- [ ] **Step 1: Write the migration**

```ts
import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Reseller commissions (spec 2026-09-28).
 *
 * - customer_profiles.reseller_id: which reseller brought the customer in.
 * - employee_commissions is keyed by the QUOTE. The project is found through
 *   projects.quote_id, so project_id goes: a copy that nothing keeps in step.
 *   Existing rows are back-filled through their project before it is dropped.
 * - The four stored counters on employee_profiles go. Three were never
 *   written; the fourth drifted. Everything is computed live now.
 * - pending_ledger_entries accepts kind 'commission'.
 *
 * New CHECKs are NOT VALID: they bind every new write without failing on
 * rows written by hand before this existed. Task 17 validates them locally.
 *
 * Forward-only in practice. Never revert this on the shared database.
 */
export class ResellerCommissions1857300000000 implements MigrationInterface {
  name = 'ResellerCommissions1857300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Customer → reseller
    await queryRunner.query(`ALTER TABLE customer_profiles ADD COLUMN reseller_id uuid NULL`);
    await queryRunner.query(
      `ALTER TABLE customer_profiles ADD CONSTRAINT fk_customer_profiles_reseller
         FOREIGN KEY (reseller_id) REFERENCES employee_profiles(id) ON DELETE RESTRICT`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_customer_profiles_reseller ON customer_profiles(reseller_id)
         WHERE deleted_at IS NULL`,
    );

    // 2. Commission → quote, back-filled through the project
    await queryRunner.query(`ALTER TABLE employee_commissions ADD COLUMN quote_id uuid NULL`);
    await queryRunner.query(
      `UPDATE employee_commissions c SET quote_id = p.quote_id
         FROM projects p WHERE p.id = c.project_id AND c.quote_id IS NULL`,
    );
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM employee_commissions WHERE quote_id IS NULL) THEN
          RAISE EXCEPTION 'employee_commissions has rows with no quote. Fix them by hand first; do not guess a quote.';
        END IF;
        IF EXISTS (SELECT quote_id FROM employee_commissions GROUP BY quote_id HAVING count(*) > 1) THEN
          RAISE EXCEPTION 'Two employee_commissions rows share a quote. Resolve by hand first.';
        END IF;
      END $$;`);
    await queryRunner.query(`ALTER TABLE employee_commissions ALTER COLUMN quote_id SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE employee_commissions ADD CONSTRAINT fk_employee_commissions_quote
         FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE RESTRICT`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX uq_employee_commissions_quote ON employee_commissions(quote_id)`,
    );

    // 3. Reshape
    await queryRunner.query(
      `ALTER TABLE employee_commissions RENAME COLUMN project_value TO base_amount`,
    );
    await queryRunner.query(`
      ALTER TABLE employee_commissions
        ADD COLUMN base_source varchar(20) NOT NULL DEFAULT 'manual',
        ADD COLUMN rate_source varchar(20) NOT NULL DEFAULT 'manual',
        ADD COLUMN payout_request_id uuid NULL
          REFERENCES pending_ledger_entries(id) ON DELETE SET NULL,
        ADD COLUMN payout_rejected_reason text NULL,
        ADD COLUMN expense_entry_id uuid NULL
          REFERENCES ledger_entries(id) ON DELETE RESTRICT,
        ADD COLUMN recovered_amount numeric(15,2) NULL,
        ADD COLUMN cancel_reason text NULL`);
    // Rows before this were made by hand, so 'manual' is the true source.
    await queryRunner.query(`
      ALTER TABLE employee_commissions
        ALTER COLUMN base_source DROP DEFAULT,
        ALTER COLUMN rate_source DROP DEFAULT`);
    await queryRunner.query(
      `UPDATE employee_commissions SET status = 'pending' WHERE status IS NULL`,
    );
    await queryRunner.query(`
      ALTER TABLE employee_commissions
        ALTER COLUMN status SET NOT NULL,
        ALTER COLUMN status SET DEFAULT 'pending'`);
    await queryRunner.query(`ALTER TABLE employee_commissions DROP COLUMN project_id`);

    // 4. Checks — NOT VALID, see the class comment
    await queryRunner.query(`
      ALTER TABLE employee_commissions
        ADD CONSTRAINT chk_ec_status CHECK (status IN ('pending','approved','paid','cancelled')) NOT VALID,
        ADD CONSTRAINT chk_ec_rate CHECK (commission_percentage BETWEEN 0 AND 100) NOT VALID,
        ADD CONSTRAINT chk_ec_base CHECK (base_amount >= 0) NOT VALID,
        ADD CONSTRAINT chk_ec_amount CHECK (commission_amount >= 0) NOT VALID,
        ADD CONSTRAINT chk_ec_base_source
          CHECK (base_source IN ('discounted_base','derived','manual','missing')) NOT VALID,
        ADD CONSTRAINT chk_ec_rate_source
          CHECK (rate_source IN ('profile','manual','missing')) NOT VALID,
        ADD CONSTRAINT chk_ec_paid_has_expense
          CHECK (status <> 'paid' OR expense_entry_id IS NOT NULL) NOT VALID,
        ADD CONSTRAINT chk_ec_recovery
          CHECK (recovered_at IS NULL OR (status = 'paid' AND recovered_amount IS NOT NULL
                 AND recovered_amount >= 0 AND recovered_amount <= commission_amount)) NOT VALID`);

    // 5. Commission history must never vanish with a profile
    await queryRunner.query(
      `ALTER TABLE employee_commissions DROP CONSTRAINT IF EXISTS FK_employee_commissions_employee_id`,
    );
    await queryRunner.query(
      `ALTER TABLE employee_commissions DROP CONSTRAINT IF EXISTS "FK_employee_commissions_employee_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE employee_commissions ADD CONSTRAINT fk_employee_commissions_employee
         FOREIGN KEY (employee_id) REFERENCES employee_profiles(id) ON DELETE RESTRICT`,
    );

    // 6. The queue accepts commission payouts
    await queryRunner.query(`ALTER TABLE pending_ledger_entries DROP CONSTRAINT chk_ple_kind`);
    await queryRunner.query(
      `ALTER TABLE pending_ledger_entries ADD CONSTRAINT chk_ple_kind
         CHECK (kind IN ('receipt','expense','reversal','vendor_payment','commission'))`,
    );

    // 7. Dead counters
    await queryRunner.query(`
      ALTER TABLE employee_profiles
        DROP COLUMN IF EXISTS total_leads_generated,
        DROP COLUMN IF EXISTS total_projects_converted,
        DROP COLUMN IF EXISTS total_revenue_generated,
        DROP COLUMN IF EXISTS total_commission_earned`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE employee_profiles
        ADD COLUMN total_leads_generated integer,
        ADD COLUMN total_projects_converted integer,
        ADD COLUMN total_revenue_generated numeric(15,2),
        ADD COLUMN total_commission_earned numeric(15,2)`);
    await queryRunner.query(`ALTER TABLE pending_ledger_entries DROP CONSTRAINT chk_ple_kind`);
    await queryRunner.query(
      `ALTER TABLE pending_ledger_entries ADD CONSTRAINT chk_ple_kind
         CHECK (kind IN ('receipt','expense','reversal','vendor_payment'))`,
    );
    await queryRunner.query(`ALTER TABLE employee_commissions ADD COLUMN project_id uuid NULL`);
    await queryRunner.query(
      `UPDATE employee_commissions c SET project_id = p.id FROM projects p WHERE p.quote_id = c.quote_id`,
    );
    await queryRunner.query(`
      ALTER TABLE employee_commissions
        DROP CONSTRAINT chk_ec_status, DROP CONSTRAINT chk_ec_rate, DROP CONSTRAINT chk_ec_base,
        DROP CONSTRAINT chk_ec_amount, DROP CONSTRAINT chk_ec_base_source,
        DROP CONSTRAINT chk_ec_rate_source, DROP CONSTRAINT chk_ec_paid_has_expense,
        DROP CONSTRAINT chk_ec_recovery,
        DROP COLUMN base_source, DROP COLUMN rate_source, DROP COLUMN payout_request_id,
        DROP COLUMN payout_rejected_reason, DROP COLUMN expense_entry_id,
        DROP COLUMN recovered_amount, DROP COLUMN cancel_reason`);
    await queryRunner.query(
      `ALTER TABLE employee_commissions RENAME COLUMN base_amount TO project_value`,
    );
    await queryRunner.query(`DROP INDEX uq_employee_commissions_quote`);
    await queryRunner.query(
      `ALTER TABLE employee_commissions DROP CONSTRAINT fk_employee_commissions_quote, DROP COLUMN quote_id`,
    );
    await queryRunner.query(`DROP INDEX idx_customer_profiles_reseller`);
    await queryRunner.query(
      `ALTER TABLE customer_profiles DROP CONSTRAINT fk_customer_profiles_reseller, DROP COLUMN reseller_id`,
    );
  }
}
```

- [ ] **Step 2: Find the real FK name before running**

Run: `docker exec oneohm-postgres psql -U root -d oneohm_epc -At -c "select conname from pg_constraint where conrelid='employee_commissions'::regclass and contype='f'"`
If the employee FK has a name other than the two that step 5 drops, add a `DROP CONSTRAINT IF EXISTS <that name>` line. Postgres folds unquoted names to lower case, so the two variants cover the migration that created it.

- [ ] **Step 3: Update `EmployeeCommissionEntity`**

Replace the `project_id` / `projectValue` columns and add the new ones. Every numeric column gets a transformer, because Postgres returns `numeric` as a string:

```ts
const money = {
  to: (v?: number | null) => v,
  from: (v?: string | null) => (v === null || v === undefined ? null : Number(v)),
};

  @Column({ name: 'quote_id', type: 'uuid' })
  quoteId!: string;

  @Column({ name: 'base_amount', type: 'decimal', precision: 15, scale: 2, transformer: money })
  baseAmount!: number;

  @Column({ name: 'base_source', type: 'varchar', length: 20 })
  baseSource!: CommissionBaseSource;

  @Column({ name: 'rate_source', type: 'varchar', length: 20 })
  rateSource!: CommissionRateSource;

  @Column({ name: 'payout_request_id', type: 'uuid', nullable: true })
  payoutRequestId?: string | null;

  @Column({ name: 'payout_rejected_reason', type: 'text', nullable: true })
  payoutRejectedReason?: string | null;

  @Column({ name: 'expense_entry_id', type: 'uuid', nullable: true })
  expenseEntryId?: string | null;

  @Column({ name: 'recovered_amount', type: 'decimal', precision: 15, scale: 2, nullable: true, transformer: money })
  recoveredAmount?: number | null;

  @Column({ name: 'cancel_reason', type: 'text', nullable: true })
  cancelReason?: string | null;
```

Also add `transformer: money` to `commissionPercentage` and `commissionAmount`, and change `status` to `@Column({ type: 'varchar', length: 50, default: CommissionStatus.PENDING })` (NOT NULL). Replace `@Index(['employeeId', 'status'])` with the same line and add `@Index(['quoteId'], { unique: true })`. Import `CommissionBaseSource` and `CommissionRateSource` from `@tejas96/shared/utils`.

- [ ] **Step 4: Update the other entities**

`customer-profile.entity.ts`, in the Source Tracking block:

```ts
  /** The reseller who brought this customer in. Set only by the server (spec §10.4). */
  @Column({ name: 'reseller_id', type: 'uuid', nullable: true })
  resellerId?: string | null;
```

`employee-profile.entity.ts`: delete the four `total*` columns (lines ~151–173). Delete the same four fields from `employee-response.dto.ts`, `employee.service.ts` (the update-payload type at ~405) and `employee-profile.repository.ts` (~153).

`pending-ledger-entry.entity.ts:12`:

```ts
export type PendingKind = 'receipt' | 'expense' | 'reversal' | 'vendor_payment' | 'commission';
```

- [ ] **Step 5: Run the migration and look at the result**

Run: `cd /Volumes/works-space/oneohm/oneohm/apps/backend && npm run migration:run`
Expected: `ResellerCommissions1857300000000` is executed and no exception is raised.

Run:

```bash
docker exec oneohm-postgres psql -U root -d oneohm_epc -c "select id, quote_id, base_amount, commission_percentage, commission_amount, status, base_source, rate_source from employee_commissions"
```

Expected: the 2 existing rows, each with a `quote_id` (`979f3bac…` and `e1193aee…`), `base_source = manual`.

- [ ] **Step 6: Type-check. The compiler lists every use of the removed fields.**

Run: `cd /Volumes/works-space/oneohm/oneohm && npm run typecheck:backend`
Expected: errors **only** in `employee-commission.service.ts`, `employee-commission.repository.ts`, the old commission DTOs, and `project-cancellation.service.ts`. Tasks 3–6 replace those files. Delete these now so the build is green:

```bash
cd /Volumes/works-space/oneohm/oneohm/apps/backend/src/modules/employees/commissions && git rm services/employee-commission.service.ts repositories/employee-commission.repository.ts dto/create-commission.dto.ts dto/update-commission.dto.ts dto/update-commission-status.dto.ts dto/commission-response.dto.ts
```

Temporarily reduce `employee-commission.controller.ts` to an empty `@Controller('commissions') export class EmployeeCommissionController {}`. Temporarily reduce the module's providers and exports to `[]`, and `dto/index.ts` to `export {};`. In `project-cancellation.service.ts`, change `c.project_id = $1` (two places, lines ~93 and ~202) to the quote join now:

```sql
-- line ~93 (inside the transaction), full replacement in Task 6; for now:
UPDATE employee_commissions c SET status = 'cancelled', updated_at = now()
  FROM projects p
 WHERE p.id = $1 AND p.quote_id = c.quote_id AND c.status IN ('pending', 'approved')

-- line ~202:
(SELECT COUNT(*) FROM employee_commissions c
   JOIN projects p ON p.quote_id = c.quote_id
  WHERE p.id = $1 AND c.status = 'paid' AND c.recovered_at IS NULL)::int AS unrecovered_commissions,
```

Run `npm run typecheck:backend` again. Expected: pass.

- [ ] **Step 7: Start the backend and hit one old route**

Start the `backend` preview server, then run `preview_logs` with the search `ERROR`.
Expected: it boots and there are no TypeORM metadata errors (a wrong column name fails at boot).

- [ ] **Step 8: Commit**

```bash
git add -A apps/backend libs
git commit -m "feat(commissions): key commissions by quote; customer reseller link; drop dead counters

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Commission birth and the read model

**Files:**
- Create: `apps/backend/src/modules/employees/commissions/services/commission-birth.service.ts`
- Create: `apps/backend/src/modules/employees/commissions/commission-birth.module.ts`
- Create: `apps/backend/src/modules/employees/commissions/sql/commission-read.sql.ts`
- Modify: `apps/backend/src/modules/quotes/services/quote.service.ts` (constructor, and the ACCEPTED block at ~702)
- Modify: `apps/backend/src/modules/quotes/quotes.module.ts` (import `CommissionBirthModule`)

**Interfaces:**
- Produces: `CommissionBirthService.createForAcceptedQuote(quoteId: string, actorUserId: string, manager?: EntityManager): Promise<string | null>` and `CommissionBirthService.dismissMissing(quoteId: string, note: string, actorUserId: string): Promise<string | null>`
- Produces: `COMMISSION_ROW_SQL` (a select ending in `WHERE 1=1`, so callers append `AND …`) and `type CommissionRow` (below)

- [ ] **Step 1: The read model — `sql/commission-read.sql.ts`**

```ts
import type { CommissionBaseSource, CommissionRateSource, CommissionState } from '@tejas96/shared/utils';

/**
 * One commission row as every screen needs it, with the displayed state
 * DERIVED here — never stored — from the row, its project, its site and the
 * approval queue. Nothing to keep in step, so nothing can drift.
 *
 * Order of the CASE is the rule table in spec §6.1; do not reorder.
 * Ends with WHERE 1=1 so callers append `AND ...` with their own params.
 */
export const COMMISSION_ROW_SQL = `
SELECT c.id,
       c.employee_id                                   AS "resellerId",
       COALESCE(NULLIF(ep.company_name, ''), TRIM(u.first_name || ' ' || COALESCE(u.last_name, ''))) AS "resellerName",
       c.quote_id                                      AS "quoteId",
       q.quote_number                                  AS "quoteNumber",
       q.accepted_at                                   AS "acceptedAt",
       q.customer_id                                   AS "customerId",
       TRIM(cu.first_name || ' ' || COALESCE(cu.last_name, '')) AS "customerName",
       pr.id                                           AS "projectId",
       pr.project_number                               AS "projectNumber",
       pr.status                                       AS "projectStatus",
       ROUND(c.base_amount * 100)::bigint              AS "basePaise",
       c.commission_percentage::float8                 AS "ratePercent",
       ROUND(c.commission_amount * 100)::bigint        AS "amountPaise",
       c.base_source                                   AS "baseSource",
       c.rate_source                                   AS "rateSource",
       c.status,
       c.payout_request_id                             AS "payoutRequestId",
       ple.request_no                                  AS "payoutRequestNo",
       c.payout_rejected_reason                        AS "payoutRejectedReason",
       c.expense_entry_id                              AS "expenseEntryId",
       c.approved_at                                   AS "approvedAt",
       c.paid_at                                       AS "paidAt",
       c.payment_mode                                  AS "paymentMode",
       c.payment_reference                             AS "paymentReference",
       c.invoice_number                                AS "invoiceNumber",
       c.recovered_at                                  AS "recoveredAt",
       ROUND(c.recovered_amount * 100)::bigint         AS "recoveredPaise",
       c.recovery_notes                                AS "recoveryNotes",
       c.cancel_reason                                 AS "cancelReason",
       c.notes,
       c.created_at                                    AS "createdAt",
       CASE
         WHEN c.status = 'cancelled' THEN 'cancelled'
         WHEN c.status = 'paid' AND c.recovered_at IS NOT NULL THEN 'recovered'
         WHEN c.status = 'paid' AND pr.status = 'cancelled' THEN 'to_recover'
         WHEN c.status = 'paid' THEN 'paid'
         WHEN pr.id IS NULL AND prop.status = 'lost' THEN 'on_hold'
         WHEN c.status = 'pending' AND (c.base_source = 'missing' OR c.rate_source = 'missing') THEN 'needs_amount'
         WHEN c.status = 'pending' THEN 'pending'
         WHEN pr.id IS NULL THEN 'waiting_for_project'
         WHEN c.payout_request_id IS NOT NULL THEN 'payment_in_review'
         ELSE 'approved'
       END                                             AS state
  FROM employee_commissions c
  JOIN quotes q              ON q.id = c.quote_id
  JOIN employee_profiles ep  ON ep.id = c.employee_id
  JOIN users u               ON u.id = ep.user_id
  JOIN customer_profiles cu  ON cu.id = q.customer_id
  LEFT JOIN customer_properties prop ON prop.id = q.property_id
  LEFT JOIN LATERAL (
    SELECT p.id, p.project_number, p.status FROM projects p
     WHERE p.quote_id = c.quote_id AND p.deleted_at IS NULL
     ORDER BY p.created_at DESC LIMIT 1
  ) pr ON true
  LEFT JOIN pending_ledger_entries ple ON ple.id = c.payout_request_id
 WHERE c.deleted_at IS NULL`;

export interface CommissionRow {
  id: string;
  resellerId: string;
  resellerName: string;
  quoteId: string;
  quoteNumber: string;
  acceptedAt: string | null;
  customerId: string;
  customerName: string;
  projectId: string | null;
  projectNumber: string | null;
  projectStatus: string | null;
  basePaise: number;
  ratePercent: number;
  amountPaise: number;
  baseSource: CommissionBaseSource;
  rateSource: CommissionRateSource;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  payoutRequestId: string | null;
  payoutRequestNo: string | null;
  payoutRejectedReason: string | null;
  expenseEntryId: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  paymentMode: string | null;
  paymentReference: string | null;
  invoiceNumber: string | null;
  recoveredAt: string | null;
  recoveredPaise: number | null;
  recoveryNotes: string | null;
  cancelReason: string | null;
  notes: string | null;
  createdAt: string;
  state: CommissionState;
}

/** pg returns bigint as string; make the paise fields numbers. */
export function toCommissionRow(raw: Record<string, unknown>): CommissionRow {
  const n = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));
  return {
    ...(raw as unknown as CommissionRow),
    basePaise: n(raw.basePaise),
    amountPaise: n(raw.amountPaise),
    ratePercent: n(raw.ratePercent),
    recoveredPaise: raw.recoveredPaise === null ? null : n(raw.recoveredPaise),
  };
}
```

Check the column names first. Run: `docker exec oneohm-postgres psql -U root -d oneohm_epc -At -c "select column_name from information_schema.columns where table_name='projects' and column_name in ('project_number','status','created_at')"`. All three must be listed. `users.last_name` and `customer_profiles.last_name` must also exist (same check). Fix the SQL if a name differs.

- [ ] **Step 2: The birth service**

```ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { commissionAmount, commissionBase, type CommissionPricingInput } from '@tejas96/shared/utils';
import { DataSource, type EntityManager } from 'typeorm';

/**
 * Makes the one commission a reseller's accepted quote earns.
 *
 * DataSource only, no module imports — QuotesModule depends on this and the
 * employees/commissions module graph must not be pulled into it.
 *
 * Idempotent through `uq_employee_commissions_quote`: a second call for the
 * same quote (double tap, retry, Fix strip after a hook that did succeed) is
 * a no-op and returns null.
 */
@Injectable()
export class CommissionBirthService {
  private readonly logger = new Logger(CommissionBirthService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async createForAcceptedQuote(
    quoteId: string,
    actorUserId: string,
    manager?: EntityManager,
  ): Promise<string | null> {
    return this.insert(quoteId, actorUserId, null, manager);
  }

  /** Fix strip "Dismiss": the quote is handled, and never earns a payable row. */
  async dismissMissing(quoteId: string, note: string, actorUserId: string): Promise<string | null> {
    return this.insert(quoteId, actorUserId, `Dismissed: ${note}`);
  }

  private async insert(
    quoteId: string,
    actorUserId: string,
    dismissReason: string | null,
    manager?: EntityManager,
  ): Promise<string | null> {
    const m = manager ?? this.dataSource.manager;

    const rows: Array<{
      reseller_id: string | null;
      status: string;
      voided_at: Date | null;
      commission_percentage: string | null;
      pricing: CommissionPricingInput | null;
    }> = await m.query(
      `SELECT q.reseller_id, q.status, q.voided_at, ep.commission_percentage,
              v.quote_snapshot -> 'pricing' AS pricing
         FROM quotes q
         LEFT JOIN employee_profiles ep ON ep.id = q.reseller_id
         LEFT JOIN LATERAL (
           SELECT quote_snapshot FROM quote_versions
            WHERE quote_id = q.id ORDER BY version_number DESC LIMIT 1
         ) v ON true
        WHERE q.id = $1 AND q.deleted_at IS NULL`,
      [quoteId],
    );

    const quote = rows[0];
    if (!quote?.reseller_id) return null;
    if (quote.status !== 'accepted' || quote.voided_at) return null;

    const { base, source: baseSource } = commissionBase(quote.pricing);
    const rateMissing = quote.commission_percentage === null;
    const rate = rateMissing ? 0 : Number(quote.commission_percentage);
    const amount = commissionAmount(base, rate);

    // Spec §5: a 0% reseller earns nothing, and the quote counts as handled.
    const cancelReason = dismissReason ?? (!rateMissing && rate === 0 ? 'Rate is 0%' : null);

    const inserted: Array<{ id: string }> = await m.query(
      `INSERT INTO employee_commissions
         (employee_id, quote_id, base_amount, commission_percentage, commission_amount,
          base_source, rate_source, status, cancel_reason, created_by, updated_by,
          created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10, now(), now())
       ON CONFLICT (quote_id) DO NOTHING
       RETURNING id`,
      [
        quote.reseller_id,
        quoteId,
        base,
        rate,
        amount,
        baseSource,
        rateMissing ? 'missing' : 'profile',
        cancelReason ? 'cancelled' : 'pending',
        cancelReason,
        actorUserId,
      ],
    );

    const id = inserted[0]?.id ?? null;
    if (id) {
      this.logger.log(`Commission ${id} for quote ${quoteId}: ₹${amount} (${baseSource}, ${rate}%)`);
    }
    return id;
  }
}
```

- [ ] **Step 3: The module**

```ts
import { Module } from '@nestjs/common';

import { CommissionBirthService } from './services/commission-birth.service';

/** Deliberately import-free; see CommissionBirthService. */
@Module({
  providers: [CommissionBirthService],
  exports: [CommissionBirthService],
})
export class CommissionBirthModule {}
```

- [ ] **Step 4: Hook quote acceptance**

In `quotes.module.ts`, add `CommissionBirthModule` to `imports`. In `QuoteService`, inject `private readonly commissionBirth: CommissionBirthService`. Directly after the existing `closeProperty` try/catch block (the one that starts at ~702), add:

```ts
    // The reseller's commission, born with the deal. Best-effort in the same
    // shape as the lead closure above: the acceptance has already saved, and a
    // failure here must not read as "the acceptance did not save". The Fix
    // strip on /resellers lists any accepted deal left without its row.
    if (statusDto.status === QuoteStatus.ACCEPTED && quote.resellerId) {
      try {
        await this.commissionBirth.createForAcceptedQuote(id, updatedBy);
      } catch (error) {
        this.logger.error(
          `Quote ${id} accepted but its commission could not be created: ${String(error)}`,
        );
      }
    }
```

Consumer acceptance (`consumer-quotation.controller.ts:116`) calls `quoteService.updateStatus`, so it is covered by the same hook. No second hook is needed.

- [ ] **Step 5: Verify**

Run: `npm run typecheck:backend`. Expected: pass.
Run: `npx nx test backend --testPathPattern="quote.service|quote-share"`. Expected: the existing suites still pass. If a spec builds `QuoteService` by hand, add `{ provide: CommissionBirthService, useValue: { createForAcceptedQuote: jest.fn() } }` to its providers. That is a fix to an existing file, not a new test.

**Live check.** Use a throwaway: a real quote cannot be accepted safely without the owner. So call the service directly against a quote that is already accepted and has no reseller, and expect `null`:

```bash
cd /Volumes/works-space/oneohm/oneohm && docker exec oneohm-postgres psql -U root -d oneohm_epc -At -c "select id from quotes where status='accepted' and reseller_id is null and voided_at is null limit 1"
```

The full birth path is walked in the UI in Task 17 (QA-0808 flow).

- [ ] **Step 6: Commit**

```bash
git add -A apps/backend
git commit -m "feat(commissions): born at quote acceptance; derived-state read model

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Admin actions — approve, edit, cancel

**Files:**
- Create: `apps/backend/src/modules/employees/commissions/utils/require-permission.ts`
- Create: `apps/backend/src/modules/employees/commissions/dto/commission-actions.dto.ts`
- Create: `apps/backend/src/modules/employees/commissions/services/commission-actions.service.ts`
- Rewrite: `apps/backend/src/modules/employees/commissions/controllers/employee-commission.controller.ts`
- Modify: `apps/backend/src/modules/employees/commissions/employee-commissions.module.ts`, `dto/index.ts`

**Interfaces:**
- Consumes: `COMMISSION_ROW_SQL`, `toCommissionRow`, `CommissionRow` (Task 3); `commissionAmount` (Task 1)
- Produces: `requirePermission(user: CurrentUserType, code: string): void`; `CommissionActionsService.list(filter)`, `.getOne(id)`, `.approve(id, user)`, `.edit(id, dto, user)`, `.cancel(id, reason, user)` (all return `CommissionRow`)

- [ ] **Step 1: `utils/require-permission.ts`**

```ts
import { ForbiddenException } from '@nestjs/common';

import { hasAdminBypassRole } from '../../../iam/constants/admin-roles';
import type { CurrentUserType } from '../../../auth/types';

/**
 * The backend has no permission guards (enforcement lives in web middleware),
 * so money routes check here, from the JWT — the same way canViewAllProjects
 * reads `projects.view`. Codes come from the existing catalog only.
 */
export function requirePermission(user: CurrentUserType, code: string): void {
  if (hasAdminBypassRole(user.roles ?? [])) return;
  if ((user.permissions ?? []).includes(code)) return;
  throw new ForbiddenException(`You need the "${code}" permission for this`);
}
```

- [ ] **Step 2: `dto/commission-actions.dto.ts`**

```ts
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '@tejas96/shared/types';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsIn, IsNumber, IsOptional,
  IsString, IsUUID, Max, MaxLength, Min, MinLength,
} from 'class-validator';

export class CommissionListQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() resellerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
}

export class EditCommissionDto {
  @ApiPropertyOptional({ description: 'Rupees' })
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  baseAmount?: number;

  @ApiPropertyOptional({ description: 'Percent, e.g. 2.75' })
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100)
  ratePercent?: number;

  @ApiProperty() @IsString() @MinLength(3) @MaxLength(500) reason!: string;
}

export class ReasonDto {
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(500) reason!: string;
}

export class RecordCommissionPaymentDto {
  @ApiProperty({ type: [String] })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @IsUUID('4', { each: true })
  commissionIds!: string[];

  @ApiProperty() @IsDateString() valueDate!: string;

  @ApiProperty({ enum: PaymentMethod })
  @IsIn(Object.values(PaymentMethod).filter((m) => m !== PaymentMethod.CREDIT))
  paymentMethod!: string;

  @ApiProperty() @IsString() @MinLength(3) @MaxLength(100) reference!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) invoiceNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() invoiceDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class CloseRecoveryDto {
  @ApiProperty({ description: 'Rupees received back; 0 writes it all off' })
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  amountReceived!: number;

  @ApiProperty() @IsDateString() date!: string;
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(500) note!: string;
}

export class ResellerPeriodQueryDto {
  @ApiPropertyOptional({ enum: ['month', 'fy', 'all'] })
  @IsOptional() @IsIn(['month', 'fy', 'all'])
  period?: 'month' | 'fy' | 'all';
}

export class DismissMissingDto {
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(300) note!: string;
}
```

Set `dto/index.ts` to `export * from './commission-actions.dto';`.

- [ ] **Step 3: `services/commission-actions.service.ts` (approve, edit, cancel; payment and recovery come in Tasks 5–6)**

```ts
import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { commissionAmount } from '@tejas96/shared/utils';
import { DataSource, type EntityManager } from 'typeorm';

import type { CurrentUserType } from '../../../auth/types';
import type { EditCommissionDto } from '../dto';
import { COMMISSION_ROW_SQL, toCommissionRow, type CommissionRow } from '../sql/commission-read.sql';
import { requirePermission } from '../utils/require-permission';

const CHANGED = 'This commission changed while you were looking at it. Reload and try again.';

@Injectable()
export class CommissionActionsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async list(filter: { resellerId?: string; state?: string }): Promise<CommissionRow[]> {
    const params: unknown[] = [];
    let sql = COMMISSION_ROW_SQL;
    if (filter.resellerId) {
      params.push(filter.resellerId);
      sql += ` AND c.employee_id = $${params.length}`;
    }
    sql = `SELECT * FROM (${sql}) r`;
    if (filter.state) {
      params.push(filter.state);
      sql += ` WHERE r.state = $${params.length}`;
    }
    sql += ` ORDER BY r."acceptedAt" DESC NULLS LAST`;
    const rows: Record<string, unknown>[] = await this.dataSource.query(sql, params);
    return rows.map(toCommissionRow);
  }

  async getOne(id: string, manager?: EntityManager): Promise<CommissionRow> {
    const m = manager ?? this.dataSource.manager;
    const rows: Record<string, unknown>[] = await m.query(`${COMMISSION_ROW_SQL} AND c.id = $1`, [id]);
    if (!rows[0]) throw new NotFoundException('Commission not found');
    return toCommissionRow(rows[0]);
  }

  async approve(id: string, user: CurrentUserType): Promise<CommissionRow> {
    requirePermission(user, 'finance.payments.record');
    return this.dataSource.transaction(async (m) => {
      await this.lock(m, id);
      const row = await this.getOne(id, m);
      if (row.state === 'on_hold') {
        throw new BadRequestException('The site for this deal is marked lost. Reopen the site or cancel this commission.');
      }
      if (row.state === 'needs_amount') {
        throw new BadRequestException('Set the base or the rate first — one of them is missing.');
      }
      if (row.state !== 'pending') throw new ConflictException(`This commission is ${row.state.replace(/_/g, ' ')}.`);
      if (row.amountPaise <= 0) throw new BadRequestException('A ₹0 commission cannot be approved. Edit it or cancel it.');

      const done = await m.query(
        `UPDATE employee_commissions
            SET status = 'approved', approved_at = now(), approved_by = $2, updated_by = $2, updated_at = now()
          WHERE id = $1 AND status = 'pending'
          RETURNING id`,
        [id, user.id],
      );
      if (done.length !== 1) throw new ConflictException(CHANGED);
      return this.getOne(id, m);
    });
  }

  /** Pending, or approved with no payout in review. Always lands back in Pending (spec §6.2). */
  async edit(id: string, dto: EditCommissionDto, user: CurrentUserType): Promise<CommissionRow> {
    requirePermission(user, 'finance.payments.record');
    if (dto.baseAmount === undefined && dto.ratePercent === undefined) {
      throw new BadRequestException('Change the base, the rate, or both.');
    }
    return this.dataSource.transaction(async (m) => {
      await this.lock(m, id);
      const row = await this.getOne(id, m);
      const editable =
        row.status === 'pending' || (row.status === 'approved' && row.payoutRequestId === null);
      if (!editable) {
        throw new ConflictException(
          row.payoutRequestId
            ? 'A payment for this commission is in review. Reject or withdraw it first.'
            : `A ${row.state.replace(/_/g, ' ')} commission cannot be edited.`,
        );
      }

      const base = dto.baseAmount ?? row.basePaise / 100;
      const rate = dto.ratePercent ?? row.ratePercent;
      const amount = commissionAmount(base, rate);
      const stamp = `[${new Date().toISOString().slice(0, 10)}] Edited: ${dto.reason}`;

      const done = await m.query(
        `UPDATE employee_commissions
            SET base_amount = $2, commission_percentage = $3, commission_amount = $4,
                base_source = CASE WHEN $5::boolean THEN 'manual' ELSE base_source END,
                rate_source = CASE WHEN $6::boolean THEN 'manual' ELSE rate_source END,
                status = 'pending', approved_at = NULL, approved_by = NULL,
                notes = CONCAT_WS(E'\\n', notes, $7::text),
                updated_by = $8, updated_at = now()
          WHERE id = $1 AND status = $9 AND payout_request_id IS NULL
          RETURNING id`,
        [id, base, rate, amount, dto.baseAmount !== undefined, dto.ratePercent !== undefined, stamp, user.id, row.status],
      );
      if (done.length !== 1) throw new ConflictException(CHANGED);
      return this.getOne(id, m);
    });
  }

  async cancel(id: string, reason: string, user: CurrentUserType): Promise<CommissionRow> {
    requirePermission(user, 'finance.payments.record');
    return this.dataSource.transaction(async (m) => {
      await this.lock(m, id);
      const done = await m.query(
        `UPDATE employee_commissions
            SET status = 'cancelled', cancel_reason = $2, updated_by = $3, updated_at = now()
          WHERE id = $1 AND status IN ('pending', 'approved') AND payout_request_id IS NULL
          RETURNING id`,
        [id, reason, user.id],
      );
      if (done.length !== 1) {
        const row = await this.getOne(id, m);
        throw new ConflictException(
          row.payoutRequestId
            ? 'A payment for this commission is in review. Reject or withdraw it first.'
            : `A ${row.state.replace(/_/g, ' ')} commission cannot be cancelled.`,
        );
      }
      return this.getOne(id, m);
    });
  }

  /** Row lock so two admins cannot race; the conditional UPDATEs are the second line. */
  protected async lock(m: EntityManager, id: string): Promise<void> {
    const rows = await m.query(`SELECT id FROM employee_commissions WHERE id = $1 FOR UPDATE`, [id]);
    if (!rows[0]) throw new NotFoundException('Commission not found');
  }
}
```

Every conditional UPDATE uses `RETURNING id` and checks `.length`. This avoids depending on how the driver reports affected rows.

- [ ] **Step 4: The controller (admin routes; the `me` routes come in Task 7)**

```ts
import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../auth/decorators';
import { JwtAuthGuard } from '../../../auth/guards';
import type { CurrentUserType } from '../../../auth/types';
import { CommissionListQueryDto, EditCommissionDto, ReasonDto } from '../dto';
import { CommissionActionsService } from '../services/commission-actions.service';
import type { CommissionRow } from '../sql/commission-read.sql';
import { requirePermission } from '../utils/require-permission';

/**
 * Commissions, office side. There is no create, no delete and no "set status":
 * a commission is born from an accepted quote, dies by cancel, and reaches
 * `paid` only through the approval queue (spec §6.2, §7.5).
 */
@ApiTags('Commissions')
@ApiBearerAuth()
@Controller('commissions')
@UseGuards(JwtAuthGuard)
export class EmployeeCommissionController {
  constructor(private readonly actions: CommissionActionsService) {}

  @Get()
  list(@Query() query: CommissionListQueryDto, @CurrentUser() user: CurrentUserType): Promise<CommissionRow[]> {
    requirePermission(user, 'finance.view');
    return this.actions.list(query);
  }

  @Get(':id')
  getOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserType): Promise<CommissionRow> {
    requirePermission(user, 'finance.view');
    return this.actions.getOne(id);
  }

  @Post(':id/approve')
  approve(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserType): Promise<CommissionRow> {
    return this.actions.approve(id, user);
  }

  @Patch(':id')
  edit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EditCommissionDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<CommissionRow> {
    return this.actions.edit(id, dto, user);
  }

  @Post(':id/cancel')
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReasonDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<CommissionRow> {
    return this.actions.cancel(id, dto.reason, user);
  }
}
```

Module: `providers: [CommissionActionsService]`, `exports: [CommissionActionsService]`, `controllers: [EmployeeCommissionController]`. Drop the `TypeOrmModule.forFeature` import if nothing uses the repository now. Keep `forwardRef(() => EmployeesModule)` only if something still needs it. Otherwise remove it, and remove the matching `forwardRef` in `employees.module.ts`, keeping just `EmployeeCommissionsModule` in `imports`.

- [ ] **Step 5: Type-check**

Run: `npm run typecheck:backend`. Expected: pass.

- [ ] **Step 6: Live check with a minted admin token**

Mint a token with role `admin` for any active admin user. Then run:

```bash
TOKEN=<admin token>
curl -s localhost:8085/api/v1/commissions -H "Authorization: Bearer $TOKEN" | head -c 800; echo
curl -s -X POST localhost:8085/api/v1/commissions/b4356fab-0853-495d-a922-76733512f4a9/approve -H "Authorization: Bearer $TOKEN"; echo
```

Expected:
- The first call returns 2 rows with `"state":"cancelled"`.
- The second call returns **409** "This commission is cancelled."

Mint a token for a user with **no** roles and **no** permissions, then call `GET /commissions`. Expected: **403** that names `finance.view`.

- [ ] **Step 7: Commit**

```bash
git add -A apps/backend
git commit -m "feat(commissions): approve, edit, cancel with conditional updates; no create/delete/status routes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Paying through the approval queue

**Files:**
- Create: `apps/backend/src/modules/employees/commissions/sql/commission-payout.sql.ts`
- Modify: `apps/backend/src/modules/payment-approvals/services/payment-approval.service.ts` (new `submitCommissionPayout`, `notifySubmitted`; `approve` branch; `reject` / `cancel`)
- Modify: `apps/backend/src/modules/payment-approvals/dto/query-approvals.dto.ts:18-20` (add `'commission'`; **not** to the submit DTO)
- Modify: `apps/backend/src/modules/ledger/services/ledger-write.service.ts:81-92, 240-247` (`reference`)
- Modify: `commission-actions.service.ts` (`recordPayment`), `employee-commission.controller.ts`, `employee-commissions.module.ts` (import `PaymentApprovalModule`)

**Interfaces:**
- Produces: `markCommissionPaid(m, { payoutRequestId, ledgerEntryId, approverId, valueDate, paymentMethod, reference }): Promise<void>` and `releaseCommissionPayout(m, payoutRequestId, reason): Promise<void>`
- Produces: `PaymentApprovalService.submitCommissionPayout(input, userId, manager): Promise<string>` and `.notifySubmitted(id: string): void`
- Produces: `CommissionActionsService.recordPayment(dto, user): Promise<CommissionRow[]>`

- [ ] **Step 1: `sql/commission-payout.sql.ts`**

```ts
import { ConflictException } from '@nestjs/common';
import type { EntityManager } from 'typeorm';

/**
 * Commission side of a queue decision, run INSIDE the approval's transaction
 * so the expense and the commission move together or not at all.
 *
 * Plain functions on a manager, not a service: payment-approvals must not
 * import the employees module graph (the house pattern, as in
 * project-cancellation.service.ts, is raw SQL on employee_commissions).
 */
export async function markCommissionPaid(
  m: EntityManager,
  input: {
    payoutRequestId: string;
    ledgerEntryId: string;
    approverId: string;
    valueDate: string;
    paymentMethod: string | null;
    reference: string | null;
  },
): Promise<void> {
  const rows: Array<{ id: string }> = await m.query(
    `UPDATE employee_commissions
        SET status = 'paid', paid_at = $3, paid_by = $4, payment_mode = $5,
            payment_reference = $6, expense_entry_id = $2, payout_rejected_reason = NULL,
            updated_by = $4, updated_at = now()
      WHERE payout_request_id = $1 AND status = 'approved'
      RETURNING id`,
    [input.payoutRequestId, input.ledgerEntryId, input.valueDate, input.approverId, input.paymentMethod, input.reference],
  );
  if (rows.length !== 1) {
    // Spec §8 step 4 (amended): nothing is posted; the approver rejects it.
    throw new ConflictException('This commission was cancelled or changed. Reject this request.');
  }
}

export async function releaseCommissionPayout(
  m: EntityManager,
  payoutRequestId: string,
  reason: string,
): Promise<void> {
  await m.query(
    `UPDATE employee_commissions
        SET payout_request_id = NULL, payout_rejected_reason = $2, updated_at = now()
      WHERE payout_request_id = $1 AND status = 'approved'`,
    [payoutRequestId, reason],
  );
}
```

- [ ] **Step 2: Put `reference` on expenses**

In `RecordExpenseInput`, add `reference?: string;`. In `recordExpense`'s create call, add `reference: input.reference ?? null,` next to `counterparty`. The column already exists.

- [ ] **Step 3: Queue — submit, approve, reject, cancel**

In `payment-approval.service.ts` add:

```ts
  /**
   * A reseller commission payout, queued inside the CALLER's transaction so
   * the commission's `payout_request_id` and this row are written together.
   * Not reachable through POST /payment-approvals — only through
   * /commissions/record-payment, which owns the commission-side guards.
   */
  async submitCommissionPayout(
    input: {
      projectId: string;
      customerId: string | null;
      amountPaise: number;
      valueDate: string;
      paymentMethod: string;
      reference: string;
      counterparty: string;
      notes: string | null;
    },
    userId: string,
    manager: EntityManager,
  ): Promise<string> {
    const valueDate = toIsoDate(input.valueDate);
    if (isFutureIst(valueDate)) {
      throw new BadRequestException(`Value date ${valueDate} is in the future`);
    }
    if (input.paymentMethod === PaymentMethod.CREDIT) {
      throw new BadRequestException('A commission is paid, not taken on credit');
    }
    if (!(input.amountPaise > 0)) {
      throw new BadRequestException('A commission payout must be more than ₹0');
    }

    const requestNo = await this.sequenceService.getNextNumber(
      FinanceSequenceScope.PAYMENT_APPROVAL,
      manager,
    );
    const inserted = await manager.getRepository(PendingLedgerEntryEntity).insert({
      requestNo,
      status: 'pending',
      submittedBy: userId,
      submittedAt: new Date(),
      valueDate,
      notes: input.notes,
      reference: input.reference,
      paymentMethod: input.paymentMethod,
      counterparty: input.counterparty,
      vendorId: null,
      kind: 'commission',
      projectId: input.projectId,
      customerId: input.customerId,
      entryType: 'expense',
      direction: 'out',
      amountPaise: -input.amountPaise,
      category: ExpenseCategory.COMMISSION,
      allocations: null,
    });
    return inserted.identifiers[0]?.id as string;
  }

  /** After the caller's commit — never tell anyone about a payout that rolled back. */
  notifySubmitted(id: string): void {
    this.notifier.submitted(id);
  }
```

In `approve()`, add this branch **before** the final `else` (the `never` check forces it):

```ts
      } else if (pending.kind === 'commission') {
        entry = await this.ledgerWrite.recordExpense(
          {
            projectId: pending.projectId,
            amountPaise: Math.abs(pending.amountPaise),
            valueDate: pending.valueDate,
            category: ExpenseCategory.COMMISSION,
            payee: pending.counterparty ?? undefined,
            paymentMethod: pending.paymentMethod ?? undefined,
            reference: pending.reference ?? undefined,
            notes: pending.notes ?? undefined,
          },
          approverId,
          manager,
        );
        await markCommissionPaid(manager, {
          payoutRequestId: pending.id,
          ledgerEntryId: entry.id,
          approverId,
          valueDate: entry.valueDate,
          paymentMethod: pending.paymentMethod ?? null,
          reference: pending.reference ?? null,
        });
```

In `reject()`, inside the `transitionPending` callback, before `return repo.update(...)`:

```ts
      if (row.kind === 'commission') {
        await releaseCommissionPayout(repo.manager, row.id, reason);
      }
```

In `cancel()`, the same, with the reason `'Withdrawn by the person who recorded it'`.

Import `markCommissionPaid` and `releaseCommissionPayout` from `'../../employees/commissions/sql/commission-payout.sql'`. This is a relative file import, not a module import, so there is no cycle.

Add `'commission'` to the `@ApiPropertyOptional({ enum })` and `@IsIn` lists in `query-approvals.dto.ts`. Leave `submit-approval.dto.ts` unchanged: a commission payout must not be submittable directly.

Then find every `switch`/`if` on `kind` in `payment-approval-queries.sql.ts`, `previewImpact` and `findDuplicates`. Run `grep -n "kind" apps/backend/src/modules/payment-approvals/services/*.ts`. `commission` must behave like `expense` wherever a branch exists (an out-flow with a category), so add it to the same branch.

- [ ] **Step 4: `recordPayment` in `CommissionActionsService`**

Inject `PaymentApprovalService` as `private readonly approvals: PaymentApprovalService` (import `PaymentApprovalModule` in `employee-commissions.module.ts`). Import `RecordCommissionPaymentDto` and `CloseRecoveryDto` from `'../dto'`. Add:

```ts
  /**
   * One queue request per commission — each expense sits on its own project —
   * all sharing the one bank reference when a single transfer paid several.
   * All or nothing: one ineligible row fails the whole batch with its name.
   */
  async recordPayment(dto: RecordCommissionPaymentDto, user: CurrentUserType): Promise<CommissionRow[]> {
    requirePermission(user, 'finance.payments.record');
    const ids = [...new Set(dto.commissionIds)];

    const { rows, requestIds } = await this.dataSource.transaction(async (m) => {
      const requestIds: string[] = [];
      for (const id of ids) {
        await this.lock(m, id);
        const row = await this.getOne(id, m);
        if (row.state !== 'approved') {
          throw new ConflictException(
            `${row.quoteNumber}: only an Approved commission with a project can be paid (it is ${row.state.replace(/_/g, ' ')}).`,
          );
        }
        const requestId = await this.approvals.submitCommissionPayout(
          {
            projectId: row.projectId as string,
            customerId: row.customerId,
            amountPaise: row.amountPaise,
            valueDate: dto.valueDate,
            paymentMethod: dto.paymentMethod,
            reference: dto.reference,
            counterparty: row.resellerName,
            notes: [`Commission ${row.quoteNumber}`, dto.notes].filter(Boolean).join(' · '),
          },
          user.id,
          m,
        );
        const done: Array<{ id: string }> = await m.query(
          `UPDATE employee_commissions
              SET payout_request_id = $2, payout_rejected_reason = NULL,
                  invoice_number = COALESCE($3, invoice_number),
                  invoice_date = COALESCE($4::date, invoice_date),
                  updated_by = $5, updated_at = now()
            WHERE id = $1 AND status = 'approved' AND payout_request_id IS NULL
            RETURNING id`,
          [id, requestId, dto.invoiceNumber ?? null, dto.invoiceDate ?? null, user.id],
        );
        if (done.length !== 1) throw new ConflictException(CHANGED);
        requestIds.push(requestId);
      }
      const rows = await Promise.all(ids.map((id) => this.getOne(id, m)));
      return { rows, requestIds };
    });

    requestIds.forEach((id) => this.approvals.notifySubmitted(id));
    return rows;
  }
```

Controller:

```ts
  @Post('record-payment')
  recordPayment(@Body() dto: RecordCommissionPaymentDto, @CurrentUser() user: CurrentUserType): Promise<CommissionRow[]> {
    return this.actions.recordPayment(dto, user);
  }
```

Declare it **above** `@Get(':id')` in the class, so the route order is obvious to a reader.

- [ ] **Step 5: Verify**

Run: `npm run typecheck:backend`. Expected: pass. The `never` in `approve()` compiles only if the branch exists.
Run: `npx nx test backend --testPathPattern="payment-approval"`. Expected: the existing suites pass.

The full money path (record, then approve as a different user, then check the expense on the project) is walked in the UI in Task 17. It needs a real accepted reseller deal.

- [ ] **Step 6: Commit**

```bash
git add -A apps/backend
git commit -m "feat(commissions): payouts through the approval queue as commission expenses

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: When a deal dies — cancellation and recovery

**Files:**
- Modify: `apps/backend/src/modules/projects/services/project-cancellation.service.ts` (step 2 at ~91, summary at ~202)
- Modify: `commission-actions.service.ts` (`closeRecovery`), controller

**Interfaces:**
- Produces: `CommissionActionsService.closeRecovery(id, dto: CloseRecoveryDto, user): Promise<CommissionRow>`

- [ ] **Step 1: Cancellation cancels the payout in review too**

Replace the temporary step-2 SQL from Task 2 with:

```ts
      // 2. Commissions nobody has been paid yet — and any payout still waiting
      //    in the approval queue, so a finance head cannot pay a dead deal.
      //    Paid ones stay paid and show "To recover" (derived; spec §9).
      await manager.query(
        `UPDATE pending_ledger_entries SET status = 'cancelled', updated_at = now()
          WHERE status = 'pending' AND kind = 'commission'
            AND id IN (SELECT c.payout_request_id FROM employee_commissions c
                         JOIN projects p ON p.quote_id = c.quote_id
                        WHERE p.id = $1 AND c.status = 'approved'
                          AND c.payout_request_id IS NOT NULL)`,
        [projectId],
      );
      await manager.query(
        `UPDATE employee_commissions c
            SET status = 'cancelled', payout_request_id = NULL, cancel_reason = $2,
                updated_by = $3, updated_at = now()
           FROM projects p
          WHERE p.id = $1 AND p.quote_id = c.quote_id AND c.status IN ('pending', 'approved')`,
        [projectId, `Project ${project.projectNumber} cancelled`, userId],
      );
```

Check that `project.projectNumber` and `userId` are in scope at that point (they are used in step 3's `voidAllOpenForProperty` call just below).

- [ ] **Step 2: `closeRecovery`**

```ts
  /** Spec §9: full, partial (rest written off) or ₹0 (all written off). Flag-and-chase, no ledger entry (X4). */
  async closeRecovery(id: string, dto: CloseRecoveryDto, user: CurrentUserType): Promise<CommissionRow> {
    requirePermission(user, 'finance.payments.record');
    return this.dataSource.transaction(async (m) => {
      await this.lock(m, id);
      const row = await this.getOne(id, m);
      if (row.state !== 'to_recover') {
        throw new ConflictException('Only a paid commission on a cancelled deal can be closed out.');
      }
      const receivedPaise = Math.round(dto.amountReceived * 100);
      if (receivedPaise > row.amountPaise) {
        throw new BadRequestException('That is more than was paid.');
      }
      const writtenOffPaise = row.amountPaise - receivedPaise;
      const note =
        writtenOffPaise > 0
          ? `${dto.note} (₹${(writtenOffPaise / 100).toFixed(2)} written off)`
          : dto.note;

      const done = await m.query(
        `UPDATE employee_commissions
            SET recovered_at = $2::date, recovered_amount = $3, recovery_notes = $4,
                updated_by = $5, updated_at = now()
          WHERE id = $1 AND status = 'paid' AND recovered_at IS NULL
          RETURNING id`,
        [id, dto.date, receivedPaise / 100, note, user.id],
      );
      if (done.length !== 1) throw new ConflictException(CHANGED);
      return this.getOne(id, m);
    });
  }
```

Controller:

```ts
  @Post(':id/close-recovery')
  closeRecovery(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloseRecoveryDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<CommissionRow> {
    return this.actions.closeRecovery(id, dto, user);
  }
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck:backend && npx nx test backend --testPathPattern="project-cancellation"`. Expected: pass.
Run the cleanup summary for a cancelled project, and check that the `unrecovered_commissions` count uses the join:

```bash
TOKEN=<admin token>; PID=$(docker exec oneohm-postgres psql -U root -d oneohm_epc -At -c "select id from projects where status='cancelled' limit 1")
curl -s localhost:8085/api/v1/projects/$PID/cancellation-cleanup -H "Authorization: Bearer $TOKEN"; echo
```

Expected: JSON with `unrecoveredCommissions` (0) and no SQL error.

- [ ] **Step 4: Commit**

```bash
git add -A apps/backend
git commit -m "feat(commissions): project cancellation cancels live payouts; close recovery

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Reseller metrics, the missing list and the "me" routes

**Files:**
- Create: `apps/backend/src/modules/employees/commissions/sql/reseller-dashboard.sql.ts`
- Create: `apps/backend/src/modules/employees/commissions/services/reseller-dashboard.service.ts`
- Create: `apps/backend/src/modules/employees/commissions/controllers/reseller-dashboard.controller.ts`
- Modify: `employee-commission.controller.ts` (the `me` routes, declared **first**), `employee-commissions.module.ts` (import `CommissionBirthModule`)

**Interfaces:**
- Consumes: `CommissionActionsService.list`, `CommissionBirthService`
- Produces (API, used by web Task 13):
  - `GET /resellers?period=month|fy|all` → `{ rows: ResellerSummary[]; totals: ResellerTotals; resellerUnknownCount: number; periodStart: string | null }`
  - `GET /resellers/:id?period=` → `{ reseller: ResellerHeader; summary: ResellerSummary; commissions: CommissionRow[]; periodStart: string | null }`
  - `GET /resellers/missing-commissions` → `{ sinceLaunch: MissingRow[]; beforeLaunch: MissingRow[]; liveFrom: string | null }`
  - `POST /resellers/missing-commissions/:quoteId/create` and `…/dismiss` `{ note }`
  - `GET /commissions/me?period=` → the same shape as `GET /resellers/:id`, for the caller (resellers only)

```ts
export interface ResellerSummary {
  resellerId: string; name: string; code: string | null; status: string;
  ratePercent: number | null;
  leads: number; quoted: number; won: number; winRate: number | null;
  revenuePaise: number; pendingPaise: number; owedPaise: number; paidPaise: number; toRecoverPaise: number;
}
export interface ResellerTotals { pendingPaise: number; owedPaise: number; paidPaise: number; toRecoverPaise: number; }
export interface ResellerHeader {
  resellerId: string; name: string; code: string | null; status: string; ratePercent: number | null;
  bankName: string | null; accountLast4: string | null; gstin: string | null; phone: string | null;
}
export interface MissingRow {
  quoteId: string; quoteNumber: string; acceptedAt: string; resellerId: string; resellerName: string; customerName: string;
}
```

- [ ] **Step 1: The period helper and SQL, `sql/reseller-dashboard.sql.ts`**

```ts
/** IST midnight at the start of the period, as a UTC instant; null = all time. */
export function periodStart(period: 'month' | 'fy' | 'all' | undefined, now = new Date()): Date | null {
  if (!period || period === 'all') return null;
  const ist = new Date(now.getTime() + 330 * 60_000); // shift to IST wall clock
  const y = ist.getUTCFullYear();
  const mo = ist.getUTCMonth();
  const startY = period === 'month' ? y : mo >= 3 ? y : y - 1;
  const startM = period === 'month' ? mo : 3; // April
  return new Date(Date.UTC(startY, startM, 1) - 330 * 60_000);
}

/**
 * One row per reseller. Funnel by LEAD date; money by ACCEPTANCE date (revenue)
 * or right-now (pending/owed/paid/to recover). Spec §12 has the definitions;
 * `$1` is the period start (timestamptz or NULL), `$2` an optional reseller id.
 *
 * Counts PROPERTIES for quoted/won, so re-quotes on one roof count once.
 */
export const RESELLER_SUMMARY_SQL = (commissionRowSql: string): string => `
WITH r AS (
  SELECT ep.id, ep.status, ep.company_code AS code, ep.commission_percentage AS rate,
         COALESCE(NULLIF(ep.company_name, ''), TRIM(u.first_name || ' ' || COALESCE(u.last_name, ''))) AS name
    FROM employee_profiles ep JOIN users u ON u.id = ep.user_id
   WHERE ep.profile_kind = 'reseller' AND ep.deleted_at IS NULL
     AND ($2::uuid IS NULL OR ep.id = $2)
), leads AS (
  SELECT cp.id, cp.reseller_id FROM customer_profiles cp
   WHERE cp.reseller_id IS NOT NULL AND cp.deleted_at IS NULL
     AND ($1::timestamptz IS NULL OR cp.created_at >= $1)
), quoted AS (
  SELECT l.reseller_id, count(DISTINCT q.property_id) AS n FROM leads l
    JOIN quotes q ON q.customer_id = l.id AND q.reseller_id = l.reseller_id
   WHERE q.status <> 'draft' AND q.deleted_at IS NULL GROUP BY l.reseller_id
), won AS (
  SELECT l.reseller_id, count(DISTINCT q.property_id) AS n FROM leads l
    JOIN quotes q ON q.customer_id = l.id AND q.reseller_id = l.reseller_id
   WHERE q.status = 'accepted' AND q.voided_at IS NULL AND q.deleted_at IS NULL GROUP BY l.reseller_id
), money AS (
  SELECT x."resellerId" AS reseller_id,
    sum(x."basePaise") FILTER (WHERE x.status <> 'cancelled'
        AND ($1::timestamptz IS NULL OR x."acceptedAt" >= $1))                         AS revenue,
    sum(x."amountPaise") FILTER (WHERE x.state IN ('pending','needs_amount'))          AS pending,
    sum(x."amountPaise") FILTER (WHERE x.state IN ('waiting_for_project','approved','payment_in_review')) AS owed,
    sum(x."amountPaise") FILTER (WHERE x.status = 'paid')                              AS paid,
    sum(x."amountPaise") FILTER (WHERE x.state = 'to_recover')                         AS to_recover
    FROM (${commissionRowSql}) x GROUP BY x."resellerId"
)
SELECT r.id AS "resellerId", r.name, r.code, r.status, r.rate::float8 AS "ratePercent",
       (SELECT count(*) FROM leads l WHERE l.reseller_id = r.id)::int AS leads,
       COALESCE(qd.n, 0)::int AS quoted, COALESCE(w.n, 0)::int AS won,
       COALESCE(mo.revenue, 0)::bigint AS "revenuePaise", COALESCE(mo.pending, 0)::bigint AS "pendingPaise",
       COALESCE(mo.owed, 0)::bigint AS "owedPaise", COALESCE(mo.paid, 0)::bigint AS "paidPaise",
       COALESCE(mo.to_recover, 0)::bigint AS "toRecoverPaise"
  FROM r
  LEFT JOIN quoted qd ON qd.reseller_id = r.id
  LEFT JOIN won w ON w.reseller_id = r.id
  LEFT JOIN money mo ON mo.reseller_id = r.id
 ORDER BY COALESCE(mo.owed, 0) DESC, r.name`;

export const MISSING_COMMISSIONS_SQL = `
SELECT q.id AS "quoteId", q.quote_number AS "quoteNumber", q.accepted_at AS "acceptedAt",
       q.reseller_id AS "resellerId",
       COALESCE(NULLIF(ep.company_name, ''), TRIM(u.first_name || ' ' || COALESCE(u.last_name, ''))) AS "resellerName",
       TRIM(cu.first_name || ' ' || COALESCE(cu.last_name, '')) AS "customerName"
  FROM quotes q
  JOIN employee_profiles ep ON ep.id = q.reseller_id
  JOIN users u ON u.id = ep.user_id
  JOIN customer_profiles cu ON cu.id = q.customer_id
  LEFT JOIN employee_commissions c ON c.quote_id = q.id
 WHERE q.status = 'accepted' AND q.voided_at IS NULL AND q.deleted_at IS NULL
   AND q.reseller_id IS NOT NULL AND c.id IS NULL
 ORDER BY q.accepted_at DESC`;
```

- [ ] **Step 2: `services/reseller-dashboard.service.ts`**

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { COMMISSION_ROW_SQL } from '../sql/commission-read.sql';
import { MISSING_COMMISSIONS_SQL, periodStart, RESELLER_SUMMARY_SQL } from '../sql/reseller-dashboard.sql';
import { CommissionActionsService } from './commission-actions.service';
// ResellerSummary, ResellerTotals, ResellerHeader, MissingRow as declared in this task's Interfaces block
// — put them in `sql/reseller-dashboard.sql.ts` and import from there.

type Period = 'month' | 'fy' | 'all' | undefined;

const toInt = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));

@Injectable()
export class ResellerDashboardService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly actions: CommissionActionsService,
  ) {}

  async summaries(period: Period, resellerId: string | null = null): Promise<ResellerSummary[]> {
    const start = periodStart(period);
    const raw: Record<string, unknown>[] = await this.dataSource.query(
      RESELLER_SUMMARY_SQL(COMMISSION_ROW_SQL),
      [start, resellerId],
    );
    return raw.map((r) => {
      const quoted = toInt(r.quoted);
      const won = toInt(r.won);
      return {
        ...(r as unknown as ResellerSummary),
        ratePercent: r.ratePercent === null ? null : Number(r.ratePercent),
        leads: toInt(r.leads), quoted, won,
        winRate: quoted === 0 ? null : Math.round((won / quoted) * 1000) / 10,
        revenuePaise: toInt(r.revenuePaise), pendingPaise: toInt(r.pendingPaise),
        owedPaise: toInt(r.owedPaise), paidPaise: toInt(r.paidPaise), toRecoverPaise: toInt(r.toRecoverPaise),
      };
    });
  }

  async list(period: Period) {
    const rows = await this.summaries(period);
    const totals: ResellerTotals = rows.reduce(
      (t, r) => ({
        pendingPaise: t.pendingPaise + r.pendingPaise, owedPaise: t.owedPaise + r.owedPaise,
        paidPaise: t.paidPaise + r.paidPaise, toRecoverPaise: t.toRecoverPaise + r.toRecoverPaise,
      }),
      { pendingPaise: 0, owedPaise: 0, paidPaise: 0, toRecoverPaise: 0 },
    );
    const [{ n }] = await this.dataSource.query(
      `SELECT count(*)::int AS n FROM customer_profiles
        WHERE lead_source = 'reseller' AND reseller_id IS NULL AND deleted_at IS NULL`,
    );
    return { rows, totals, resellerUnknownCount: n as number, periodStart: periodStart(period)?.toISOString() ?? null };
  }

  async detail(resellerId: string, period: Period) {
    const [summary] = await this.summaries(period, resellerId);
    if (!summary) throw new NotFoundException('Reseller not found');
    const [h] = await this.dataSource.query(
      `SELECT ep.id AS "resellerId", ep.status, ep.company_code AS code, ep.commission_percentage::float8 AS "ratePercent",
              COALESCE(NULLIF(ep.company_name, ''), TRIM(u.first_name || ' ' || COALESCE(u.last_name, ''))) AS name,
              ep.bank_name AS "bankName", RIGHT(ep.account_number, 4) AS "accountLast4", ep.gstin, u.phone
         FROM employee_profiles ep JOIN users u ON u.id = ep.user_id WHERE ep.id = $1`,
      [resellerId],
    );
    const commissions = await this.actions.list({ resellerId });
    return { reseller: h as ResellerHeader, summary, commissions, periodStart: periodStart(period)?.toISOString() ?? null };
  }

  async missing() {
    const liveFromRaw = process.env.COMMISSIONS_LIVE_FROM ?? null; // 'YYYY-MM-DD', IST
    const liveFrom = liveFromRaw && /^\d{4}-\d{2}-\d{2}$/.test(liveFromRaw)
      ? new Date(`${liveFromRaw}T00:00:00+05:30`)
      : null;
    const rows: MissingRow[] = await this.dataSource.query(MISSING_COMMISSIONS_SQL);
    const since = rows.filter((r) => !liveFrom || new Date(r.acceptedAt) >= liveFrom);
    const before = rows.filter((r) => liveFrom && new Date(r.acceptedAt) < liveFrom);
    return { sinceLaunch: since, beforeLaunch: before, liveFrom: liveFromRaw };
  }

  /** employee_profiles.id of a reseller user, or null. */
  async resellerIdForUser(userId: string): Promise<string | null> {
    const [r] = await this.dataSource.query(
      `SELECT id FROM employee_profiles WHERE user_id = $1 AND profile_kind = 'reseller' AND deleted_at IS NULL`,
      [userId],
    );
    return (r?.id as string) ?? null;
  }
}
```

When `COMMISSIONS_LIVE_FROM` is unset, everything counts as "since launch". That is the safe side: nothing is hidden.

- [ ] **Step 3: `controllers/reseller-dashboard.controller.ts`**

```ts
@ApiTags('Resellers')
@ApiBearerAuth()
@Controller('resellers')
@UseGuards(JwtAuthGuard)
export class ResellerDashboardController {
  constructor(
    private readonly dashboard: ResellerDashboardService,
    private readonly birth: CommissionBirthService,
  ) {}

  @Get()
  list(@Query() q: ResellerPeriodQueryDto, @CurrentUser() user: CurrentUserType) {
    requirePermission(user, 'finance.view');
    return this.dashboard.list(q.period);
  }

  @Get('missing-commissions')
  missing(@CurrentUser() user: CurrentUserType) {
    requirePermission(user, 'finance.view');
    return this.dashboard.missing();
  }

  @Post('missing-commissions/:quoteId/create')
  async createMissing(@Param('quoteId', ParseUUIDPipe) quoteId: string, @CurrentUser() user: CurrentUserType) {
    requirePermission(user, 'finance.payments.record');
    const id = await this.birth.createForAcceptedQuote(quoteId, user.id);
    if (!id) throw new ConflictException('This quote already has a commission, or no longer earns one.');
    return { id };
  }

  @Post('missing-commissions/:quoteId/dismiss')
  async dismissMissing(
    @Param('quoteId', ParseUUIDPipe) quoteId: string,
    @Body() dto: DismissMissingDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    requirePermission(user, 'finance.payments.record');
    const id = await this.birth.dismissMissing(quoteId, dto.note, user.id);
    if (!id) throw new ConflictException('This quote already has a commission, or no longer earns one.');
    return { id };
  }

  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string, @Query() q: ResellerPeriodQueryDto, @CurrentUser() user: CurrentUserType) {
    requirePermission(user, 'finance.view');
    return this.dashboard.detail(id, q.period);
  }
}
```

- [ ] **Step 4: The "me" route on `EmployeeCommissionController`, declared FIRST in the class**

```ts
  /** The reseller's own dashboard. Opened to resellers in Task 9 (`@ResellerAllowed`). */
  @Get('me')
  async me(@Query() q: ResellerPeriodQueryDto, @CurrentUser() user: CurrentUserType) {
    const resellerId = await this.dashboard.resellerIdForUser(user.id);
    if (!resellerId) throw new NotFoundException('Only resellers have commissions');
    return this.dashboard.detail(resellerId, q.period);
  }
```

(Inject `ResellerDashboardService`.) Register the new controller and service in `employee-commissions.module.ts`, and import `CommissionBirthModule`.

- [ ] **Step 5: Verify**

Run: `npm run typecheck:backend`. Expected: pass.
Run:

```bash
TOKEN=<admin token>
curl -s "localhost:8085/api/v1/resellers?period=all" -H "Authorization: Bearer $TOKEN" | head -c 1200; echo
curl -s "localhost:8085/api/v1/resellers/missing-commissions" -H "Authorization: Bearer $TOKEN"; echo
```

Expected:
- `/resellers`: 11 rows, all zeros for money, and `resellerUnknownCount: 1` (the single legacy `reseller` lead).
- `missing-commissions`: `{ "sinceLaunch": [], "beforeLaunch": [], "liveFrom": null }`, because no local quote has a reseller yet.

Call `/resellers?period=month` and `?period=fy`. Expected: 200, and `periodStart` is `2026-08-31T18:30:00.000Z` for the month and `2026-03-31T18:30:00.000Z` for the FY (IST midnight on the 1st).

- [ ] **Step 6: Commit**

```bash
git add -A apps/backend
git commit -m "feat(commissions): reseller metrics, missing-commission list, reseller self view

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: The reseller wall — core

**Files:**
- Create: `apps/backend/src/common/reseller/reseller-allowed.decorator.ts`
- Create: `apps/backend/src/common/reseller/reseller-scope.decorator.ts`
- Create: `apps/backend/src/common/reseller/redact-for-reseller.ts`
- Create: `apps/backend/src/common/reseller/reseller-context.service.ts`
- Create: `apps/backend/src/common/reseller/reseller-ownership.service.ts`
- Create: `apps/backend/src/common/reseller/reseller-scope.interceptor.ts`
- Create: `apps/backend/src/common/reseller/reseller.module.ts`, `index.ts`
- Modify: `apps/backend/src/app.module.ts`
- Modify: `apps/backend/src/modules/auth/controllers/auth.controller.ts` (class-level `@ResellerAllowed()`)
- Modify: `employee-commission.controller.ts` (`@ResellerAllowed()` on `me` only)

**Interfaces:**
- Produces: `ResellerAllowed(): CustomDecorator`; `ResellerScope(): ParameterDecorator` (gives `string | undefined`, the reseller's `employee_profiles.id`); `ResellerContextService.resellerIdForUser(userId): Promise<string | null>`; `.assertAssignableUser(assigneeUserId, customerId)`; `.assertAssignableProfile(assigneeProfileId, customerId)`; `ResellerOwnershipService.assertOwns(kind: OwnedKind, id: string, resellerId: string): Promise<void>` with `OwnedKind = 'customer' | 'property' | 'quote' | 'project' | 'followup' | 'ticket' | 'document'`; `redactForReseller<T>(body: T): T`.

- [ ] **Step 1: The decorators**

```ts
// reseller-allowed.decorator.ts
import { SetMetadata, type CustomDecorator } from '@nestjs/common';

export const RESELLER_ALLOWED_KEY = 'resellerAllowed';

/**
 * Opens a route (or a whole controller) to reseller users.
 *
 * Everything else answers 403 to a reseller: a route added next year is
 * CLOSED to partners until someone opens it on purpose. Opening a route is a
 * promise that its handler scopes to `@ResellerScope()` — see spec §7.
 */
export const ResellerAllowed = (): CustomDecorator => SetMetadata(RESELLER_ALLOWED_KEY, true);
```

```ts
// reseller-scope.decorator.ts
import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

/**
 * The caller's reseller id (`employee_profiles.id`) when the caller IS a
 * reseller, otherwise undefined. Set by ResellerScopeInterceptor from the
 * database — never from anything the client sent.
 */
export const ResellerScope = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined =>
    ctx.switchToHttp().getRequest<{ resellerId?: string | null }>().resellerId ?? undefined,
);
```

- [ ] **Step 2: `redact-for-reseller.ts`**

```ts
/**
 * Cost and margin never reach a reseller's phone (spec §7.3). Applied to
 * EVERY reseller response by the interceptor, so a field added to a DTO
 * later is covered by name, not by someone remembering this route.
 */
const HIDDEN_KEYS = new Set([
  'profitabilityAmount',
  'profitabilityPercent',
  'marginPercent',
  'profitMarginTiers',
  'actualCost',
  'costMultiplier',
]);

/** His own record carries these; he sees the last four only. */
const MASKED_KEYS = new Set(['accountNumber', 'aadhaarNumber']);

function walk(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(walk);
  if (value === null || typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    if (HIDDEN_KEYS.has(key)) continue;
    if (MASKED_KEYS.has(key) && typeof v === 'string' && v.length > 0) {
      out[key] = `••••${v.slice(-4)}`;
      continue;
    }
    out[key] = walk(v);
  }
  return out;
}

export function redactForReseller<T>(body: T): T {
  if (body === null || body === undefined || typeof body !== 'object') return body;
  if (Buffer.isBuffer(body) || typeof (body as { pipe?: unknown }).pipe === 'function') return body;
  // JSON round trip first: it applies toJSON (Dates, class instances) exactly
  // as Express would, so what we redact IS what would have been sent.
  return walk(JSON.parse(JSON.stringify(body))) as T;
}
```

- [ ] **Step 3: `reseller-context.service.ts`**

```ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

const TTL_MS = 60_000;

/**
 * "Is this user a reseller?" from employee_profiles.profile_kind, cached per
 * user for a minute (spec §7.1, edge case 41). profile_kind is locked once
 * history exists (Task 12), so the cache cannot hide a meaningful change.
 */
@Injectable()
export class ResellerContextService {
  private readonly cache = new Map<string, { id: string | null; at: number }>();

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async resellerIdForUser(userId: string): Promise<string | null> {
    const hit = this.cache.get(userId);
    if (hit && Date.now() - hit.at < TTL_MS) return hit.id;
    const [row] = await this.dataSource.query(
      `SELECT id FROM employee_profiles
        WHERE user_id = $1 AND profile_kind = 'reseller' AND deleted_at IS NULL`,
      [userId],
    );
    const id = (row?.id as string | undefined) ?? null;
    this.cache.set(userId, { id, at: Date.now() });
    return id;
  }

  /** Spec §7.4: a reseller can only be given work on a customer he brought in. By users.id. */
  async assertAssignableUser(assigneeUserId: string | null | undefined, customerId: string): Promise<void> {
    if (!assigneeUserId) return;
    const resellerId = await this.resellerIdForUser(assigneeUserId);
    if (resellerId) await this.assertCustomerIsResellers(resellerId, customerId);
  }

  /** Same rule, for routes that take an employee_profiles.id (service tickets). */
  async assertAssignableProfile(assigneeProfileId: string | null | undefined, customerId: string): Promise<void> {
    if (!assigneeProfileId) return;
    const [row] = await this.dataSource.query(
      `SELECT id FROM employee_profiles WHERE id = $1 AND profile_kind = 'reseller'`,
      [assigneeProfileId],
    );
    if (row) await this.assertCustomerIsResellers(assigneeProfileId, customerId);
  }

  private async assertCustomerIsResellers(resellerId: string, customerId: string): Promise<void> {
    const [row] = await this.dataSource.query(
      `SELECT 1 FROM customer_profiles WHERE id = $1 AND reseller_id = $2`,
      [customerId, resellerId],
    );
    if (!row) {
      throw new BadRequestException('A reseller can only be given work on customers they brought in.');
    }
  }
}
```

- [ ] **Step 4: `reseller-ownership.service.ts`**

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export type OwnedKind = 'customer' | 'property' | 'quote' | 'project' | 'followup' | 'ticket' | 'document';

/**
 * One SQL per kind: does this id belong to this reseller? 404 when not —
 * never 403, so an id he guessed does not confirm it exists (edge case 35).
 */
const OWNS: Record<OwnedKind, string> = {
  customer: `SELECT 1 FROM customer_profiles WHERE id = $1 AND reseller_id = $2 AND deleted_at IS NULL`,
  property: `SELECT 1 FROM customer_properties p JOIN customer_profiles c ON c.id = p.customer_id
              WHERE p.id = $1 AND c.reseller_id = $2`,
  quote: `SELECT 1 FROM quotes WHERE id = $1 AND reseller_id = $2 AND deleted_at IS NULL`,
  project: `SELECT 1 FROM projects p JOIN quotes q ON q.id = p.quote_id
             WHERE p.id = $1 AND q.reseller_id = $2 AND p.deleted_at IS NULL`,
  followup: `SELECT 1 FROM followups f JOIN customer_profiles c ON c.id = f.customer_id
              WHERE f.id = $1 AND c.reseller_id = $2`,
  ticket: `SELECT 1 FROM service_tickets t JOIN customer_profiles c ON c.id = t.customer_id
            WHERE t.id = $1 AND c.reseller_id = $2`,
  // Customer and property documents only; project documents stay closed (X8).
  document: `SELECT 1 FROM documents d
              WHERE d.id = $1 AND (
                (d.entity_type = 'customer' AND d.entity_id IN (SELECT id FROM customer_profiles WHERE reseller_id = $2))
             OR (d.entity_type = 'property' AND d.entity_id IN (
                   SELECT p.id FROM customer_properties p JOIN customer_profiles c ON c.id = p.customer_id
                    WHERE c.reseller_id = $2)))`,
};

@Injectable()
export class ResellerOwnershipService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async assertOwns(kind: OwnedKind, id: string, resellerId: string): Promise<void> {
    const rows = await this.dataSource.query(OWNS[kind], [id, resellerId]);
    if (!rows[0]) throw new NotFoundException('Not found');
  }

  /** Document lists and uploads name their parent: only his customer or property. */
  async assertOwnsDocumentParent(entityType: string, entityId: string, resellerId: string): Promise<void> {
    if (entityType === 'customer') return this.assertOwns('customer', entityId, resellerId);
    if (entityType === 'property') return this.assertOwns('property', entityId, resellerId);
    throw new NotFoundException('Not found');
  }
}
```

- [ ] **Step 5: `reseller-scope.interceptor.ts`**

```ts
import {
  ForbiddenException, Injectable, type CallHandler, type ExecutionContext, type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { from, map, switchMap, type Observable } from 'rxjs';

import type { CurrentUserType } from '../../modules/auth/types';
import { RESELLER_ALLOWED_KEY } from './reseller-allowed.decorator';
import { redactForReseller } from './redact-for-reseller';
import { ResellerContextService } from './reseller-context.service';

/**
 * The reseller wall (spec §7.1).
 *
 * An INTERCEPTOR, not a guard: JwtAuthGuard is applied per controller, and a
 * global guard would run before it — with no user on the request yet.
 * Interceptors run after every guard, so `req.user` is set here.
 *
 * - Not signed in (public route) or not a reseller → untouched.
 * - Reseller on a route without @ResellerAllowed → 403.
 * - Reseller on an allowed route → `req.resellerId` set for @ResellerScope,
 *   and the response is redacted.
 */
@Injectable()
export class ResellerScopeInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly context: ResellerContextService,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (ctx.getType() !== 'http') return next.handle();
    const req = ctx.switchToHttp().getRequest<{ user?: CurrentUserType; resellerId?: string | null }>();
    if (!req.user?.id) return next.handle();

    return from(this.context.resellerIdForUser(req.user.id)).pipe(
      switchMap((resellerId) => {
        req.resellerId = resellerId;
        if (!resellerId) return next.handle();

        const allowed = this.reflector.getAllAndOverride<boolean>(RESELLER_ALLOWED_KEY, [
          ctx.getHandler(),
          ctx.getClass(),
        ]);
        if (!allowed) throw new ForbiddenException('This is not available to resellers.');

        return next.handle().pipe(map((body) => redactForReseller(body)));
      }),
    );
  }
}
```

- [ ] **Step 6: Module and registration**

```ts
// reseller.module.ts
import { Global, Module } from '@nestjs/common';

import { ResellerContextService } from './reseller-context.service';
import { ResellerOwnershipService } from './reseller-ownership.service';

@Global()
@Module({
  providers: [ResellerContextService, ResellerOwnershipService],
  exports: [ResellerContextService, ResellerOwnershipService],
})
export class ResellerModule {}
```

`index.ts` re-exports all six files. In `app.module.ts`, add `ResellerModule` to `imports` and this to `providers`:

```ts
    // The reseller wall. Deny-by-default for reseller users; see common/reseller.
    { provide: APP_INTERCEPTOR, useClass: ResellerScopeInterceptor },
```

(import `APP_INTERCEPTOR` from `@nestjs/core`).

Put `@ResellerAllowed()` on the `AuthController` class (login, refresh, logout, me, forgot password; the public ones never reach the check anyway). Put it on the `me` handler of `EmployeeCommissionController`, and switch that handler to the wall's id so there is one lookup, not two:

```ts
  @ResellerAllowed()
  @Get('me')
  me(@Query() q: ResellerPeriodQueryDto, @ResellerScope() resellerId?: string) {
    if (!resellerId) throw new NotFoundException('Only resellers have commissions');
    return this.dashboard.detail(resellerId, q.period);
  }
```

Then delete `ResellerDashboardService.resellerIdForUser` (Task 7). `ResellerContextService` owns that lookup now.

- [ ] **Step 7: Verify the wall with a real reseller user**

Run: `npm run typecheck:backend`. Expected: pass. Restart the backend preview server and check that `preview_logs` shows a clean boot.

Pick a reseller user (see Local tooling). Mint a token with the roles and permissions a staff member would have, for example `sales_executive` and `customers.view,quotes.view,projects.view`. Then run:

```bash
R=<reseller token>
for p in customers projects quotes "employees" "commissions" "resellers" "commissions/me" "auth/me"; do printf "%-16s " "$p"; curl -s -o /dev/null -w "%{http_code}\n" "localhost:8085/api/v1/$p" -H "Authorization: Bearer $R"; done
```

Expected: `customers 403`, `projects 403`, `quotes 403`, `employees 403`, `commissions 403`, `resellers 403`, `commissions/me 200`, `auth/me 200`. At this point **every** business route is closed. Tasks 10–12 open them one by one, each with its scoping.

Run the same loop with an **admin** token. Expected: no 403 from the wall. Status codes are the same as before this task.

`commissions/me` must show zero money and `"accountLast4"`, never a full account number.

- [ ] **Step 8: Commit**

```bash
git add -A apps/backend
git commit -m "feat(reseller): deny-by-default wall, scope decorator, ownership checks, response redaction

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Opening routes — the rules every route follows

This task has no code of its own. It fixes the four patterns that Tasks 10–12 apply, so every route is changed the same way. Read it before starting Task 10.

**Pattern S — scoped list.** The query DTO gets an optional `resellerId` filter. Admins can use it on the web too. For a reseller, the controller **overwrites** it:

```ts
  @ResellerAllowed()
  @Get()
  async findAll(@Query() query: XQueryDto, @CurrentUser() user: CurrentUserType, @ResellerScope() resellerId?: string) {
    if (resellerId) query.resellerId = resellerId; // server truth, client value ignored
    ...existing body...
  }
```

The repository adds one alias-safe clause. It does not need to know the joins:

```ts
    if (query.resellerId) {
      qb.andWhere(
        `<alias>.customerId IN (SELECT cp.id FROM customer_profiles cp WHERE cp.reseller_id = :resellerId)`,
        { resellerId: query.resellerId },
      );
    }
```

(For customers: `customer.resellerId = :resellerId`. For projects: `project.quoteId IN (SELECT q.id FROM quotes q WHERE q.reseller_id = :resellerId)`. For quotes, the existing `resellerId` filter at `quote.repository.ts:127` already does it.)

**Pattern O — owned id.** First line of the handler:

```ts
    if (resellerId) await this.ownership.assertOwns('<kind>', id, resellerId);
```

Inject `ResellerOwnershipService` into the controller. It is global, so no module import is needed.

**Pattern C — create by a reseller.** Overwrite the ownership fields before the service call (examples in Tasks 10 and 12). Assert that he owns any parent id in the body.

**Pattern X — closed.** No decorator. The wall answers 403. Leave the handler untouched.

**Verification pattern for every opened route:**
1. With a reseller token: his own id gives 200, and another reseller's or staff's id gives 404.
2. With an admin token: the same status and body as before the change.

---

### Task 10: Open customers, properties and follow-ups

**Files:**
- Modify: `apps/backend/src/modules/customers/controllers/customer.controller.ts`
- Modify: `apps/backend/src/modules/customers/controllers/customer-property.controller.ts`
- Modify: `apps/backend/src/modules/customers/controllers/followup.controller.ts`
- Modify: `apps/backend/src/modules/customers/dto/customer-query.dto.ts`, `property-query.dto.ts` (add `resellerId`), plus the followup query DTO used by `findWithFilters` at `followup.repository.ts:142`
- Modify: `customer-profile.repository.ts` (~780), `customer-property.repository.ts` (~415), `followup.repository.ts` (~142 and the `my`/`today`/`overdue`/`summary`/`gaps`/`my-site-work` query paths)
- Modify: `create-customer.dto.ts`, `update-customer.dto.ts` (add `resellerId`, `resellerChangeReason`; the rule itself is in Task 12)

**Route table (every route in these three controllers):**

| Route | Rule |
|---|---|
| `POST /customers` | C: `dto.resellerId = resellerId; dto.leadSource = LeadSource.RESELLER` |
| `GET /customers` | S |
| `GET /customers/groups` | open (`@ResellerAllowed`), no scoping (codes and names) |
| `GET /customers/check-availability` | open, returns booleans only |
| `GET /customers/statistics/status`, `/statistics/overview` | X |
| `GET /customers/:id` | O customer |
| `PATCH /customers/:id` | O customer; also `delete dto.resellerId; delete dto.leadSource; delete dto.resellerChangeReason` |
| `POST /customers/:id/status` (ApiAction) | O customer |
| `PATCH /customers/:id/assignee` | O customer (assignment rule in Task 12) |
| `DELETE /customers/:id` | X |
| `POST /customers/:id/lost` | O customer |
| `POST /customer-properties` | O customer on `dto.customerId` |
| `GET /customer-properties` | S (via `customerId IN …`) |
| `GET /customer-properties/my-properties` | S |
| `GET /customer-properties/customer/:customerId` | O customer |
| `GET /customer-properties/temperature/:t`, `/statistics/temperature` | X |
| `GET /customer-properties/:id`, `PATCH :id`, `PATCH :id/temperature`, `PATCH :id/set-primary` | O property |
| `DELETE /customer-properties/:id` | X |
| `POST :id/documents`, `DELETE :id/documents/:encodedUrl` | O property |
| `POST :id/complete-visit`, `:id/complete-survey`, `:id/cancel-site-activity`, `:id/lost`, `:id/reopen` | O property |
| `POST /followups` | O customer on `dto.customerId` (assignment rule in Task 12) |
| `GET /followups`, `/gaps`, `/summary`, `/my`, `/today`, `/overdue`, `/my-site-work` | S |
| `POST /followups/reassign` (bulk) | X |
| `GET /followups/:id`, `PATCH :id`, and the four `:id/*` actions (complete, reschedule, cancel, reassign) | O followup |
| `DELETE /followups/:id` | X |

- [ ] **Step 1: Add `resellerId` to the three query DTOs**

```ts
  @ApiPropertyOptional({ description: 'Only customers brought in by this reseller (employee_profiles.id)' })
  @IsOptional()
  @IsUUID()
  resellerId?: string;
```

For the follow-up summary, gaps and site-work paths that do not take a DTO: add a trailing `resellerId?: string` parameter to the service and repository methods they call, and apply the Pattern S clause on `followup.customerId`. Look up each method in `followup.controller.ts` (lines 119–260) and follow it down. Every such method must end up with the clause. Search for `createQueryBuilder('followup')` in `followup.repository.ts`: each builder that serves one of these routes gets it.

- [ ] **Step 2: Add the repository clauses (Pattern S)**

`customer-profile.repository.ts`, after the `query.assigneeId` block:

```ts
    if (query.resellerId) {
      qb.andWhere('customer.resellerId = :resellerId', { resellerId: query.resellerId });
    }
```

`customer-property.repository.ts` `findWithFilters`: the `property.customerId IN (…)` clause. `followup.repository.ts`: the `followup.customerId IN (…)` clause.

- [ ] **Step 3: Decorate and scope every route in the table**

Apply the patterns from Task 9 exactly as the table says. For Pattern C on `POST /customers`:

```ts
    if (resellerId) {
      createDto.resellerId = resellerId;
      createDto.leadSource = LeadSource.RESELLER;
    }
```

- [ ] **Step 4: Verify**

Run: `npm run typecheck:backend && npx nx test backend --testPathPattern="customers|followup"`. Expected: pass.

Seed ownership for the check. As **admin**, set one real customer's reseller through the API once Task 12 exists. For now, use a read-only look plus one targeted local update that you revert right after:

```bash
docker exec oneohm-postgres psql -U root -d oneohm_epc -c "update customer_profiles set reseller_id='<resellerId>', lead_source='reseller' where id=(select id from customer_profiles where phone='9000000808' limit 1) returning id"
```

(QA-0808 is the owner-approved test customer.) Then, with the reseller token:
- `GET /customers`: exactly 1 row (QA-0808).
- `GET /customers/<another id>`: 404.
- `GET /customer-properties/customer/<QA-0808 id>`: 200.
- `GET /followups/my`: 200.
- `DELETE /customers/<QA id>`: 403.

With the admin token, `GET /customers?limit=1` returns the same `total` as before. Leave QA-0808 tagged for the next tasks. Note the tag in the task report, so it is reverted in Task 17 if the owner wants.

- [ ] **Step 5: Commit**

```bash
git add -A apps/backend
git commit -m "feat(reseller): open customers, properties and follow-ups, scoped to his own customers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Open quotes, the calculator and projects (read-only)

**Files:**
- Modify: `apps/backend/src/modules/quotes/controllers/quote.controller.ts`, `quote-calculator.controller.ts`
- Modify: `apps/backend/src/modules/quotes/services/quote.service.ts` (reseller from customer; clearing only on draft)
- Modify: `apps/backend/src/modules/projects/controllers/project.controller.ts`, `project-attention.controller.ts`, `project-analytics.controller.ts`, `project-task.controller.ts`, `project-team.controller.ts`, `tasks.controller.ts`
- Modify: `apps/backend/src/modules/ledger/controllers/ledger.controller.ts`
- Modify: the project query DTO and `project.repository.ts` `findAll` (~161)

**Route table:**

| Route | Rule |
|---|---|
| `POST /quotes` | O customer on `dto.customerId`; O property on `dto.propertyId` if set |
| `GET /quotes` | S (existing `resellerId` filter) |
| `GET /quotes/property-lock-status` | O property on the `propertyId` query param |
| `GET /quotes/property/:propertyId/versions` | O property |
| `GET /quotes/whatsapp/health` | open |
| `GET /quotes/:id`, `PATCH :id`, `PATCH :id/status`, `POST :id/share/whatsapp`, `POST :id/void`, `DELETE :id` | O quote |
| `POST /quote-calculator/calculate` | open (dry run; redacted) |
| `POST /quote-calculator/create-from-calculation` | O customer and O property from the body |
| `GET /quote-calculator/config` | open (redaction drops `profitMarginTiers`) |
| `GET /quote-calculator/subsidy-rules`, `/subsidy-rules/all`, `/installation-pricing` | open |
| `GET /quote-calculator/installation-pricing/all` | X |
| `GET /projects` | S (via `quoteId IN …`) |
| `GET /projects/:id`, `/:id/attention`, `/:id/milestones` | O project |
| `GET /projects/:projectId/tasks` (list) | O project |
| `GET /projects/:projectId/team` (list) | O project |
| `GET /projects/:projectId/ledger/milestones` | O project |
| every other route in these project, task, team, analytics, chat and ledger controllers | X |
| `GET /tasks/my`, `/tasks/my/summary` | open (already self-scoped; a reseller has none) |
| `GET /tasks/:id`, `PATCH /tasks/*`, `POST /tasks/:id/comments` | X |

- [ ] **Step 1: The quote reseller comes from the customer (amendment 5)**

In `QuoteService.create` (the `quoteRepo.create({ … resellerId: createDto.resellerId, … })` at ~152), replace `resellerId: createDto.resellerId` with a value read before the transaction:

```ts
    // Spec §10.4 (amended): a quote's reseller is its customer's, always.
    const [owner] = await this.dataSource.query(
      `SELECT reseller_id FROM customer_profiles WHERE id = $1`,
      [createDto.customerId],
    );
    const resellerId: string | null = owner?.reseller_id ?? null;
```

Then use `resellerId,` in the create. Do the same in the calculator's `create-from-calculation` path, if it builds its own create DTO: `quote-calculator.controller.ts:258` passes `resellerId: input.resellerId`. Delete that line, because `create` now ignores it.

In `QuoteService.update` (~572), replace `resellerId: updateDto.resellerId` handling with:

```ts
    if (updateDto.resellerId !== undefined) {
      if (updateDto.resellerId !== null) {
        throw new BadRequestException("A quote's reseller comes from its customer. Change it on the customer.");
      }
      if (quote.status !== QuoteStatus.DRAFT) {
        throw new BadRequestException('The reseller can only be removed from a draft quote.');
      }
    }
```

Pass `resellerId: updateDto.resellerId` through only when it is `null`. Change the DTO field type to `resellerId?: string | null` with `@ValidateIf((o) => o.resellerId !== null) @IsUUID()`.

- [ ] **Step 2: Decorate and scope every route in the table**

For projects (Pattern S), add `resellerId?: string` to the project query DTO. In `project.repository.ts` `findAll`, add:

```ts
    if (query.resellerId) {
      qb.andWhere('project.quoteId IN (SELECT q.id FROM quotes q WHERE q.reseller_id = :resellerId)', {
        resellerId: query.resellerId,
      });
    }
```

In the project list controller, a reseller must **not** be pinned to "projects I am a member of" (`resolveProjectListMemberId`, `admin-roles.ts:44`). He is on no team, so he would see nothing. When `resellerId` is set, skip the member pin and rely on the reseller clause:

```ts
    const memberId = resellerId
      ? undefined
      : resolveProjectListMemberId(user.roles, user.permissions, user.id, { ... });
```

(Keep whatever options object the existing call passes.) The same applies to `GET /projects/:id`: if the service checks team membership for non-admins, bypass that check when the ownership assert has already passed. Find the check with `grep -n "canViewAllProjects\|isMember\|team" apps/backend/src/modules/projects/services/project.service.ts`. Pass a `viaReseller: true` flag, or run the ownership assert and call the repository read directly. Choose whichever needs the smaller change, and say which in the commit message.

Do the same for `GET /projects/:projectId/team`. Per `endpoints.ts`, it returns "403 for staff who are neither on the team nor see-all", so the reseller path must skip that membership check after `assertOwns`.

- [ ] **Step 3: Log discount probing by resellers (edge case 38)**

The margin cap (`quote.service.ts:985`, "Discount cannot exceed 50% of the margin") can be probed to guess the margin. When a reseller hits it, write an audit row, then rethrow. In `quote.controller.ts` (`POST /quotes`, `PATCH /quotes/:id`) and `quote-calculator.controller.ts` (`calculate`, `create-from-calculation`), wrap the service call:

```ts
    try {
      return await <existing service call>;
    } catch (error) {
      if (resellerId && error instanceof BadRequestException && /exceed 50% of the margin/.test(error.message)) {
        await this.auditLogService.create({
          entityType: AuditEntityType.QUOTE,
          entityId: <the quote id if there is one, else the customer id from the body>,
          action: AuditAction.REJECT,
          newValues: { reason: 'Reseller discount above the margin cap', discountAmount: <dto discount>, resellerId },
          userId: user.id,
        });
      }
      throw error;
    }
```

Import `AuditModule` into `quotes.module.ts` if it is not there yet, and inject `AuditLogService`. Find the discount field on each DTO with `grep -n "discount" apps/backend/src/modules/quotes/dto/**/*.ts`.

- [ ] **Step 4: Verify**

Run: `npm run typecheck:backend && npx nx test backend --testPathPattern="quote|project"`. Expected: pass.

With the reseller token (QA-0808 tagged in Task 10):
- `GET /quotes` returns only QA-0808's quotes (the list may be empty; that is fine).
- `GET /quote-calculator/config` has **no** `profitMarginTiers` key. Check with `| grep -c profitMarginTiers`, which must print `0`.
- `GET /projects/<the PRJ-…-0243 id>` returns 404 for now, because its quote was made before `reseller_id` existed.

As admin, `GET /quotes/<a QA-0808 quote id>` still has `quoteSnapshot.calculation.profitabilityAmount` (not redacted for staff).

Check a project read end to end for a reseller:

```bash
docker exec oneohm-postgres psql -U root -d oneohm_epc -c "update quotes set reseller_id='<resellerId>' where id=(select quote_id from projects where project_number like '%-0243') returning id"
```

`GET /projects/<id>` with the reseller token now returns 200, **without** `actualCost`. `PATCH /projects/<id>` returns 403. `GET /projects/<id>/ledger/milestones` returns 200. Revert this one quote at the end of Task 17, or keep it, as the owner prefers.

Probe the cap once: `POST /quote-calculator/calculate` as the reseller, with a discount far above any margin. Expected: 400, and one new `audit_logs` row with `action = 'reject'`.

- [ ] **Step 5: Commit**

```bash
git add -A apps/backend
git commit -m "feat(reseller): open quotes, calculator and read-only projects; quote reseller from customer

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Open the rest; lead-source rule; assignment rules; profile-kind lock

**Files:**
- Modify: `service-tickets/controllers/service-ticket.controller.ts`, `documents/controllers/document.controller.ts`, `storage/controllers/storage.controller.ts`, `notifications/controllers/notification.controller.ts`, `comments/controllers/comment.controller.ts`, `users/controllers/user.controller.ts`, `employees/controllers/employee.controller.ts`, `discoms/controllers/discom.controller.ts`, `master-data/controllers/product.controller.ts`, `product-type.controller.ts`
- Modify: `customers/services/customer.service.ts` (`create` ~108, `update` ~275, the assignee update), `customers/customers.module.ts` (import `AuditModule` if missing)
- Modify: `customers/services/followup.service.ts` (create ~62, reassign ~335 and ~352)
- Modify: `service-tickets/services/*` (create and update assignee)
- Modify: `projects/services/*` (team add), `employees/services/employee.service.ts` (profile-kind lock)

**Route table:**

| Route | Rule |
|---|---|
| `GET /service-tickets` | S (via `customerId IN …`) |
| `GET /service-tickets/:id`, `PATCH :id`, `PATCH :id/status`, `PATCH :id/checklist` | O ticket |
| `POST /service-tickets`, `DELETE :id`, `GET /service-tickets/stats` | X |
| `GET /documents` | require `entityType` and `entityId` query params → `assertOwnsDocumentParent` |
| `POST /documents`, `POST /documents/bulk` | `assertOwnsDocumentParent` for each document's `entityType`/`entityId` |
| `DELETE /documents/:id` | O document |
| other document routes | X |
| `POST /storage/presigned-url` | open (upload signing only) |
| other storage routes | X |
| all four `/notifications` routes | open (self-scoped; confirm in Step 4) |
| `GET /comments/mentions/count` | open |
| other comment routes | X |
| `POST /users/device-token`, `GET /users/check-availability` | open |
| `PATCH /users/:id` | open **only when `id === user.id`**, otherwise 404 |
| other user routes, `/invitations` | X |
| `GET /employees/me` | open (redaction masks the bank number) |
| `PATCH /employees/:id` | open **only when `id` is his own profile id**, otherwise 404; strip `profileKind`, `commissionPercentage` and bank fields from the DTO |
| `GET /employees` | open, force `profileKind = staff` for a reseller |
| other employee routes | X |
| `GET /discoms`, `GET /discoms/:id`, `GET /products`, `GET /products/:id`, `GET /product-types` | open |
| everything else in those controllers | X |
| `GET /approval-requests/stats/pending-count` | X |

- [ ] **Step 1: Decorate and scope the routes above**

Use the Task 9 patterns. For the notification service, open `notification.service.ts`. Every read must already filter by the current user id. If one does not, the route stays **X** and gets a note in the commit message.

- [ ] **Step 2: The lead-source rule and the reseller change (spec §10.4) in `customer.service.ts`**

Add a private helper and call it from `create` and `update`:

```ts
  /**
   * Source "reseller" ⇔ a reseller is named. Both ways, on every save.
   * Returns the reseller id to store.
   */
  private async resolveReseller(
    leadSource: string | null | undefined,
    resellerId: string | null | undefined,
  ): Promise<string | null> {
    const isResellerSource = leadSource === LeadSource.RESELLER;
    if (isResellerSource && !resellerId) {
      throw new BadRequestException('Lead source is Reseller — choose which reseller.');
    }
    if (!isResellerSource && resellerId) {
      throw new BadRequestException('A reseller can only be set when the lead source is Reseller.');
    }
    if (!resellerId) return null;
    const [row] = await this.dataSource.query(
      `SELECT status FROM employee_profiles
        WHERE id = $1 AND profile_kind = 'reseller' AND deleted_at IS NULL`,
      [resellerId],
    );
    if (!row) throw new BadRequestException('That reseller does not exist.');
    if (row.status !== 'active') throw new BadRequestException('That reseller is not active.');
    return resellerId;
  }
```

In `create`: `const resellerId = await this.resolveReseller(createDto.leadSource, createDto.resellerId);`. Store it on the new row.

In `update(id, dto, updatedBy, actor?: CurrentUserType)`, add the new optional 4th parameter and pass `currentUser` from the controller:

```ts
    const nextSource = updateDto.leadSource !== undefined ? updateDto.leadSource : existing.leadSource;
    // Moving the source away from Reseller clears the reseller (edge case 49).
    const nextResellerInput =
      updateDto.resellerId !== undefined
        ? updateDto.resellerId
        : nextSource === LeadSource.RESELLER ? existing.resellerId : null;
    const nextResellerId = await this.resolveReseller(nextSource, nextResellerInput);

    if ((existing.resellerId ?? null) !== nextResellerId) {
      if (!actor || !(hasAdminBypassRole(actor.roles) || actor.permissions.includes('customers.assign'))) {
        throw new ForbiddenException('Changing a customer\'s reseller needs the "customers.assign" permission.');
      }
      if (!updateDto.resellerChangeReason || updateDto.resellerChangeReason.trim().length < 3) {
        throw new BadRequestException('Say why the reseller is changing.');
      }
    }
```

After the save, when the reseller changed, run this in the same transaction if `update` has one. Otherwise run it right after:

```ts
      await this.dataSource.query(
        `UPDATE quotes SET reseller_id = $2, updated_at = now()
          WHERE customer_id = $1 AND status = 'draft' AND deleted_at IS NULL`,
        [id, nextResellerId],
      );
      await this.auditLogService.create({
        entityType: AuditEntityType.CUSTOMER,
        entityId: id,
        action: AuditAction.UPDATE,
        oldValues: { resellerId: existing.resellerId ?? null },
        newValues: { resellerId: nextResellerId, reason: updateDto.resellerChangeReason },
        userId: actor?.id,
      });
```

`resellerChangeReason` is a new optional `@IsString() @MaxLength(500)` field on `UpdateCustomerDto`. Other callers of `customerService.update` (run `grep -rn "customerService.update(" apps/backend/src`) do not pass `actor`. That is correct: they never change the reseller, so the check does not fire. If one does, it fails loudly, and that is the intent.

- [ ] **Step 3: Assignment rules (spec §7.4)**

Inject `ResellerContextService` and call:
- `followup.service.ts` `create`: `await this.resellerContext.assertAssignableUser(createDto.assignedToUserId, createDto.customerId);`
- `followup.service.ts` `update` / `reassign(id, assignedToUserId)`: load the follow-up's `customerId` first, then the same call.
- `followup.service.ts` bulk reassign (~352): for each affected follow-up, the same call. Fail the whole request on the first violation.
- `customer.service.ts` assignee update: `assertAssignableUser(assigneeId, customerId)`.
- The service ticket create/update paths that set an assignee (`assigneeId` is an **employee_profiles.id**): `assertAssignableProfile(dto.assigneeId, ticket.customerId)`.
- Adding a project team member: if `resellerIdForUser(member.userId)` is set, throw `BadRequestException('Resellers cannot be added to a project team; they see their projects read-only.')`.

- [ ] **Step 4: The profile-kind lock (spec §10.5)**

In `employee.service.ts`, wherever an update can change `profileKind`:

```ts
    if (dto.profileKind && dto.profileKind !== existing.profileKind) {
      const [used] = await this.dataSource.query(
        `SELECT (EXISTS (SELECT 1 FROM customer_profiles WHERE reseller_id = $1)
              OR EXISTS (SELECT 1 FROM employee_commissions WHERE employee_id = $1)
              OR EXISTS (SELECT 1 FROM quotes WHERE reseller_id = $1)) AS used`,
        [existing.id],
      );
      if (used?.used) {
        throw new BadRequestException(
          'This reseller has customers, quotes or commissions, so the profile type cannot change.',
        );
      }
    }
```

- [ ] **Step 5: Verify**

Run: `npm run typecheck:backend && npx nx test backend --testPathPattern="customer|followup|service-ticket|employee|document"`. Expected: pass.

Check the route table with the reseller token, one route per group. Expected:
- `GET /employees` returns only staff.
- `GET /employees/me` shows a masked account number.
- `PATCH /users/<another user id>` returns 404.
- `GET /documents?entityType=project&entityId=<the 0243 id>` returns 404.
- `GET /service-tickets/stats` returns 403.
- `GET /notifications` returns 200.

Check the lead-source rule as **admin**:
- `PATCH /customers/<QA id>` with `{"leadSource":"referral"}` and no reason returns 400 "Say why…".
- With `{"leadSource":"referral","resellerChangeReason":"test revert"}` it returns 200.
- Then read the row. `reseller_id` must be null.
- Set it back with `{"leadSource":"reseller","resellerId":"<id>","resellerChangeReason":"test"}`.
- An `audit_logs` row exists for each change (`select * from audit_logs where entity_id='<QA id>' order by created_at desc limit 2`).

Check the assignment rule: as admin, create a follow-up on a **non-QA** customer, assigned to the reseller's `user_id`. Expected: 400 "A reseller can only be given work…".

- [ ] **Step 6: Commit**

```bash
git add -A apps/backend
git commit -m "feat(reseller): open tickets, docs, self routes; lead-source rule; assignment rules; profile-kind lock

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Web — data hooks, routes, navigation, gates

**Files:**
- Create: `apps/web/lib/hooks/resources/resellers.ts`
- Modify: `apps/web/lib/config/routes.ts` (`ORG.RESELLER_DETAIL: '/resellers/[id]'`; `ROUTE_TO_PANEL_MAP` gets `[ROUTES.ORG.RESELLERS]: 'finance'`)
- Modify: `apps/web/lib/rbac/route-map.ts` (before the `/finance` line: `{ pattern: /^\/resellers(\/|$)/, gate: 'finance.view' },`)
- Modify: `apps/web/lib/config/navigation.ts` (finance panel: a new section)
- Modify: `apps/web/lib/hooks/resources/payment-approvals.ts:18` (`ApprovalKind` gets `'commission'`) and the approvals page's kind label map

**Interfaces:**
- Consumes: the Task 7 API
- Produces: `useResellers(period)`, `useReseller(id, period)`, `useMissingCommissions()`, `useCommissionMutations()` with the mutations `approve`, `edit`, `cancel`, `recordPayment`, `closeRecovery`, `createMissing` and `dismissMissing`, and the types `ResellerSummary`, `ResellerTotals`, `ResellerHeader`, `CommissionRow`, `MissingRow`, `ResellerPeriod`.

- [ ] **Step 1: `lib/hooks/resources/resellers.ts`**

```ts
'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import type { CommissionState } from '@tejas96/shared/utils';
import type { AxiosError } from 'axios';

import { useRefreshMoneyViews } from './payment-approvals';

import { showToast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/utils/error';

// Types mirror apps/backend/src/modules/employees/commissions (sql/*.sql.ts).

export type ResellerPeriod = 'month' | 'fy' | 'all';

export interface ResellerSummary {
  resellerId: string; name: string; code: string | null; status: string; ratePercent: number | null;
  leads: number; quoted: number; won: number; winRate: number | null;
  revenuePaise: number; pendingPaise: number; owedPaise: number; paidPaise: number; toRecoverPaise: number;
}
export interface ResellerTotals { pendingPaise: number; owedPaise: number; paidPaise: number; toRecoverPaise: number }
export interface ResellerHeader {
  resellerId: string; name: string; code: string | null; status: string; ratePercent: number | null;
  bankName: string | null; accountLast4: string | null; gstin: string | null; phone: string | null;
}
export interface CommissionRow {
  id: string; resellerId: string; resellerName: string; quoteId: string; quoteNumber: string;
  acceptedAt: string | null; customerId: string; customerName: string;
  projectId: string | null; projectNumber: string | null; projectStatus: string | null;
  basePaise: number; ratePercent: number; amountPaise: number;
  baseSource: 'discounted_base' | 'derived' | 'manual' | 'missing';
  rateSource: 'profile' | 'manual' | 'missing';
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  payoutRequestId: string | null; payoutRequestNo: string | null; payoutRejectedReason: string | null;
  expenseEntryId: string | null; approvedAt: string | null; paidAt: string | null;
  paymentMode: string | null; paymentReference: string | null; invoiceNumber: string | null;
  recoveredAt: string | null; recoveredPaise: number | null; recoveryNotes: string | null;
  cancelReason: string | null; notes: string | null; createdAt: string; state: CommissionState;
}
export interface MissingRow {
  quoteId: string; quoteNumber: string; acceptedAt: string; resellerId: string; resellerName: string; customerName: string;
}

const keys = {
  root: () => ['resellers'] as const,
  list: (period: ResellerPeriod) => ['resellers', 'list', period] as const,
  one: (id: string, period: ResellerPeriod) => ['resellers', 'one', id, period] as const,
  missing: () => ['resellers', 'missing'] as const,
};

export function useResellers(period: ResellerPeriod): UseQueryResult<
  { rows: ResellerSummary[]; totals: ResellerTotals; resellerUnknownCount: number; periodStart: string | null },
  AxiosError
> {
  return useQuery({
    queryKey: keys.list(period),
    queryFn: async ({ signal }) => (await apiClient.get('/resellers', { params: { period }, signal })).data,
    staleTime: 15_000,
  });
}

export function useReseller(id: string, period: ResellerPeriod): UseQueryResult<
  { reseller: ResellerHeader; summary: ResellerSummary; commissions: CommissionRow[]; periodStart: string | null },
  AxiosError
> {
  return useQuery({
    queryKey: keys.one(id, period),
    queryFn: async ({ signal }) => (await apiClient.get(`/resellers/${id}`, { params: { period }, signal })).data,
    enabled: Boolean(id),
    staleTime: 15_000,
  });
}

export function useMissingCommissions(): UseQueryResult<
  { sinceLaunch: MissingRow[]; beforeLaunch: MissingRow[]; liveFrom: string | null },
  AxiosError
> {
  return useQuery({
    queryKey: keys.missing(),
    queryFn: async ({ signal }) => (await apiClient.get('/resellers/missing-commissions', { signal })).data,
    staleTime: 30_000,
  });
}

export function useCommissionMutations() {
  const qc = useQueryClient();
  const refreshMoney = useRefreshMoneyViews();
  const done = (msg: string) => () => {
    void qc.invalidateQueries({ queryKey: keys.root() });
    refreshMoney();
    showToast.success(msg);
  };
  const fail = (e: unknown) => showToast.error(getErrorMessage(e));

  return {
    approve: useMutation({
      mutationFn: async (id: string) => (await apiClient.post<CommissionRow>(`/commissions/${id}/approve`)).data,
      onSuccess: done('Approved'), onError: fail,
    }),
    edit: useMutation({
      mutationFn: async (v: { id: string; baseAmount?: number; ratePercent?: number; reason: string }) =>
        (await apiClient.patch<CommissionRow>(`/commissions/${v.id}`, { baseAmount: v.baseAmount, ratePercent: v.ratePercent, reason: v.reason })).data,
      onSuccess: done('Saved — it needs approval again'), onError: fail,
    }),
    cancel: useMutation({
      mutationFn: async (v: { id: string; reason: string }) =>
        (await apiClient.post<CommissionRow>(`/commissions/${v.id}/cancel`, { reason: v.reason })).data,
      onSuccess: done('Cancelled'), onError: fail,
    }),
    recordPayment: useMutation({
      mutationFn: async (v: {
        commissionIds: string[]; valueDate: string; paymentMethod: string; reference: string;
        invoiceNumber?: string; invoiceDate?: string; notes?: string;
      }) => (await apiClient.post<CommissionRow[]>('/commissions/record-payment', v)).data,
      onSuccess: done('Sent for approval — it shows in Payment Approvals'), onError: fail,
    }),
    closeRecovery: useMutation({
      mutationFn: async (v: { id: string; amountReceived: number; date: string; note: string }) =>
        (await apiClient.post<CommissionRow>(`/commissions/${v.id}/close-recovery`, { amountReceived: v.amountReceived, date: v.date, note: v.note })).data,
      onSuccess: done('Recovery closed'), onError: fail,
    }),
    createMissing: useMutation({
      mutationFn: async (quoteId: string) => (await apiClient.post(`/resellers/missing-commissions/${quoteId}/create`)).data,
      onSuccess: done('Commission created'), onError: fail,
    }),
    dismissMissing: useMutation({
      mutationFn: async (v: { quoteId: string; note: string }) =>
        (await apiClient.post(`/resellers/missing-commissions/${v.quoteId}/dismiss`, { note: v.note })).data,
      onSuccess: done('Dismissed'), onError: fail,
    }),
  };
}
```

- [ ] **Step 2: Routes, gate, navigation, approvals label**

`routes.ts` `ORG`: add `RESELLER_DETAIL: '/resellers/[id]',`. In `ROUTE_TO_PANEL_MAP`, under the finance entries, add `[ROUTES.ORG.RESELLERS]: 'finance',`.

`route-map.ts`: add `{ pattern: /^\/resellers(\/|$)/, gate: 'finance.view' },` directly **above** the `/finance/receivables` line.

`navigation.ts`, finance panel `sections`, after the `MONEY` section:

```ts
        {
          title: 'RESELLERS',
          permission: ALWAYS_OPEN,
          items: [
            {
              id: 'finance-resellers',
              permission: 'finance.view',
              icon: Handshake,
              label: 'Resellers',
              href: ROUTES.ORG.RESELLERS,
            },
          ],
        },
```

(Import `Handshake` from `lucide-react`, next to the other icons.)

`payment-approvals.ts`: set `ApprovalKind` to `'receipt' | 'expense' | 'reversal' | 'vendor_payment' | 'commission'`. Then run `grep -rn "vendor_payment" apps/web/components/features/payment-approvals` to find the label and tone maps. Add `commission: 'Commission'` and the expense tone to each. TypeScript flags every `Record<ApprovalKind, …>` that misses it.

- [ ] **Step 3: Verify**

Run: `npm run typecheck:web && npx nx lint web`. Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add -A apps/web
git commit -m "feat(web): reseller data hooks, route, gate, nav; commission kind in approvals

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Web — `/resellers` and the Fix strip

**Files:**
- Create: `apps/web/components/features/resellers/stat-card.tsx`
- Create: `apps/web/components/features/resellers/commission-state.ts`
- Create: `apps/web/components/features/resellers/resellers-columns.tsx`
- Create: `apps/web/components/features/resellers/missing-commissions-strip.tsx`
- Create: `apps/web/components/features/resellers/resellers-page.tsx`
- Create: `apps/web/components/features/resellers/index.ts`
- Create: `apps/web/app/(dashboard)/resellers/page.tsx`

**Interfaces:**
- Consumes: Task 13 hooks
- Produces: `StatCard`, `PeriodChips`, `COMMISSION_STATE_TONE: Record<CommissionState, CrmTone>`, `ResellersPage`

- [ ] **Step 1: `stat-card.tsx`**

Copy `StatCard` exactly from `components/features/ledger/finance-payables-page.tsx:17-70` into this file and export it. It stays local to each feature, as the house does. Also export `PeriodChips`:

```tsx
export function PeriodChips({ value, onChange }: { value: ResellerPeriod; onChange: (p: ResellerPeriod) => void }): JSX.Element {
  const items: Array<{ key: ResellerPeriod; label: string }> = [
    { key: 'month', label: 'This month' },
    { key: 'fy', label: 'This FY' },
    { key: 'all', label: 'All time' },
  ];
  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
      {items.map((i) => (
        <Chip
          key={i.key}
          label={i.label}
          size="small"
          color={value === i.key ? 'primary' : 'default'}
          variant={value === i.key ? 'filled' : 'outlined'}
          onClick={() => onChange(i.key)}
        />
      ))}
      <Box component="span" sx={{ fontSize: crm['text-row-sm'], color: color['text-tertiary'] }}>
        Leads and win rate count by lead date. Revenue counts by the date the deal was won.
      </Box>
    </Box>
  );
}
```

- [ ] **Step 2: `commission-state.ts`**

```ts
import type { CommissionState } from '@tejas96/shared/utils';

import type { CrmTone } from '@/components/shared/crm-table';

export const COMMISSION_STATE_TONE: Record<CommissionState, CrmTone> = {
  pending: 'neutral',
  needs_amount: 'warning',
  on_hold: 'warning',
  waiting_for_project: 'info',
  approved: 'info',
  payment_in_review: 'info',
  paid: 'success',
  to_recover: 'danger',
  recovered: 'neutral',
  cancelled: 'neutral',
};
```

Confirm the tone names first. Run `grep -n "export type CrmTone" -A3 apps/web/components/shared/crm-table/types.ts` and use its exact members. If `info` is missing, use `neutral` in its place.

- [ ] **Step 3: `resellers-columns.tsx`**

```tsx
'use client';

import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { Box, IconButton, ListItemIcon, Menu, MenuItem } from '@mui/material';
import { type JSX, useState } from 'react';

import { CrmStatusPill, type CrmColumn } from '@/components/shared/crm-table';
import type { ResellerSummary } from '@/lib/hooks/resources/resellers';
import { color, crm } from '@/lib/theme/tokens';
import { formatPaise } from '@/lib/utils/paise';

function Money({ paise, danger }: { paise: number; danger?: boolean }): JSX.Element {
  return (
    <Box sx={{ fontVariantNumeric: 'tabular-nums', color: paise === 0 ? color['text-tertiary'] : danger ? color.danger : undefined }}>
      {paise === 0 ? '—' : formatPaise(paise)}
    </Box>
  );
}

/** Always visible `⋮` — never a hover reveal. */
function RowMenu({ row, onOpen }: { row: ResellerSummary; onOpen: (r: ResellerSummary) => void }): JSX.Element {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <IconButton size="small" aria-label={`Actions for ${row.name}`} onClick={(e) => { e.stopPropagation(); setAnchor(e.currentTarget); }}>
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} onClick={(e) => e.stopPropagation()}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <MenuItem onClick={() => { setAnchor(null); onOpen(row); }}>
          <ListItemIcon><OpenInNewIcon fontSize="small" /></ListItemIcon>
          Open
        </MenuItem>
      </Menu>
    </>
  );
}

export function buildResellerColumns(onOpen: (r: ResellerSummary) => void): CrmColumn<ResellerSummary>[] {
  return [
    {
      field: 'name', header: 'Reseller', track: crm['col-customer'],
      renderCell: (r) => (
        <Box sx={{ opacity: r.status === 'active' ? 1 : 0.55 }}>
          <Box sx={{ fontWeight: 600 }}>{r.name}</Box>
          <Box sx={{ fontSize: crm['text-row-sm'], color: color['text-tertiary'] }}>
            {[r.code, r.status !== 'active' ? r.status : null].filter(Boolean).join(' · ') || '—'}
          </Box>
        </Box>
      ),
    },
    {
      field: 'rate', header: 'Rate', track: crm['col-status'], align: 'right',
      renderCell: (r) => (r.ratePercent === null ? <CrmStatusPill tone="warning" label="Not set" /> : `${r.ratePercent}%`),
    },
    {
      field: 'funnel', header: 'Leads → quoted → won', track: crm['col-portfolio'],
      renderCell: (r) => (
        <Box sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {r.leads} → {r.quoted} → {r.won}
          <Box component="span" sx={{ ml: 1, color: color['text-tertiary'] }}>{r.winRate === null ? '—' : `${r.winRate}%`}</Box>
        </Box>
      ),
    },
    { field: 'revenue', header: 'Revenue', track: crm['col-pay-payable'], align: 'right', renderCell: (r) => <Money paise={r.revenuePaise} /> },
    { field: 'pending', header: 'Pending', track: crm['col-pay-payable'], align: 'right', renderCell: (r) => <Money paise={r.pendingPaise} /> },
    { field: 'owed', header: 'Owed', track: crm['col-pay-payable'], align: 'right', renderCell: (r) => <Money paise={r.owedPaise} /> },
    { field: 'paid', header: 'Paid', track: crm['col-pay-payable'], align: 'right', renderCell: (r) => <Money paise={r.paidPaise} /> },
    { field: 'recover', header: 'To recover', track: crm['col-pay-payable'], align: 'right', renderCell: (r) => <Money paise={r.toRecoverPaise} danger /> },
    { field: 'actions', header: '', track: crm['col-actions'], align: 'right', stopPropagation: true, renderCell: (r) => <RowMenu row={r} onOpen={onOpen} /> },
  ];
}
```

Check `CrmStatusPill`'s props (`tone`, `label`) against its definition (`grep -n "export function CrmStatusPill" -A8 apps/web/components/shared/crm-table/*.tsx`). Check every `crm['col-…']` key used here against the token list (`grep -o "'col-[a-z0-9-]*'" apps/web/lib/theme/tokens.ts`). All the keys above exist today. If a column looks cramped in the browser, add `col-reseller-*` tokens next to the `col-pay-*` ones in `lib/theme/tokens.ts`, following their shape.

- [ ] **Step 4: `missing-commissions-strip.tsx`**

```tsx
'use client';

import { Alert, Box, Button, Collapse } from '@mui/material';
import { type JSX, useState } from 'react';

import { useCommissionMutations, useMissingCommissions, type MissingRow } from '@/lib/hooks/resources/resellers';
import { useGatedAction } from '@/lib/rbac';
import { formatBusinessDate } from '@/lib/utils';

/**
 * Accepted reseller deals with no commission row (spec §10.3). Renders
 * NOTHING at zero — a green "all good" strip is a fact nobody needs.
 */
export function MissingCommissionsStrip(): JSX.Element | null {
  const { data } = useMissingCommissions();
  const [open, setOpen] = useState(false);
  const m = useCommissionMutations();
  const gate = useGatedAction('finance.payments.record', 'Fix missing commissions');

  const since = data?.sinceLaunch ?? [];
  const before = data?.beforeLaunch ?? [];
  const total = since.length + before.length;
  if (total === 0) return null;

  const row = (r: MissingRow): JSX.Element => (
    <Box key={r.quoteId} sx={{ display: 'flex', gap: 2, alignItems: 'center', py: 0.75, flexWrap: 'wrap' }}>
      <Box sx={{ flex: '1 1 260px' }}>
        <strong>{r.quoteNumber}</strong> · {r.customerName} · {r.resellerName} · won {formatBusinessDate(r.acceptedAt)}
      </Box>
      <Button size="small" variant="contained" disabled={m.createMissing.isPending}
        onClick={() => gate(() => m.createMissing.mutate(r.quoteId))}>Create</Button>
      <Button size="small" disabled={m.dismissMissing.isPending}
        onClick={() => gate(() => {
          const note = window.prompt(`Why does ${r.quoteNumber} earn no commission?`);
          if (note && note.trim().length >= 3) m.dismissMissing.mutate({ quoteId: r.quoteId, note: note.trim() });
        })}>Dismiss</Button>
    </Box>
  );

  return (
    <Alert severity="warning" action={<Button size="small" onClick={() => setOpen((o) => !o)}>{open ? 'Hide' : 'Review'}</Button>}>
      {total === 1 ? '1 accepted deal has no commission row.' : `${total} accepted deals have no commission row.`}
      <Collapse in={open}>
        {since.length > 0 && <Box sx={{ mt: 1 }}><strong>Since launch</strong>{since.map(row)}</Box>}
        {before.length > 0 && <Box sx={{ mt: 1 }}><strong>Before launch</strong> — decide each one{before.map(row)}</Box>}
      </Collapse>
    </Alert>
  );
}
```

Check `useGatedAction`'s real signature first: `grep -n "export function useGatedAction" -A15 apps/web/lib/rbac/*.ts*`. Adapt the call shape to it (the pay-vendor dialog uses it). `window.prompt` is a stopgap that the owner's "less control" rule allows for a rare admin action. If `components/ui` has a small reason dialog (`grep -rln "reason" apps/web/components/ui`), use that instead. The `ReasonDialog` in Task 15 is reusable here once it exists; move to it in Task 15 Step 5.

- [ ] **Step 5: `resellers-page.tsx` and the route page**

```tsx
'use client';

import { Box } from '@mui/material';
import { useRouter } from 'next/navigation';
import { type JSX, useMemo, useState } from 'react';

import { MissingCommissionsStrip } from './missing-commissions-strip';
import { buildResellerColumns } from './resellers-columns';
import { PeriodChips, StatCard } from './stat-card';

import { CrmTable } from '@/components/shared/crm-table';
import { buildUrl, ROUTES } from '@/lib/config/routes';
import { useResellers, type ResellerPeriod, type ResellerSummary } from '@/lib/hooks/resources/resellers';
import { color, crm } from '@/lib/theme/tokens';
import { formatPaise } from '@/lib/utils/paise';

/**
 * Every reseller, how they perform, and what we owe them right now.
 * Money cards are "right now"; the period only moves funnel and revenue.
 * Totals come from the API — never summed from the visible page.
 */
export function ResellersPage(): JSX.Element {
  const router = useRouter();
  const [period, setPeriod] = useState<ResellerPeriod>('fy');
  const q = useResellers(period);
  const rows = q.data?.rows ?? [];
  const t = q.data?.totals;

  const open = (r: ResellerSummary): void => router.push(buildUrl(ROUTES.ORG.RESELLER_DETAIL, { id: r.resellerId }));
  const columns = useMemo(() => buildResellerColumns(open), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: { xs: 2, lg: 3 } }}>
      <Box>
        <Box component="span" sx={{ fontSize: 'var(--text-overline-size)', fontWeight: 700, letterSpacing: 'var(--text-overline-track)', textTransform: 'uppercase', color: color['text-tertiary'] }}>Finance</Box>
        <Box component="h1" sx={{ m: 0, mt: '5px', mb: '3px', fontSize: crm['text-page-title'], fontWeight: 700, letterSpacing: crm['text-page-title-track'] }}>Resellers</Box>
        <Box component="p" sx={{ m: 0, fontSize: crm['text-row-title'], color: color['text-secondary'] }}>
          Who sends us customers, how many we win, and what we owe each reseller.
        </Box>
      </Box>

      <MissingCommissionsStrip />

      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' } }}>
        <StatCard label="Owed now" value={formatPaise(t?.owedPaise ?? 0)} note="approved, not yet paid" />
        <StatCard label="Pending approval" value={formatPaise(t?.pendingPaise ?? 0)} note="waiting for a yes" />
        <StatCard label="Paid" value={formatPaise(t?.paidPaise ?? 0)} note="all time" />
        <StatCard label="To recover" value={formatPaise(t?.toRecoverPaise ?? 0)} note="paid on deals that died" danger={(t?.toRecoverPaise ?? 0) > 0} />
      </Box>

      <PeriodChips value={period} onChange={setPeriod} />

      {(q.data?.resellerUnknownCount ?? 0) > 0 && (
        <Box sx={{ fontSize: crm['text-row-sm'], color: color['text-secondary'] }}>
          {q.data?.resellerUnknownCount} lead(s) say "Reseller" but name nobody. Open them in Customers and pick the reseller.
        </Box>
      )}

      <CrmTable<ResellerSummary>
        columns={columns}
        rows={rows}
        getRowId={(r) => r.resellerId}
        loading={q.isLoading}
        refetching={q.isFetching && !q.isLoading}
        onRowClick={open}
        itemLabel="resellers"
        emptyMessage="No resellers yet. Add a user with Profile Type = Reseller in Admin → Users."
      />
    </Box>
  );
}
```

Check `buildUrl`'s signature in `routes.ts` (~302): `buildUrl(path, params)`. `app/(dashboard)/resellers/page.tsx`:

```tsx
import { type JSX } from 'react';

import { ResellersPage } from '@/components/features/resellers';

// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function Page(): JSX.Element {
  return <ResellersPage />;
}
```

The money cards are "right now" and the table columns use the same figures per reseller. That is not the same fact twice: the scopes differ (org total vs one reseller). The owner's one-fact-one-home rule allows it.

- [ ] **Step 6: Verify in the browser**

Run: `npm run typecheck:web && npx nx lint web`. Expected: pass.
Start `web` and `backend` in the pane, log in as an admin (ask the owner if no session is live), and open `http://localhost:3001/resellers`. Then:
- Take a screenshot. Expected: 11 rows, the 4 cards at ₹0, and 2 rows with "Not set" in the rate column. The QA-0808 reseller shows `1 → …` in the funnel. The strip is absent.
- Run `read_console_messages` with `onlyErrors`. Expected: none.
- Resize to `mobile`. Expected: the cards stack and the table scrolls sideways inside its own box. Then reset the preset to `desktop`.

- [ ] **Step 7: Commit**

```bash
git add -A apps/web
git commit -m "feat(web): /resellers with money cards, funnel, and the missing-commission strip

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Web — `/resellers/[id]` and the commission actions

**Files:**
- Create: `apps/web/components/features/resellers/commission-columns.tsx`
- Create: `apps/web/components/features/resellers/commission-dialogs.tsx`
- Create: `apps/web/components/features/resellers/reseller-detail-page.tsx`
- Create: `apps/web/app/(dashboard)/resellers/[id]/page.tsx`

**Interfaces:**
- Consumes: Task 13 hooks; `COMMISSION_STATE_TONE`, `StatCard`, `PeriodChips` (Task 14); `COMMISSION_STATE_LABEL` (Task 1)
- Produces: `ReasonDialog`, `EditCommissionDialog`, `RecordCommissionPaymentDialog`, `CloseRecoveryDialog`, `ResellerDetailPage`

- [ ] **Step 1: `commission-dialogs.tsx`**

Build all four on the same MUI dialog kit as `pay-vendor-dialog.tsx`: `MUIDialog`, `MUIDialogHeader`, `MUIDialogTitle`, `MUIDialogDescription`, `MUIDialogBody`, `MUIDialogFooter`, `MUIInput`, `MUISelect` from `@/components/ui`. Reuse `todayIst()` and `METHOD_OPTIONS` from that file. Export them from it if they are not exported yet. That is a two-line change, and it keeps one definition.

```tsx
'use client';

import { Button } from '@mui/material';
import { type JSX, useState } from 'react';

import { METHOD_OPTIONS, todayIst } from '@/components/features/ledger/pay-vendor-dialog';
import {
  MUIDialog, MUIDialogBody, MUIDialogDescription, MUIDialogFooter, MUIDialogHeader, MUIDialogTitle, MUIInput, MUISelect,
} from '@/components/ui';
import { useCommissionMutations, type CommissionRow } from '@/lib/hooks/resources/resellers';
import { formatPaise } from '@/lib/utils/paise';

export function ReasonDialog({ open, title, description, confirmLabel, onClose, onConfirm, busy }: {
  open: boolean; title: string; description: string; confirmLabel: string; busy?: boolean;
  onClose: () => void; onConfirm: (reason: string) => void;
}): JSX.Element {
  const [reason, setReason] = useState('');
  const ok = reason.trim().length >= 3;
  return (
    <MUIDialog open={open} onClose={onClose}>
      <MUIDialogHeader><MUIDialogTitle>{title}</MUIDialogTitle><MUIDialogDescription>{description}</MUIDialogDescription></MUIDialogHeader>
      <MUIDialogBody>
        <MUIInput fieldLabel="Reason" required value={reason} onChange={(e) => setReason(e.target.value)} inputProps={{ maxLength: 500 }} />
      </MUIDialogBody>
      <MUIDialogFooter>
        <Button onClick={onClose}>Back</Button>
        <Button variant="contained" disabled={!ok || busy} onClick={() => onConfirm(reason.trim())}>{confirmLabel}</Button>
      </MUIDialogFooter>
    </MUIDialog>
  );
}

export function EditCommissionDialog({ row, onClose }: { row: CommissionRow; onClose: () => void }): JSX.Element {
  const m = useCommissionMutations();
  const [base, setBase] = useState(String(row.basePaise / 100));
  const [rate, setRate] = useState(String(row.ratePercent));
  const [reason, setReason] = useState('');
  const baseN = Number(base);
  const rateN = Number(rate);
  const valid = Number.isFinite(baseN) && baseN >= 0 && Number.isFinite(rateN) && rateN >= 0 && rateN <= 100 && reason.trim().length >= 3;
  const previewPaise = Math.round((Math.round(baseN * 100) * Math.round(rateN * 100)) / 10_000);
  return (
    <MUIDialog open onClose={onClose}>
      <MUIDialogHeader>
        <MUIDialogTitle>Edit {row.quoteNumber}</MUIDialogTitle>
        <MUIDialogDescription>Saving sends it back to Pending. It needs approval again.</MUIDialogDescription>
      </MUIDialogHeader>
      <MUIDialogBody>
        <MUIInput fieldLabel="Base (₹, before GST, after discount)" value={base} onChange={(e) => setBase(e.target.value)} />
        <MUIInput fieldLabel="Rate (%)" value={rate} onChange={(e) => setRate(e.target.value)} />
        <div>Commission: <strong>{valid ? formatPaise(previewPaise) : '—'}</strong></div>
        <MUIInput fieldLabel="Why" required value={reason} onChange={(e) => setReason(e.target.value)} inputProps={{ maxLength: 500 }} />
      </MUIDialogBody>
      <MUIDialogFooter>
        <Button onClick={onClose}>Back</Button>
        <Button variant="contained" disabled={!valid || m.edit.isPending}
          onClick={() => m.edit.mutate(
            {
              id: row.id,
              baseAmount: baseN !== row.basePaise / 100 ? baseN : undefined,
              ratePercent: rateN !== row.ratePercent ? rateN : undefined,
              reason: reason.trim(),
            },
            { onSuccess: onClose },
          )}>Save</Button>
      </MUIDialogFooter>
    </MUIDialog>
  );
}

export function RecordCommissionPaymentDialog({ rows, onClose }: { rows: CommissionRow[]; onClose: () => void }): JSX.Element {
  const m = useCommissionMutations();
  const [valueDate, setValueDate] = useState(todayIst());
  const [method, setMethod] = useState<string>('bank_transfer');
  const [reference, setReference] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const total = rows.reduce((s, r) => s + r.amountPaise, 0);
  const valid = reference.trim().length >= 3 && Boolean(valueDate);
  return (
    <MUIDialog open onClose={onClose}>
      <MUIDialogHeader>
        <MUIDialogTitle>Record payment · {formatPaise(total)}</MUIDialogTitle>
        <MUIDialogDescription>
          {rows.length === 1 ? rows[0]?.quoteNumber : `${rows.length} deals, one transfer`}. It goes to Payment Approvals.
          The expense lands on each project when a second person approves it.
        </MUIDialogDescription>
      </MUIDialogHeader>
      <MUIDialogBody>
        <MUIInput fieldLabel="Paid on" type="date" value={valueDate} onChange={(e) => setValueDate(e.target.value)} inputProps={{ max: todayIst() }} />
        <MUISelect fieldLabel="Method" value={method} onChange={(e) => setMethod(String(e.target.value))} options={METHOD_OPTIONS} />
        <MUIInput fieldLabel="Reference (UTR / cheque no.)" required value={reference} onChange={(e) => setReference(e.target.value)} inputProps={{ maxLength: 100 }} />
        <MUIInput fieldLabel="Reseller's invoice no. (optional)" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} inputProps={{ maxLength: 50 }} />
      </MUIDialogBody>
      <MUIDialogFooter>
        <Button onClick={onClose}>Back</Button>
        <Button variant="contained" disabled={!valid || m.recordPayment.isPending}
          onClick={() => m.recordPayment.mutate(
            { commissionIds: rows.map((r) => r.id), valueDate, paymentMethod: method, reference: reference.trim(), invoiceNumber: invoiceNumber.trim() || undefined },
            { onSuccess: onClose },
          )}>Send for approval</Button>
      </MUIDialogFooter>
    </MUIDialog>
  );
}

export function CloseRecoveryDialog({ row, onClose }: { row: CommissionRow; onClose: () => void }): JSX.Element {
  const m = useCommissionMutations();
  const [amount, setAmount] = useState(String(row.amountPaise / 100));
  const [date, setDate] = useState(todayIst());
  const [note, setNote] = useState('');
  const n = Number(amount);
  const valid = Number.isFinite(n) && n >= 0 && Math.round(n * 100) <= row.amountPaise && note.trim().length >= 3;
  const writeOff = valid ? row.amountPaise - Math.round(n * 100) : 0;
  return (
    <MUIDialog open onClose={onClose}>
      <MUIDialogHeader>
        <MUIDialogTitle>Close recovery · {row.quoteNumber}</MUIDialogTitle>
        <MUIDialogDescription>We paid {formatPaise(row.amountPaise)} on a deal that died. How much came back?</MUIDialogDescription>
      </MUIDialogHeader>
      <MUIDialogBody>
        <MUIInput fieldLabel="Received back (₹)" value={amount} onChange={(e) => setAmount(e.target.value)} />
        {writeOff > 0 && <div>{formatPaise(writeOff)} will be written off.</div>}
        <MUIInput fieldLabel="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <MUIInput fieldLabel="Note" required value={note} onChange={(e) => setNote(e.target.value)} inputProps={{ maxLength: 500 }} />
      </MUIDialogBody>
      <MUIDialogFooter>
        <Button onClick={onClose}>Back</Button>
        <Button variant="contained" disabled={!valid || m.closeRecovery.isPending}
          onClick={() => m.closeRecovery.mutate({ id: row.id, amountReceived: n, date, note: note.trim() }, { onSuccess: onClose })}>Close</Button>
      </MUIDialogFooter>
    </MUIDialog>
  );
}
```

Check the prop names of `MUIInput`, `MUISelect` and `MUIDialog` against `pay-vendor-dialog.tsx` before using them (`fieldLabel`, `options`, `open`/`onClose`). Match them exactly.

- [ ] **Step 2: `commission-columns.tsx`**

```tsx
'use client';

import MoreVertIcon from '@mui/icons-material/MoreVert';
import { Box, IconButton, Menu } from '@mui/material';
import { COMMISSION_STATE_LABEL } from '@tejas96/shared/utils';
import { useRouter } from 'next/navigation';
import { type JSX, useState } from 'react';

import { COMMISSION_STATE_TONE } from './commission-state';

import { CrmStatusPill, type CrmColumn } from '@/components/shared/crm-table';
import { GatedMenuItem } from '@/components/shared/guards';
import { buildUrl, ROUTES } from '@/lib/config/routes';
import type { CommissionRow } from '@/lib/hooks/resources/resellers';
import { color, crm } from '@/lib/theme/tokens';
import { formatBusinessDate } from '@/lib/utils';
import { formatPaise } from '@/lib/utils/paise';

export type CommissionAction = 'approve' | 'edit' | 'cancel' | 'pay' | 'recover';

/** Spec §10.2: at most four items, by state. Always visible. */
function Actions({ row, onAction }: { row: CommissionRow; onAction: (a: CommissionAction, r: CommissionRow) => void }): JSX.Element | null {
  const router = useRouter();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const act = (a: CommissionAction) => () => { setAnchor(null); onAction(a, row); };
  const go = (href: string) => () => { setAnchor(null); router.push(href); };

  const items: JSX.Element[] = [];
  const g = (key: string, label: string, onClick: () => void): JSX.Element => (
    <GatedMenuItem key={key} permission="finance.payments.record" subject={label} onAction={onClick}>{label}</GatedMenuItem>
  );
  if (row.state === 'pending') items.push(g('a', 'Approve', act('approve')), g('e', 'Edit', act('edit')), g('c', 'Cancel', act('cancel')));
  if (row.state === 'needs_amount' || row.state === 'on_hold') items.push(g('e', 'Edit', act('edit')), g('c', 'Cancel', act('cancel')));
  if (row.state === 'waiting_for_project') items.push(g('e', 'Edit', act('edit')), g('c', 'Cancel', act('cancel')));
  if (row.state === 'approved') items.push(g('p', 'Record payment', act('pay')), g('e', 'Edit', act('edit')), g('c', 'Cancel', act('cancel')));
  if (row.state === 'payment_in_review') items.push(<GatedMenuItem key="q" permission="finance.approvals.view" subject="Payment Approvals" onAction={go(ROUTES.FINANCE.APPROVALS)}>Open in Payment Approvals</GatedMenuItem>);
  if (row.state === 'to_recover') items.push(g('r', 'Close recovery', act('recover')));
  if (row.projectId) items.push(<GatedMenuItem key="o" permission="projects.view" subject="Open project" onAction={go(buildUrl(ROUTES.PROJECTS.DETAIL, { id: row.projectId }))}>Open project</GatedMenuItem>);
  if (items.length === 0) return null;

  return (
    <>
      <IconButton size="small" aria-label={`Actions for ${row.quoteNumber}`} onClick={(e) => { e.stopPropagation(); setAnchor(e.currentTarget); }}>
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} onClick={(e) => e.stopPropagation()}
        disableEnforceFocus disableRestoreFocus anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        {items.slice(0, 4)}
      </Menu>
    </>
  );
}

export function buildCommissionColumns(onAction: (a: CommissionAction, r: CommissionRow) => void): CrmColumn<CommissionRow>[] {
  return [
    {
      field: 'deal', header: 'Deal', track: crm['col-customer'],
      renderCell: (r) => (
        <Box>
          <Box sx={{ fontWeight: 600 }}>{r.customerName}</Box>
          <Box sx={{ fontSize: crm['text-row-sm'], color: color['text-tertiary'] }}>
            {r.quoteNumber}{r.acceptedAt ? ` · won ${formatBusinessDate(r.acceptedAt)}` : ''}
          </Box>
        </Box>
      ),
    },
    {
      field: 'maths', header: 'Base × rate = amount', track: crm['col-portfolio'],
      renderCell: (r) => (
        <Box sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatPaise(r.basePaise)} × {r.ratePercent}% = <strong>{formatPaise(r.amountPaise)}</strong>
          {(r.baseSource === 'manual' || r.rateSource === 'manual') && <CrmStatusPill tone="neutral" label="edited" />}
          {(r.baseSource === 'missing' || r.rateSource === 'missing') && <CrmStatusPill tone="warning" label={r.baseSource === 'missing' ? 'base missing' : 'rate missing'} />}
        </Box>
      ),
    },
    {
      field: 'state', header: 'State', track: crm['col-status'],
      renderCell: (r) => (
        <Box>
          <CrmStatusPill tone={COMMISSION_STATE_TONE[r.state]} label={COMMISSION_STATE_LABEL[r.state]} />
          <Box sx={{ fontSize: crm['text-row-sm'], color: color['text-tertiary'] }}>
            {r.state === 'paid' && r.paidAt ? `${formatBusinessDate(r.paidAt)} · ${r.paymentReference ?? ''}` : null}
            {r.state === 'payment_in_review' ? r.payoutRequestNo : null}
            {r.state === 'cancelled' ? r.cancelReason : null}
            {r.state === 'recovered' ? r.recoveryNotes : null}
            {r.state === 'approved' && r.payoutRejectedReason ? `Payment rejected: ${r.payoutRejectedReason}` : null}
          </Box>
        </Box>
      ),
    },
    { field: 'actions', header: '', track: crm['col-actions'], align: 'right', stopPropagation: true, renderCell: (r) => <Actions row={r} onAction={onAction} /> },
  ];
}
```

Check `GatedMenuItem`'s props against `payables-columns.tsx` (`permission`, `subject`, `onAction`). They are used there exactly this way.

- [ ] **Step 3: `reseller-detail-page.tsx` and the route page**

```tsx
'use client';

import { Box } from '@mui/material';
import { type JSX, useMemo, useState } from 'react';

import { buildCommissionColumns, type CommissionAction } from './commission-columns';
import { CloseRecoveryDialog, EditCommissionDialog, ReasonDialog, RecordCommissionPaymentDialog } from './commission-dialogs';
import { PeriodChips, StatCard } from './stat-card';

import { CrmTable } from '@/components/shared/crm-table';
import { useCommissionMutations, useReseller, type CommissionRow, type ResellerPeriod } from '@/lib/hooks/resources/resellers';
import { color, crm } from '@/lib/theme/tokens';
import { formatPaise } from '@/lib/utils/paise';

type Open =
  | { kind: 'edit'; row: CommissionRow }
  | { kind: 'cancel'; row: CommissionRow }
  | { kind: 'pay'; rows: CommissionRow[] }
  | { kind: 'recover'; row: CommissionRow }
  | null;

export function ResellerDetailPage({ id }: { id: string }): JSX.Element {
  const [period, setPeriod] = useState<ResellerPeriod>('fy');
  const q = useReseller(id, period);
  const m = useCommissionMutations();
  const [open, setOpen] = useState<Open>(null);

  const onAction = (a: CommissionAction, row: CommissionRow): void => {
    if (a === 'approve') m.approve.mutate(row.id);
    if (a === 'edit') setOpen({ kind: 'edit', row });
    if (a === 'cancel') setOpen({ kind: 'cancel', row });
    if (a === 'pay') setOpen({ kind: 'pay', rows: [row] });
    if (a === 'recover') setOpen({ kind: 'recover', row });
  };
  const columns = useMemo(() => buildCommissionColumns(onAction), []); // eslint-disable-line react-hooks/exhaustive-deps

  const h = q.data?.reseller;
  const s = q.data?.summary;
  const rows = q.data?.commissions ?? [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: { xs: 2, lg: 3 } }}>
      <Box>
        <Box component="span" sx={{ fontSize: 'var(--text-overline-size)', fontWeight: 700, letterSpacing: 'var(--text-overline-track)', textTransform: 'uppercase', color: color['text-tertiary'] }}>Reseller</Box>
        <Box component="h1" sx={{ m: 0, mt: '5px', mb: '3px', fontSize: crm['text-page-title'], fontWeight: 700 }}>{h?.name ?? '…'}</Box>
        <Box component="p" sx={{ m: 0, fontSize: crm['text-row-title'], color: color['text-secondary'] }}>
          {[h?.code, h?.ratePercent === null ? 'rate not set' : h ? `${h.ratePercent}%` : null, h?.status,
            h?.accountLast4 ? `${h.bankName ?? 'Bank'} ••••${h.accountLast4}` : 'No bank details', h?.gstin ? `GSTIN ${h.gstin}` : null,
          ].filter(Boolean).join(' · ')}
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' } }}>
        <StatCard label="Leads" value={String(s?.leads ?? 0)} note="in this period" />
        <StatCard label="Won" value={`${s?.won ?? 0} of ${s?.quoted ?? 0}`} note={s?.winRate === null || !s ? 'win rate —' : `win rate ${s.winRate}%`} />
        <StatCard label="Revenue" value={formatPaise(s?.revenuePaise ?? 0)} note="before GST, after discount" />
        <StatCard label="Owed now" value={formatPaise(s?.owedPaise ?? 0)} note="approved, not paid" />
        <StatCard label="Paid" value={formatPaise(s?.paidPaise ?? 0)} note="all time" />
        <StatCard label="To recover" value={formatPaise(s?.toRecoverPaise ?? 0)} note="paid on dead deals" danger={(s?.toRecoverPaise ?? 0) > 0} />
      </Box>

      <PeriodChips value={period} onChange={setPeriod} />

      <CrmTable<CommissionRow>
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        loading={q.isLoading}
        refetching={q.isFetching && !q.isLoading}
        enableRowSelection
        bulkActions={[{
          label: 'Record payment',
          variant: 'primary',
          onClick: (sel) => {
            const ok = sel.filter((r) => r.state === 'approved');
            if (ok.length > 0) setOpen({ kind: 'pay', rows: ok });
          },
        }]}
        selectionLabel={(n) => `${n} selected — only Approved rows are paid`}
        itemLabel="commissions"
        emptyMessage="No commissions yet. One appears the moment a quote for this reseller's customer is accepted."
      />

      {open?.kind === 'edit' && <EditCommissionDialog row={open.row} onClose={() => setOpen(null)} />}
      {open?.kind === 'pay' && <RecordCommissionPaymentDialog rows={open.rows} onClose={() => setOpen(null)} />}
      {open?.kind === 'recover' && <CloseRecoveryDialog row={open.row} onClose={() => setOpen(null)} />}
      {open?.kind === 'cancel' && (
        <ReasonDialog open title={`Cancel ${open.row.quoteNumber}`} description="The reseller will see this as Cancelled."
          confirmLabel="Cancel commission" busy={m.cancel.isPending} onClose={() => setOpen(null)}
          onConfirm={(reason) => m.cancel.mutate({ id: open.row.id, reason }, { onSuccess: () => setOpen(null) })} />
      )}
    </Box>
  );
}
```

`app/(dashboard)/resellers/[id]/page.tsx`: copy how an existing `[id]` page reads its params (for example `app/(dashboard)/projects/[id]/page.tsx`: `use(params)` or `useParams`) and render `<ResellerDetailPage id={id} />`.

- [ ] **Step 4: Verify**

Run: `npm run typecheck:web && npx nx lint web`. Expected: pass.
In the browser, open the QA-0808 reseller from `/resellers`. Expected:
- The header shows "No bank details", or the last 4 digits if the profile has an account.
- The 6 tiles show, with Leads = 1.
- The table is empty and shows its empty message.
- Take a screenshot and check the console for errors.

The action paths are walked end to end in Task 17.

- [ ] **Step 5: Replace `window.prompt` in the strip with `ReasonDialog`**

In `missing-commissions-strip.tsx`, hold `const [dismissing, setDismissing] = useState<MissingRow | null>(null)` and render one `ReasonDialog` (title "Dismiss {quoteNumber}", confirm "Dismiss").

- [ ] **Step 6: Commit**

```bash
git add -A apps/web
git commit -m "feat(web): reseller detail with commission actions and batch payment

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Web — reseller picker on the lead form; reseller web block

**Files:**
- Modify: `apps/web/components/features/onboarding/components/onboarding-wizard/steps/step-1-customer-identity.tsx:195-240`
- Modify: the wizard form schema (find it with `grep -rn "leadSourceOther" apps/web/components/features/onboarding --include="*.ts"`)
- Modify: `apps/web/components/features/onboarding/components/onboarding-wizard/index.tsx:120-130, 370-390`
- Modify: `apps/web/app/(dashboard)/layout.tsx` (`RouteGate`)

**Interfaces:**
- Consumes: `useEmployees({ profileKind: EmployeeProfileKind.RESELLER, status: UserStatus.ACTIVE })` (`components/features/employees/hooks/use-employees.ts:46-70`)

- [ ] **Step 1: The picker**

In `step-1-customer-identity.tsx`, directly under the Lead Source `Controller` (inside the same `space-y-3` div):

```tsx
          {leadSource === LeadSource.RESELLER && (
            <Controller
              name="customer.resellerId"
              control={control}
              render={({ field }) => (
                <MUISelect
                  fieldLabel="Which reseller?"
                  required
                  placeholder="Choose the reseller who sent this customer"
                  value={field.value ?? ''}
                  disabled={isLocked}
                  onChange={(e) => field.onChange(e.target.value || null)}
                  error={customerErrors.resellerId?.message}
                  options={resellerOptions}
                />
              )}
            />
          )}
```

with, near the other hooks:

```tsx
  const { data: resellerPage } = useEmployees({ profileKind: EmployeeProfileKind.RESELLER, status: UserStatus.ACTIVE });
  const resellerOptions = React.useMemo(
    () => (resellerPage?.items ?? []).map((r) => ({
      value: r.id,
      label: r.companyName || `${r.user?.firstName ?? ''} ${r.user?.lastName ?? ''}`.trim() || r.id,
    })),
    [resellerPage],
  );
```

Check the real return shape of `useEmployees` (`items`? `data`?) and the field names on a row (`companyName`, `user.firstName`) in `use-employees.ts`. Match them exactly. The value is the employee **profile** id, which is what `customer_profiles.reseller_id` stores.

In the Lead Source `onChange`, also clear the reseller when leaving Reseller:

```tsx
                  if (e.target.value !== LeadSource.RESELLER) {
                    setValue('customer.resellerId', null, { shouldDirty: true });
                  }
```

- [ ] **Step 2: Schema and submit**

In the wizard's zod schema, on the customer object: add `resellerId: z.string().uuid().nullable().optional()`, `resellerChangeReason: z.string().max(500).optional()`, and a refine:

```ts
  .superRefine((c, ctx) => {
    if (c.leadSource === 'reseller' && !c.resellerId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['resellerId'], message: 'Choose which reseller sent this customer' });
    }
  })
```

In `index.tsx`, seed from the loaded customer: `resellerId: customer.resellerId ?? null`. Add `resellerId?: string | null` to the web `Customer` type, if it is not already there: `grep -rn "leadSource" apps/web/components/features/customers/types*`. The backend `CustomerResponseDto` must expose `resellerId`. Add `@Expose() resellerId?: string | null` there in this task if Task 10 did not.

On submit (~375), include `resellerId: data.leadSource === 'reseller' ? data.resellerId : null`. **Send `null`, not `undefined`** (PATCH cannot clear with undefined).

**Editing an existing customer whose reseller changes:** compare the loaded `customer.resellerId` with the submitted value. If it differs and the customer already exists, open the `ReasonDialog` from Task 15 before saving: "Why is the reseller changing?". Put the answer in `resellerChangeReason`. If the user lacks `customers.assign`, the server returns 403 with a clear message, and the existing error toast shows it. No client-side gate is needed.

- [ ] **Step 3: The reseller web block (X1)**

In `app/(dashboard)/layout.tsx` `RouteGate`, before the gate check:

```tsx
  const { user } = useAuth();
  const isResellerOnly =
    Boolean(user?.profiles?.length) && user!.profiles.every((p) => p.type === 'reseller');
  if (isResellerOnly) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="mx-auto max-w-md text-center">
          <h2 className="mb-1 text-xl font-semibold text-foreground">Use the OneOhm EPC app</h2>
          <p className="text-sm text-foreground-secondary">
            Your leads, quotes and earnings are in the mobile app. The web portal is for the office team.
          </p>
        </div>
      </div>
    );
  }
```

(Import `useAuth` from `@/providers/auth-provider`, as `customer-detail-page.tsx:127` does.)

- [ ] **Step 4: Verify**

Run: `npm run typecheck:web && npm run typecheck:backend && npx nx lint web`. Expected: pass.

In the browser as admin, open `/customers`, then QA-0808 → edit. Expected: Lead Source shows **Reseller**, and "Which reseller?" shows the tagged reseller.

Then change the reseller to another one and save. Expected: the reason dialog appears. Save with a reason. The toast shows success. `audit_logs` has a row.

Change it back the same way.

Switch Lead Source to Referral. Expected: the picker disappears. Save, and read the row with SQL: `reseller_id` is null. Put it back to the test reseller afterwards.

Start a new lead, choose Lead Source = Reseller, pick nobody and continue. Expected: the inline error "Choose which reseller sent this customer". Do not finish creating it. Cancel the wizard.

Ask the owner to log in once as a reseller user on `127.0.0.1:3001` (the second-tab trick from local-verification). Expected: the "Use the OneOhm EPC app" screen on every page.

- [ ] **Step 5: Commit**

```bash
git add -A apps/web apps/backend
git commit -m "feat(web): reseller picker driven by lead source; reseller web block

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: Verification — money cross-foot, wall probes, full UI walk

**Files:** none. This task only checks. Findings go to the owner as one line per problem → fix, and **wait for approval** before touching code (owner rule).

- [ ] **Step 1: Build, lint and the existing suites for everything touched**

Run: `cd /Volumes/works-space/oneohm/oneohm && npm run typecheck && npx nx lint backend && npx nx lint web && npx nx test backend && npx nx test web`
Expected: pass. If a suite failed before this branch, show that with `git stash`-free evidence: `git log -1 --format=%H origin/main`, then run that one suite on a `git show origin/main:<path>` copy if needed. Report it as pre-existing. Do not fix it here.

- [ ] **Step 2: Validate the NOT VALID checks locally**

```bash
docker exec oneohm-postgres psql -U root -d oneohm_epc -c "alter table employee_commissions validate constraint chk_ec_status; alter table employee_commissions validate constraint chk_ec_rate; alter table employee_commissions validate constraint chk_ec_base; alter table employee_commissions validate constraint chk_ec_amount; alter table employee_commissions validate constraint chk_ec_base_source; alter table employee_commissions validate constraint chk_ec_rate_source; alter table employee_commissions validate constraint chk_ec_paid_has_expense; alter table employee_commissions validate constraint chk_ec_recovery;"
```

Expected: all succeed locally. Validation is a harmless catalog flag and changes no data. For production, run the same statements after deploy **only** if the owner agrees. Report what they would check.

- [ ] **Step 3: The full UI walk (owner present, real logins, no API calls, no SQL)**

Use QA-0808 (tagged to reseller R in Task 10) and a roof on it with **no** live accepted quote. Ask the owner which roof.
1. As staff: build a quote on that roof → **Mark as sent** (never WhatsApp) → accept it with a signature.
2. Open `/resellers`. Expected: R's row shows won 1 and Pending = base × rate. Open R. Expected: the row shows `₹base × rate% = ₹amount`, and the base equals the quote's pre-GST, post-discount price on the quote screen.
3. Approve. Expected: the state is **Waiting for project**, and Record payment is not offered.
4. Convert the quote to a project. Reload R. Expected: **Approved** and Record payment offered.
5. Record payment (method bank transfer, reference `TEST-UTR-1`). Expected: **Payment in review** with a request number.
6. As a **different** user with `finance.approvals.process`, open Payment Approvals. Expected: the row says "Commission · R". Reject it with a reason. Back on R: **Approved** with "Payment rejected: …".
7. Record payment again, then approve it as the second user. Expected: **Paid · date · TEST-UTR-1**.
8. Open the project → Money tab. Expected: an expense "Commission" for exactly the amount. The project's spent figure rose by exactly that.
9. Double-click protection: select the (now paid) row and try Record payment. Expected: nothing is offered for a paid row.
10. **Only if the owner agrees**, cancel that test project. Expected: R's row shows **To recover**. Close recovery with a partial amount. Expected: **Recovered**, and the note says what was written off.

Take a screenshot after steps 2, 5, 7, 8 and 10. Send them to the owner.

- [ ] **Step 4: The money cross-foot (read-only SQL, spec §15)**

```bash
docker exec oneohm-postgres psql -U root -d oneohm_epc -c "
select 'rate maths mismatches' as check, count(*) from employee_commissions
 where commission_amount <> round(base_amount * commission_percentage / 100, 2)
union all
select 'accepted reseller quotes without a row', count(*) from quotes q left join employee_commissions c on c.quote_id=q.id
 where q.status='accepted' and q.voided_at is null and q.deleted_at is null and q.reseller_id is not null and c.id is null
union all
select 'paid rows without an existing expense', count(*) from employee_commissions c left join ledger_entries le on le.id=c.expense_entry_id
 where c.status='paid' and le.id is null
union all
select 'paid sum minus commission expense sum (paise)',
 (select coalesce(sum(round(commission_amount*100)),0) from employee_commissions where status='paid')
 - (select coalesce(sum(-amount_paise),0) from ledger_entries where category='commission' and entry_type='expense' and reverses_id is null)
union all
select 'approved/paid rows with a missing source', count(*) from employee_commissions
 where status in ('approved','paid') and (base_source='missing' or rate_source='missing');"
```

Expected: every count is **0**. The rate-maths check uses SQL `round`, which rounds half away from zero, the same as the shared function for positive amounts.

- [ ] **Step 5: Wall probes (minted tokens; API-level checks are allowed)**

With a reseller token, loop over one route from every closed group in the Task 10–12 tables (for example `/inventory`, `/payment-approvals`, `/ledger/entries/x/reverse`, `/workflow-steps`, `/installation-pricing`, `/quote-configurations/active`, `/products/<id>/prices`, `/storage/download-url/x`, `/service-tickets/stats`, `/customers/statistics/overview`). Expected: **403** each.

Loop over the open ones with **another reseller's** ids. Expected: **404** each.

Then check the redaction:

```bash
curl -s "localhost:8085/api/v1/quotes/<QA quote id>" -H "Authorization: Bearer $R" | grep -c -E "profitability|marginPercent|actualCost"
```

Expected: `0`.

- [ ] **Step 6: Report and hand-off**

Tell the owner, in short lines:
- what was checked and the results;
- which test data now exists (the QA-0808 reseller tag, the test quote, project and payment), and ask whether to keep or remove it;
- that `COMMISSIONS_LIVE_FROM` must be set on Fly (`oneohm-epc-backend`) **before** the deploy goes live;
- that the shared package does **not** need publishing for this step (backend and web read `libs/shared` in the monorepo). It must be published **before Step 2 (mobile)**, `oneohm` first.

Then use superpowers:finishing-a-development-branch.
