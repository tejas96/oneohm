# Deal Loss and Project Cancellation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a dead deal closeable and a cancelled project self-cleaning, so a lost roof can be re-sold and a cancelled project stops asking for money it is not owed.

**Architecture:** One property table keeps carrying both the roof and the deal; the roof becomes recoverable instead of frozen. Quote locks are released by a new `quotes.voided_at` column rather than by deriving state through projects. Cancellation runs one transaction that reverses everything reversible, and anything physically out of the warehouse becomes a `return_requests` row; the remaining loose ends are read back as a derived checklist that is never stored.

**Tech Stack:** NestJS 11 + TypeORM (Nx monorepo, `apps/backend`), PostgreSQL 16 in Docker (`oneohm-postgres`), Next.js + MUI (`apps/web`), shared enums in `libs/shared`.

**Spec:** `docs/superpowers/specs/2026-09-09-deal-loss-and-project-cancellation-design.md`

## Global Constraints

- Branch: `feat/deal-loss-and-project-cancellation`. Already created.
- **Do not add new unit test files.** This project verifies by running the screens. The only test files touched are two existing pinned specs the spec names: `apps/backend/src/modules/ledger/domain/derived-status.spec.ts` and `apps/backend/src/modules/consumer/dto/consumer-contract.spec.ts`.
- Migrations only; `synchronize` is `false` everywhere. Run with `cd apps/backend && npm run migration:run`.
- Every migration in this repo opens with a top-of-file JSDoc saying why it exists. The snippets below omit it to stay readable — add one, matching the neighbouring migrations.
- Migration timestamps continue the existing sequence. The highest today is `1856900000000`. Use `1857000000000`, `1857010000000`, `1857020000000` in that order.
- Money out is stored as a **negative** `amount_paise`. `LedgerWriteService.recordExpense` negates the input; a refund must do the same.
- `ledger_entries` has an append-only trigger. Rows are inserted, never updated.
- Local verification: API on **8085**, web on **3001**, database `oneohm_epc` on port 5432 as user `root`.
- Any PATCH that clears an optional field must send `null`. `undefined` is dropped before the update and the old value survives.
- `LossReason` values, exact strings: `lost_on_price`, `lost_to_competitor`, `customer_dropped`, `not_reachable`, `site_not_feasible`, `subsidy_issue`, `financing_rejected`, `customer_defaulted`, `delay_by_us`, `other`.

## File Structure

**Created**

| File | Responsibility |
|---|---|
| `apps/backend/src/database/migrations/1857000000000-DealLossAndCancellationColumns.ts` | All new columns, one migration |
| `apps/backend/src/database/migrations/1857010000000-MilestoneCancelledStatus.ts` | Rebuild `v_milestone_balance` for the new row status |
| `apps/backend/src/database/migrations/1857020000000-BackfillCancelledProjects.ts` | Clean the three cancelled projects already in the data |
| `apps/backend/src/modules/projects/services/project-cancellation.service.ts` | The cancellation transaction and the derived cleanup checklist |
| `apps/backend/src/modules/projects/dto/projects/cancel-project.dto.ts` | Cancellation request shape |
| `apps/backend/src/modules/projects/dto/projects/cancellation-cleanup.dto.ts` | Cleanup checklist response shape |
| `apps/web/components/features/projects/components/project-detail/cancel-project-dialog.tsx` | Reason, roof outcome, settlement, in one dialog |
| `apps/web/components/features/projects/components/project-detail/cancellation-cleanup-card.tsx` | The open-jobs list on a cancelled project |
| `apps/web/components/features/properties/property-detail/reopen-property-dialog.tsx` | Reopen a lost roof |

**Modified — the ones that carry real risk**

| File | Change |
|---|---|
| `libs/shared/src/types/enums/customer.enum.ts` | `LossReason` enum |
| `libs/shared/src/types/enums/finance.enum.ts` | `FinanceSequenceScope.REFUND` |
| `apps/backend/src/modules/ledger/domain/derived-status.ts` | Third row status |
| `apps/backend/src/database/migrations/sql/ledger/06-views.sql.ts` | Same view change, so fresh installs match |
| `apps/backend/src/modules/quotes/services/quote.service.ts` | Voided quotes ignored by three locks; rejection outcome |
| `apps/backend/src/modules/projects/services/project.service.ts` | Live-project lookup; cancellation is terminal |
| `apps/backend/src/modules/customers/services/lead-closure.service.ts` | Loss reason plus reopen |

---

### Task 1: Loss reason enum and every new column

**Files:**
- Modify: `libs/shared/src/types/enums/customer.enum.ts`
- Create: `apps/backend/src/database/migrations/1857000000000-DealLossAndCancellationColumns.ts`
- Modify: `apps/backend/src/modules/customers/entities/customer-property.entity.ts`
- Modify: `apps/backend/src/modules/customers/entities/customer-profile.entity.ts`
- Modify: `apps/backend/src/modules/quotes/entities/quote.entity.ts`
- Modify: `apps/backend/src/modules/projects/entities/project.entity.ts`
- Modify: `apps/backend/src/modules/employees/commissions/entities/employee-commission.entity.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `LossReason` enum; entity properties `lossReason` (on property, profile, project), `voidedAt` / `voidReason` (quote), `cancelReason` / `cancelledAt` / `settledAt` / `settledBy` (project), `recoveredAt` / `recoveryNotes` (commission).

- [ ] **Step 1: Add the enum**

In `libs/shared/src/types/enums/customer.enum.ts`, directly below `FollowupOutcome`:

```ts
/**
 * Why a deal died. Covers both a lead that never became a project and a
 * project that was cancelled — one enum, because two would drift apart.
 *
 * Same discipline as FollowupOutcome: if OTHER exceeds ~10% of rows, read the
 * notes and promote a real value here.
 */
export enum LossReason {
  LOST_ON_PRICE = 'lost_on_price',
  LOST_TO_COMPETITOR = 'lost_to_competitor',
  CUSTOMER_DROPPED = 'customer_dropped',
  NOT_REACHABLE = 'not_reachable',
  SITE_NOT_FEASIBLE = 'site_not_feasible',
  SUBSIDY_ISSUE = 'subsidy_issue',
  FINANCING_REJECTED = 'financing_rejected',
  CUSTOMER_DEFAULTED = 'customer_defaulted',
  DELAY_BY_US = 'delay_by_us',
  OTHER = 'other',
}
```

- [ ] **Step 2: Write the migration**

Create `apps/backend/src/database/migrations/1857000000000-DealLossAndCancellationColumns.ts`:

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class DealLossAndCancellationColumns1857000000000 implements MigrationInterface {
  name = 'DealLossAndCancellationColumns1857000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customer_properties ADD COLUMN IF NOT EXISTS loss_reason varchar(40);
      ALTER TABLE customer_profiles   ADD COLUMN IF NOT EXISTS loss_reason varchar(40);

      ALTER TABLE quotes ADD COLUMN IF NOT EXISTS voided_at  timestamptz;
      ALTER TABLE quotes ADD COLUMN IF NOT EXISTS void_reason varchar(500);

      ALTER TABLE projects ADD COLUMN IF NOT EXISTS cancel_reason text;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS loss_reason   varchar(40);
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS cancelled_at  timestamptz;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS settled_at    timestamptz;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS settled_by    uuid;

      ALTER TABLE employee_commissions ADD COLUMN IF NOT EXISTS recovered_at   timestamptz;
      ALTER TABLE employee_commissions ADD COLUMN IF NOT EXISTS recovery_notes text;
    `);

    // The accepted-quote lock reads this on every quote create and status
    // change. Partial index: the vast majority of quotes are never voided.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_quotes_property_live
        ON quotes (property_id) WHERE voided_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_quotes_property_live;

      ALTER TABLE employee_commissions DROP COLUMN IF EXISTS recovery_notes;
      ALTER TABLE employee_commissions DROP COLUMN IF EXISTS recovered_at;

      ALTER TABLE projects DROP COLUMN IF EXISTS settled_by;
      ALTER TABLE projects DROP COLUMN IF EXISTS settled_at;
      ALTER TABLE projects DROP COLUMN IF EXISTS cancelled_at;
      ALTER TABLE projects DROP COLUMN IF EXISTS loss_reason;
      ALTER TABLE projects DROP COLUMN IF EXISTS cancel_reason;

      ALTER TABLE quotes DROP COLUMN IF EXISTS void_reason;
      ALTER TABLE quotes DROP COLUMN IF EXISTS voided_at;

      ALTER TABLE customer_profiles   DROP COLUMN IF EXISTS loss_reason;
      ALTER TABLE customer_properties DROP COLUMN IF EXISTS loss_reason;
    `);
  }
}
```

- [ ] **Step 3: Add the entity columns**

`customer-property.entity.ts`, beside the existing `lostReason` at line 173:

```ts
  @Column({ name: 'loss_reason', type: 'varchar', length: 40, nullable: true })
  lossReason?: LossReason;
```

`customer-profile.entity.ts`: the same block beside its `lostReason`.

`quote.entity.ts`, beside `rejectionReason` at line 76:

```ts
  @Column({ type: 'timestamptz', name: 'voided_at', nullable: true })
  voidedAt?: Date;

  @Column({ type: 'varchar', name: 'void_reason', length: 500, nullable: true })
  voidReason?: string;
```

`project.entity.ts`:

```ts
  @Column({ name: 'cancel_reason', type: 'text', nullable: true })
  cancelReason?: string;

  @Column({ name: 'loss_reason', type: 'varchar', length: 40, nullable: true })
  lossReason?: LossReason;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt?: Date;

  @Column({ name: 'settled_at', type: 'timestamptz', nullable: true })
  settledAt?: Date;

  @Column({ name: 'settled_by', type: 'uuid', nullable: true })
  settledBy?: string;
```

`employee-commission.entity.ts`:

```ts
  @Column({ name: 'recovered_at', type: 'timestamptz', nullable: true })
  recoveredAt?: Date;

  @Column({ name: 'recovery_notes', type: 'text', nullable: true })
  recoveryNotes?: string;
```

- [ ] **Step 4: Run the migration**

```bash
cd apps/backend && npm run migration:run
```

Expected: `DealLossAndCancellationColumns1857000000000 has been executed successfully.`

- [ ] **Step 5: Confirm the columns landed**

```bash
docker exec oneohm-postgres psql -U root -d oneohm_epc -c "select table_name, column_name from information_schema.columns where (table_name,column_name) in (('quotes','voided_at'),('projects','settled_at'),('projects','loss_reason'),('customer_properties','loss_reason'),('employee_commissions','recovered_at')) order by 1,2;"
```

Expected: 5 rows.

- [ ] **Step 6: Build to prove the entities compile**

```bash
npx nx build backend
```

Expected: success.

- [ ] **Step 7: Commit**

```bash
git add libs/shared apps/backend/src/database/migrations apps/backend/src/modules
git commit -m "feat: loss reason enum and deal-loss columns"
```

---

### Task 2: Milestone `cancelled` status

**Files:**
- Modify: `apps/backend/src/modules/ledger/domain/derived-status.ts`
- Modify: `apps/backend/src/modules/ledger/domain/derived-status.spec.ts`
- Modify: `apps/backend/src/modules/consumer/dto/consumer-contract.spec.ts:66-70` (stale comment only)
- Modify: `apps/backend/src/database/migrations/sql/org-cleanup/04-views.sql.ts` — **the live definitions**
- Modify: `apps/backend/src/database/migrations/sql/ledger/06-views.sql.ts:40-53` — superseded on a fresh install, changed only to keep the two consistent
- Create: `apps/backend/src/database/migrations/1857010000000-MilestoneCancelledStatus.ts`

**Correction, found during implementation.** `06-views.sql.ts` is stale: it still selects `m.organization_id`, which `RemoveOrganizations1852000000000` dropped when it moved the live view definitions to `sql/org-cleanup/04-views.sql.ts`. Migration `1851000000002` creates the views from `06`, then `1852000000000` replaces them from `org-cleanup/04`, so `org-cleanup/04` is what actually runs. Build the migration against `ORG_CLEANUP_CREATE_VIEWS` / `ORG_CLEANUP_DROP_VIEWS`. Rebuilding from `06` fails with `column m.organization_id does not exist`.

**Also required: widen the CHECK constraint.** `chk_payment_milestones_status` currently allows only `active` and `waived`, so the database rejects the very status this task introduces. The migration must drop and recreate it to include `cancelled`:

```sql
ALTER TABLE payment_milestones DROP CONSTRAINT chk_payment_milestones_status;
ALTER TABLE payment_milestones ADD CONSTRAINT chk_payment_milestones_status
  CHECK (status IN ('active', 'waived', 'cancelled'));
```

`down()` restores the two-value version. Leave `chk_payment_milestones_waive_fields` alone — it reads `(status = 'waived') = (waived_at IS NOT NULL)`, which a cancelled row satisfies as long as it was `active` beforehand, and Task 7 and Task 12 both only cancel `active` rows.

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `MilestoneRowStatus` widened to `'active' | 'waived' | 'cancelled'`; `DerivedMilestoneStatus` widened with `'cancelled'`; `v_milestone_balance` returning `balance_paise = 0` and `derived_status = 'cancelled'` for cancelled rows.

This is the one task with a real red-green cycle, because `derived-status.spec.ts` is an existing pinned table.

- [ ] **Step 1: Extend the pinned table first (this must fail)**

In `derived-status.spec.ts`, add to the `it.each` table at line 16 and widen the loop at line 37:

```ts
      [100000, 0,      'cancelled', 'cancelled'],
      [100000, 40000,  'cancelled', 'cancelled'],
      [100000, 100000, 'cancelled', 'cancelled'],
```

```ts
        for (const row of ['active', 'waived', 'cancelled'] as MilestoneRowStatus[]) {
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npx nx test backend --testPathPattern=derived-status
```

Expected: FAIL. TypeScript rejects `'cancelled'` as a `MilestoneRowStatus`.

- [ ] **Step 3: Widen the types and the function**

In `derived-status.ts`:

```ts
export type MilestoneRowStatus = 'active' | 'waived' | 'cancelled';

export type DerivedMilestoneStatus = 'pending' | 'partial' | 'paid' | 'waived' | 'cancelled';
```

and inside `derivedMilestoneStatus`, before the allocation branches:

```ts
  if (rowStatus === 'cancelled') {
    return 'cancelled';
  }
```

Also correct the block comment above the function: the ledger now emits all five of the values the consumer app recognises.

- [ ] **Step 4: Run it and watch it pass**

```bash
npx nx test backend --testPathPattern=derived-status
```

Expected: PASS.

- [ ] **Step 5: Fix the stale consumer comment**

`consumer-contract.spec.ts:66-70` says `cancelled` no longer exists in the ledger model. The assertion at line 219 already lists all five and needs no change. Replace the comment body with: the ledger emits all five, and emitting anything outside this set is what triggers the silent `LOCKED` render.

```bash
npx nx test backend --testPathPattern=consumer-contract
```

Expected: PASS.

- [ ] **Step 6: Change the view source of truth**

In `sql/org-cleanup/04-views.sql.ts`, inside `CREATE_V_MILESTONE_BALANCE_V2`, replace the `balance_paise` line and the `derived_status` CASE. Make the character-identical change in `sql/ledger/06-views.sql.ts` too, so the superseded copy does not silently drift:

```sql
    CASE WHEN m.status = 'cancelled' THEN 0
         ELSE GREATEST(m.amount_paise - COALESCE(a.allocated_paise, 0), 0)
    END::BIGINT                                       AS balance_paise,
```

```sql
    CASE
      WHEN m.status = 'cancelled'                             THEN 'cancelled'
      WHEN m.status = 'waived'                                THEN 'waived'
      WHEN COALESCE(a.allocated_paise, 0) <= 0                THEN 'pending'
      WHEN COALESCE(a.allocated_paise, 0) >= m.amount_paise   THEN 'paid'
      ELSE 'partial'
    END                                               AS derived_status,
```

`expected_paise` stays the contracted figure. `days_overdue` already returns 0 for anything that is not `active`, so it needs no change.

- [ ] **Step 7: Write the migration that applies it to this database**

Create `1857010000000-MilestoneCancelledStatus.ts`. It drops both views and recreates them from the constants, because `v_project_balance` depends on `v_milestone_balance` and `CREATE OR REPLACE` cannot change a column expression a dependent view reads:

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

import { ORG_CLEANUP_CREATE_VIEWS, ORG_CLEANUP_DROP_VIEWS } from './sql/org-cleanup/04-views.sql';

export class MilestoneCancelledStatus1857010000000 implements MigrationInterface {
  name = 'MilestoneCancelledStatus1857010000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Constraint first: if it fails, no view has been touched.
    await queryRunner.query(`ALTER TABLE payment_milestones DROP CONSTRAINT chk_payment_milestones_status`);
    await queryRunner.query(`ALTER TABLE payment_milestones ADD CONSTRAINT chk_payment_milestones_status
      CHECK (status IN ('active', 'waived', 'cancelled'))`);

    for (const sql of ORG_CLEANUP_DROP_VIEWS) {
      await queryRunner.query(sql);
    }
    for (const sql of ORG_CLEANUP_CREATE_VIEWS) {
      await queryRunner.query(sql);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PRECONDITION: no milestone may carry status 'cancelled'. The two-value
    // CHECK is validated against existing rows, so once a project has been
    // cancelled this revert fails at its first statement — by design. Decide
    // what those milestones become before reverting.
    await queryRunner.query(`ALTER TABLE payment_milestones DROP CONSTRAINT chk_payment_milestones_status`);
    await queryRunner.query(`ALTER TABLE payment_milestones ADD CONSTRAINT chk_payment_milestones_status
      CHECK (status IN ('active', 'waived'))`);

    for (const sql of ORG_CLEANUP_DROP_VIEWS) {
      await queryRunner.query(sql);
    }
    for (const sql of ORG_CLEANUP_CREATE_VIEWS) {
      await queryRunner.query(sql);
    }
  }
}
```

**Keep the two domain helpers in lockstep.** `derived-status.ts` exports `milestoneBalancePaise` alongside `derivedMilestoneStatus`, and it mirrors the same `balance_paise` expression. It must gain a `rowStatus` parameter and return `0` for a cancelled row, or the module whose whole purpose is preventing drift will itself have drifted. Extend its pinned table in the spec to match.

**Add the missing bucket to `v_project_balance`.** `contract_paise` sums every milestone while `expected_paise` and `waived_paise` sum by status, so `contract = expected + waived` silently stops holding the moment a milestone is cancelled. Add `cancelled_paise` beside `waived_paise`, exactly as that filter is written, so the buckets reconcile again. View only — do not wire it into a DTO until something needs it.

- [ ] **Step 8: Run it and prove the view behaves**

```bash
cd apps/backend && npm run migration:run
```

```bash
docker exec oneohm-postgres psql -U root -d oneohm_epc -c "begin; update payment_milestones set status='cancelled' where id = (select id from payment_milestones where status='active' limit 1); select status, derived_status, expected_paise, balance_paise from v_milestone_balance where status='cancelled'; rollback;"
```

Expected: one row, `derived_status = cancelled`, `balance_paise = 0`, `expected_paise` unchanged. The rollback leaves the data untouched.

- [ ] **Step 9: Commit**

```bash
git add apps/backend/src/modules/ledger apps/backend/src/modules/consumer apps/backend/src/database
git commit -m "feat: cancelled milestone status through the ledger view"
```

---

### Task 3: Voided quotes release the roof

**Files:**
- Modify: `apps/backend/src/modules/quotes/repositories/quote.repository.ts` (`findAcceptedByPropertyId`)
- Modify: `apps/backend/src/modules/quotes/services/quote.service.ts:91`, `:242`, `:597`

**Interfaces:**
- Consumes: `quotes.voided_at` from Task 1.
- Produces: `QuoteRepository.findAcceptedByPropertyId(propertyId, excludeQuoteId?)` ignoring voided rows; `QuoteRepository.voidAllOpenForProperty(propertyId, reason, userId, manager?): Promise<number>`.

- [ ] **Step 1: Make the lock ignore voided quotes**

In `findAcceptedByPropertyId`, add `voidedAt: IsNull()` to the `where` clause alongside the existing accepted-status and property filters. Import `IsNull` from `typeorm` if it is not already imported.

- [ ] **Step 2: Add the two voiding helpers**

In `quote.repository.ts`:

```ts
  /**
   * Kill every quote on a roof that a rep could still act on. Without this a
   * `sent` quote survives the site being closed and gets chased.
   */
  async voidAllOpenForProperty(
    propertyId: string,
    reason: string,
    userId: string,
    manager?: EntityManager,
    excludeQuoteId?: string,
  ): Promise<number> {
    const repo = manager ? manager.getRepository(QuoteEntity) : this.repository;
    const qb = repo
      .createQueryBuilder()
      .update(QuoteEntity)
      .set({ voidedAt: new Date(), voidReason: reason, updatedBy: userId })
      .where('property_id = :propertyId', { propertyId })
      .andWhere('voided_at IS NULL')
      .andWhere('deleted_at IS NULL');

    // The quote that carries the customer's own decision must keep only that
    // decision. `voided_at` marks a quote swept aside administratively, and
    // anything reading it as "not a genuine outcome" would misfile a real
    // rejection stamped with both.
    if (excludeQuoteId) {
      qb.andWhere('id != :excludeQuoteId', { excludeQuoteId });
    }

    const result = await qb.execute();
    return result.affected ?? 0;
  }
```

`excludeQuoteId` is passed only by the quote-rejection path. Project cancellation deliberately omits it: there, voiding the accepted quote is the point.

Add only this one method. A single-quote `voidById` has no caller in this plan; add it when something needs it.

- [ ] **Step 3: Sharpen the three lock messages**

There are **four** call sites, not three: `quote.service.ts:91`, `:242`, `:597`, and `quote-calculator.controller.ts:240`. None needs a logic change — the repository now hides voided rows, so all four inherit the fix. Update the message text at `quote.service.ts:94` **and** the identical string at `quote-calculator.controller.ts:242`, so the same condition does not get described two different ways:

```ts
          `Property already has a live accepted quote (${accepted.quoteNumber}). No new quotes can be created.`,
```

- [ ] **Step 4: Prove the unlock by hand**

Start the API, pick a property that has an accepted quote, and confirm the lock endpoint flips once the quote is voided:

```bash
docker exec oneohm-postgres psql -U root -d oneohm_epc -c "begin; create temp table t as select property_id as pid from quotes where status='accepted' order by property_id limit 1; update quotes set voided_at = now() where status='accepted' and property_id = (select pid from t); select count(*) as still_locking from quotes where status='accepted' and voided_at is null and property_id = (select pid from t); rollback;"
```

Expected: `still_locking = 0`.

The property is pinned in a temp table on purpose. Two separate `LIMIT 1` subqueries with no `ORDER BY` can select different rows, which makes the check report a failure that is not there.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/quotes
git commit -m "feat: voided quotes stop locking the property"
```

---

### Task 4: One *live* project per roof

**Files:**
- Modify: `apps/backend/src/modules/projects/repositories/project.repository.ts:655`
- Modify: `apps/backend/src/modules/projects/services/project.service.ts:440`
- Modify: `apps/backend/src/modules/consumer/controllers/consumer-project.controller.ts:56`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `ProjectRepository.findLiveByPropertyId(propertyId: string): Promise<ProjectEntity | null>` — newest non-cancelled, non-deleted project for a roof.

This is the guard that would otherwise block re-selling a roof: today *any* project blocks conversion, cancelled ones included.

- [ ] **Step 1: Replace the lookup**

In `project.repository.ts`, replace `findOneByPropertyId` with:

```ts
  /**
   * The project that currently owns this roof.
   *
   * A cancelled project does not own anything — its stock is released, its
   * milestones are dead and its roof has been handed back. Counting it would
   * make a re-sold site permanently unconvertible.
   */
  async findLiveByPropertyId(propertyId: string): Promise<ProjectEntity | null> {
    return this.repository.findOne({
      where: {
        propertyId,
        status: Not(ProjectStatus.CANCELLED),
        deletedAt: IsNull(),
      },
      order: { createdAt: 'DESC' },
    });
  }
```

Import `Not` and `IsNull` from `typeorm` and `ProjectStatus` from `@oneohm/shared` if they are not already imported in this file.

- [ ] **Step 2: Update both callers**

`project.service.ts:440`:

```ts
    const existingProject = await this.projectRepository.findLiveByPropertyId(quote.propertyId);
    if (existingProject) {
      throw new BadRequestException(
        `Property already has a live project (${existingProject.projectNumber}). One property can only have one live project.`,
      );
    }
```

`consumer-project.controller.ts:56`: change `findOneByPropertyId` to `findLiveByPropertyId`. A consumer must never be shown the dead project.

- [ ] **Step 2b: The database enforces the old rule too — relax it**

Found in review. The application guard is not the only thing holding the roof shut:

```
UNIQUE INDEX UQ_projects_property_id ON projects (property_id) WHERE deleted_at IS NULL
```

Cancelling does not soft-delete, so a cancelled project keeps its slot and the new project's `INSERT` violates this index. The guard passes and Postgres throws instead — the roof is still stuck, one layer deeper. Verified on the live database: all three cancelled projects still hold `deleted_at IS NULL`.

New migration `1857015000000-OneLiveProjectPerRoof.ts` drops and recreates it:

```sql
DROP INDEX IF EXISTS "UQ_projects_property_id";
CREATE UNIQUE INDEX "UQ_projects_property_id" ON projects (property_id)
  WHERE deleted_at IS NULL AND status <> 'cancelled';
```

`down()` restores the original predicate. That will fail if any roof already carries a cancelled project plus a live one — state the precondition in the JSDoc, as the milestone migration does.

- [ ] **Step 2c: The entity relation says one-to-one and is now a lie**

A roof may now hold several cancelled projects and one live one, so:

- `project.entity.ts` — `property` becomes `@ManyToOne`
- `customer-property.entity.ts:62-63` — `@OneToOne('ProjectEntity', 'property') project` becomes `@OneToMany` `projects?: ProjectEntity[]`
- the three places that load the relation by name — `customer-property.repository.ts:99`, `:113` and `customer-property.service.ts:399` — move from `'project'` to `'projects'`
- `customer-property-response.dto.ts:233` reads `obj.project?.status` for its `projectStatus` field; it must pick the live project, not whichever row the ORM happened to return, or a re-sold roof reports the status of the dead deal

Left as `@OneToOne`, TypeORM returns an arbitrary one of the matching rows. The property screen would show a cancelled status for a roof with a live project.

- [ ] **Step 3: Confirm no caller was missed**

```bash
grep -rn "findOneByPropertyId" apps/backend/src apps/web
```

Expected: no output.

- [ ] **Step 4: Build**

```bash
npx nx build backend
```

Expected: success.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/projects apps/backend/src/modules/consumer
git commit -m "feat: a cancelled project no longer owns its roof"
```

---

### Task 5: Loss reason and reopening a roof

**Files:**
- Modify: `apps/backend/src/modules/customers/dto/mark-lost.dto.ts`
- Modify: `apps/backend/src/modules/customers/repositories/customer-property.repository.ts:79`
- Modify: `apps/backend/src/modules/customers/repositories/customer-profile.repository.ts:290`
- Modify: `apps/backend/src/modules/customers/services/lead-closure.service.ts`
- Modify: `apps/backend/src/modules/customers/services/customer-property.service.ts:121`
- Modify: `apps/backend/src/modules/customers/services/customer.service.ts:501`
- Modify: `apps/backend/src/modules/customers/controllers/customer-property.controller.ts:479`

**Interfaces:**
- Consumes: `LossReason` from Task 1.
- Produces: `LeadClosureService.markPropertyLost(propertyId, customerId, reason, lossReason, userId, manager?)`; `LeadClosureService.markCustomerLost(customerId, reason, lossReason, userId)`; `CustomerPropertyService.reopen(id, userId): Promise<CustomerPropertyEntity>`; `POST /customer-properties/:id/reopen`.

**Note:** `markPropertyLost` today takes no `EntityManager`. Task 7 calls it from inside a transaction, so this task must add the trailing optional `manager?: EntityManager` and pass it through to `propertyRepository.markLost` and `closeProperty`, both of which already accept one.

- [ ] **Step 1: Take the picklist on the DTO**

In `mark-lost.dto.ts`, add below `reason`:

```ts
  @ApiProperty({
    enum: LossReason,
    required: false,
    description:
      'Picklist reason. Optional so the current mobile build keeps working; ' +
      'missing values are stored as OTHER until the mobile picklist ships.',
  })
  @IsOptional()
  @IsEnum(LossReason)
  lossReason?: LossReason;
```

- [ ] **Step 2: Store it, and add reopen to the repository**

`customer-property.repository.ts`, extend `markLost` to accept `lossReason: LossReason` and set it alongside `lostReason`. Then add:

```ts
  /**
   * Hand the roof back. The reason columns are set to null explicitly — an
   * `undefined` here is dropped before the update and the dead reason survives
   * onto a live site.
   */
  async reopen(id: string, updatedBy: string, manager?: EntityManager): Promise<void> {
    const repo = this.getRepo(manager);
    await repo.update(id, {
      status: PropertyStatus.ACTIVE,
      lostReason: null as unknown as undefined,
      lossReason: null as unknown as undefined,
      lostAt: null as unknown as undefined,
      updatedBy,
    });
  }
```

The requirement is that a real `NULL` reaches the database, not that cast. If a query builder types cleanly here — `.set({ lostReason: () => 'NULL', ... })` — prefer it and drop the casts.

Apply the same `lossReason` change to `customer-profile.repository.ts:290`.

- [ ] **Step 3: Thread it through the closure service**

In `lead-closure.service.ts`, add `lossReason: LossReason` as a parameter to `markPropertyLost` and `markCustomerLost`, passing it to the repositories. Every terminal path already routes through this file, which is why the picklist cannot be applied inconsistently.

- [ ] **Step 4: Add the service method and the endpoint**

In `customer-property.service.ts`, below `markLost`:

```ts
  /**
   * Bring a lost site back into the pipeline. The survey, roof data, DISCOM and
   * photos are all still here; only the deal died. Voided quotes stay voided —
   * the next quote is a fresh one.
   */
  async reopen(id: string, userId: string): Promise<CustomerPropertyEntity> {
    const property = await this.propertyRepository.findById(id);
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    if (property.status !== PropertyStatus.LOST) {
      throw new BadRequestException('Only a lost property can be reopened');
    }

    await this.propertyRepository.reopen(id, userId);

    const updated = await this.propertyRepository.findById(id);
    if (!updated) {
      throw new NotFoundException('Property not found');
    }
    return updated;
  }
```

In `customer-property.controller.ts`, beside the existing `lost` route, following the same decorator shape it already uses:

```ts
  @Post(':id/reopen')
  @ApiOperation({ summary: 'Reopen a lost property so it can be quoted again' })
  async reopen(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<CustomerPropertyResponseDto> {
    const property = await this.propertyService.reopen(id, currentUser.id);
    return toCustomerPropertyResponseDto(property);
  }
```

Match the response-mapping helper the neighbouring `markLost` route uses; do not invent a new one.

- [ ] **Step 5: Walk it through the UI**

Start both servers, open a property at `http://localhost:3001`, mark it lost with a reason, then reopen it.

```bash
npm run backend:dev
```

```bash
npm run web:dev
```

Expected: the property returns to `active`, and the lost reason is gone from the detail page rather than lingering.

- [ ] **Step 6: Confirm the reason really cleared in the data**

```bash
docker exec oneohm-postgres psql -U root -d oneohm_epc -c "select status, lost_reason, loss_reason, lost_at from customer_properties order by updated_at desc limit 1;"
```

Expected: `active` with all three reason columns null. If any is still set, the PATCH sent `undefined` instead of `null`.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/modules/customers
git commit -m "feat: loss reason picklist and property reopen"
```

---

### Task 6: A rejected quote asks what happens next

**Files:**
- Modify: `apps/backend/src/modules/quotes/dto/quotes/update-quote-status.dto.ts`
- Modify: `apps/backend/src/modules/quotes/services/quote.service.ts:608-655`

**Interfaces:**
- Consumes: `voidAllOpenForProperty` (Task 3), `markPropertyLost` (Task 5).
- Produces: `UpdateQuoteStatusDto.rejectionOutcome: 'requote' | 'close'` and `UpdateQuoteStatusDto.lossReason?: LossReason`.

- [ ] **Step 1: Extend the DTO**

```ts
  @ApiProperty({
    enum: ['requote', 'close'],
    required: false,
    description:
      'What happens to the site. "requote" keeps it in the pipeline; "close" ' +
      'marks it lost. Required when status is rejected.',
  })
  @IsOptional()
  @IsIn(['requote', 'close'])
  rejectionOutcome?: 'requote' | 'close';

  @ApiProperty({ enum: LossReason, required: false })
  @IsOptional()
  @IsEnum(LossReason)
  lossReason?: LossReason;
```

- [ ] **Step 2: Branch on it in `updateStatus`**

Inside `QuoteService.updateStatus`, extend the existing rejection guard at line 610 and add the closure branch after the `update` call, mirroring the accepted-path structure already there:

```ts
    if (statusDto.status === QuoteStatus.REJECTED) {
      if (!statusDto.rejectionReason) {
        throw new BadRequestException('Rejection reason is required when rejecting a quote');
      }
      if (!statusDto.rejectionOutcome) {
        throw new BadRequestException(
          'Say what happens to the site: "requote" keeps it, "close" marks it lost.',
        );
      }
    }
```

and, after `const result = await this.quoteRepository.update(id, updateData);`:

```ts
    // Closing the site is best-effort in the same shape as acceptance: the
    // rejection has already saved, and a failure here must not read as
    // "the rejection did not save".
    if (
      statusDto.status === QuoteStatus.REJECTED &&
      statusDto.rejectionOutcome === 'close' &&
      quote.propertyId &&
      quote.customerId
    ) {
      try {
        await this.leadClosureService.markPropertyLost(
          quote.propertyId,
          quote.customerId,
          statusDto.rejectionReason!,
          statusDto.lossReason ?? LossReason.OTHER,
          updatedBy,
        );
        // A closed roof must not leave a live `sent` quote behind for someone
        // to chase.
        await this.quoteRepository.voidAllOpenForProperty(
          quote.propertyId,
          `Site closed: ${statusDto.rejectionReason}`,
          updatedBy,
          undefined,
          id,
        );
      } catch (error) {
        this.logger.error(
          `Quote ${id} rejected but the site could not be closed: ${String(error)}`,
        );
      }
    }
```

- [ ] **Step 3: Walk both branches through the UI**

Reject a quote choosing **Re-quote**. Expected: the property stays `active` and a new quote can be created on it.

Reject another quote choosing **Site is lost**. Expected: the property shows `lost` with the reason, and its other quotes are voided.

```bash
docker exec oneohm-postgres psql -U root -d oneohm_epc -c "select q.quote_number, q.status, q.voided_at is not null as voided, p.status as property_status, p.loss_reason from quotes q join customer_properties p on p.id=q.property_id where p.status='lost' order by q.updated_at desc limit 5;"
```

Expected: the sibling quotes show `voided = t`.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/modules/quotes
git commit -m "feat: rejecting a quote asks whether the site is dead"
```

---

### Task 7: The cancellation transaction

**Files:**
- Create: `apps/backend/src/modules/projects/dto/projects/cancel-project.dto.ts`
- Create: `apps/backend/src/modules/projects/services/project-cancellation.service.ts`
- Modify: `libs/shared/src/types/enums/finance.enum.ts`
- Modify: `apps/backend/src/modules/finance-common/services/sequence.service.ts:71`
- Modify: `apps/backend/src/modules/ledger/services/ledger-write.service.ts`
- Modify: `apps/backend/src/modules/projects/projects.module.ts`

**Interfaces:**
- Consumes: everything from Tasks 1-6.
- Produces: `LedgerWriteService.recordRefund(input, createdBy, manager?)`; `ProjectCancellationService.cancel(projectId, dto, userId): Promise<ProjectEntity>`; `POST /projects/:id/cancel`.

- [ ] **Step 1: Add the refund number scope**

`finance.enum.ts`: add `REFUND = 'refund'` to `FinanceSequenceScope`. `sequence.service.ts:71`: add `case FinanceSequenceScope.REFUND: return 'RFD';`. `numbering_sequences` is keyed by free text, so no migration is needed.

- [ ] **Step 2: Add `recordRefund`**

In `ledger-write.service.ts`, beside `recordExpense`:

```ts
  /**
   * Money handed back. Like an expense it carries no allocation — it does not
   * pay a milestone, it undoes a receipt. Stored negative, same as every other
   * outbound row, so SUM over the ledger stays the cash position.
   */
  async recordRefund(
    input: {
      projectId: string;
      amountPaise: number;
      payee: string;
      valueDate?: string;
      notes?: string;
    },
    createdBy: string,
    externalManager?: EntityManager,
  ): Promise<LedgerEntryEntity> {
    this.assertWritesAllowed();
    const valueDate = this.resolveValueDate(input.valueDate);
    this.assertAmount(input.amountPaise);
    await this.assertProjectInOrg(input.projectId);

    return this.runInTransaction(externalManager, async (manager) =>
      this.insertEntry(manager, {
        projectId: input.projectId,
        customerId: null,
        entryNo: await this.sequenceService.getNextNumber(FinanceSequenceScope.REFUND, manager),
        entryType: 'refund',
        direction: 'out',
        amountPaise: -input.amountPaise,
        valueDate,
        paymentMethod: null,
        counterparty: input.payee,
        category: null,
        notes: input.notes ?? null,
        createdBy,
      }),
    );
  }
```

- [ ] **Step 3: Write the request DTO**

`cancel-project.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { LossReason } from '@oneohm/shared';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CancelProjectSettlementDto {
  @ApiProperty({ enum: ['customer', 'lender'] })
  @IsIn(['customer', 'lender'])
  payerType!: 'customer' | 'lender';

  @ApiProperty({ example: 200000, description: 'Paise we keep. The rest is refunded.' })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  keptPaise!: number;
}

export class CancelProjectDto {
  @ApiProperty({ enum: LossReason })
  @IsEnum(LossReason)
  lossReason!: LossReason;

  @ApiProperty({ example: 'Customer stopped paying after the second milestone' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  cancelReason!: string;

  @ApiProperty({
    enum: ['close', 'requote'],
    description: '"close" loses the roof; "requote" hands it back to the pipeline.',
  })
  @IsIn(['close', 'requote'])
  propertyOutcome!: 'close' | 'requote';

  @ApiProperty({
    type: [CancelProjectSettlementDto],
    required: false,
    description: 'One line per payer that has paid. Omit a payer to keep everything.',
  })
  @IsOptional()
  @Type(() => CancelProjectSettlementDto)
  settlements?: CancelProjectSettlementDto[];
}
```

- [ ] **Step 4: Write the cancellation service**

`project-cancellation.service.ts`. One transaction; the return requests and the property outcome run inside it too, so a half-cancelled project cannot exist:

```ts
/**
 * Cancelling a project must leave nothing hanging.
 *
 * Everything reversible is reversed here. Anything physically out of the
 * warehouse cannot be reversed by a status flip — the panels are on someone's
 * roof — so it becomes a return request and shows on the cleanup checklist
 * until a person resolves it.
 */
@Injectable()
export class ProjectCancellationService {
  private readonly logger = new Logger(ProjectCancellationService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly projectRepository: ProjectRepository,
    private readonly quoteRepository: QuoteRepository,
    private readonly propertyRepository: CustomerPropertyRepository,
    private readonly leadClosureService: LeadClosureService,
    private readonly stockAllocationService: StockAllocationService,
    private readonly ledgerWriteService: LedgerWriteService,
  ) {}

  async cancel(projectId: string, dto: CancelProjectDto, userId: string): Promise<ProjectEntity> {
    const project = await this.projectRepository.findById(projectId);
    if (project.status === ProjectStatus.CANCELLED) {
      throw new BadRequestException('Project is already cancelled');
    }
    if (project.status === ProjectStatus.COMPLETED) {
      throw new BadRequestException('A completed project cannot be cancelled');
    }

    // ProjectEntity carries only propertyId — the customer hangs off the
    // property, so read it here rather than reaching for project.customerId,
    // which does not exist.
    const property = await this.propertyRepository.findById(project.propertyId);
    if (!property) {
      throw new NotFoundException('Property not found for this project');
    }

    const collected = await this.collectedByPayer(projectId);
    for (const settlement of dto.settlements ?? []) {
      const available = collected[settlement.payerType] ?? 0;
      if (settlement.keptPaise > available) {
        throw new BadRequestException(
          `Cannot keep more than was collected from the ${settlement.payerType}.`,
        );
      }
    }

    await this.dataSource.transaction(async (manager) => {
      // 1. Money owed stops being owed. Cash already allocated stays counted.
      await manager.query(
        `UPDATE payment_milestones SET status = 'cancelled', updated_at = now()
          WHERE project_id = $1 AND status = 'active'`,
        [projectId],
      );

      // 2. Commissions nobody has been paid yet.
      await manager.query(
        `UPDATE employee_commissions SET status = 'cancelled', updated_at = now()
          WHERE project_id = $1 AND status IN ('pending', 'approved')`,
        [projectId],
      );

      // 3. The accepted quote stops locking the roof. `propertyId` is NOT NULL
      //    on ProjectEntity, so no guard is needed here.
      await this.quoteRepository.voidAllOpenForProperty(
        project.propertyId,
        `Project ${project.projectNumber} cancelled: ${dto.cancelReason}`,
        userId,
        manager,
      );

      // 4. The roof.
      if (dto.propertyOutcome === 'close') {
        await this.leadClosureService.markPropertyLost(
          project.propertyId,
          property.customerId,
          dto.cancelReason,
          dto.lossReason,
          userId,
          manager,
        );
      } else {
        // Handed straight back to the pipeline. `updateStatusById` is the
        // existing transaction-aware setter; it does no ownership check, which
        // is fine because the project was already loaded above.
        await this.propertyRepository.updateStatusById(
          project.propertyId,
          PropertyStatus.ACTIVE,
          manager,
        );
      }

      // 5. Refunds. Keeping everything writes nothing.
      for (const settlement of dto.settlements ?? []) {
        const refundPaise = (collected[settlement.payerType] ?? 0) - settlement.keptPaise;
        if (refundPaise > 0) {
          await this.ledgerWriteService.recordRefund(
            {
              projectId,
              amountPaise: refundPaise,
              payee: settlement.payerType === 'lender' ? 'Lender' : 'Customer',
              notes: `Project ${project.projectNumber} cancelled: ${dto.cancelReason}`,
            },
            userId,
            manager,
          );
        }
      }

      // 6. Stamp the project. Settlement counts as answered even when the
      //    answer was "keep everything" — that is still an answer.
      await manager.query(
        `UPDATE projects
            SET status = 'cancelled', cancel_reason = $2, loss_reason = $3,
                cancelled_at = now(), settled_at = now(), settled_by = $4, updated_at = now()
          WHERE id = $1`,
        [projectId, dto.cancelReason, dto.lossReason, userId],
      );
    });

    // 7. Stock, outside the transaction: StockAllocationService.cancel opens
    //    its own transaction and takes a pessimistic lock on the allocation.
    //    Nesting it would deadlock against step 1's row locks.
    await this.releaseStock(projectId, project.projectNumber, dto.cancelReason, userId);

    return this.projectRepository.findById(projectId);
  }
}
```

- [ ] **Step 5: Write the stock half**

`StockAllocationService.cancel` at `stock-allocation.service.ts:261` already releases exactly the undispatched quantity and already refuses a fully dispatched allocation. Reuse it rather than writing a second release path:

```ts
  private async releaseStock(
    projectId: string,
    projectNumber: string,
    reason: string,
    userId: string,
  ): Promise<void> {
    const allocations = await this.stockAllocationService.findByProject(projectId);
    const note = `Project ${projectNumber} cancelled: ${reason}`;

    for (const allocation of allocations) {
      if (allocation.status === StockAllocationStatus.CANCELLED) continue;

      const dispatched = Number(allocation.dispatchedQuantity);

      // Anything still in the warehouse goes back to free stock. A fully
      // dispatched allocation has nothing to release and cancel() rejects it.
      if (allocation.status !== StockAllocationStatus.DISPATCHED) {
        await this.stockAllocationService.cancel(allocation.id, note, userId);
      }

      // Anything already at site is a physical recovery, not a status flip.
      if (dispatched > 0) {
        await this.raiseReturn(allocation, dispatched, note, userId);
      }
    }
  }

  /**
   * `return_requests.bom_id` is NOT NULL while `stock_allocations.bom_id` is
   * nullable, so fall back to the project's BOM. If there is no BOM at all we
   * cannot write the row — log loudly rather than lose the panels silently.
   */
  private async raiseReturn(
    allocation: StockAllocationEntity,
    quantity: number,
    reason: string,
    userId: string,
  ): Promise<void> {
    const bomId = allocation.bomId ?? (await this.findProjectBomId(allocation.projectId));
    if (!bomId) {
      this.logger.error(
        `Allocation ${allocation.id} has ${quantity} dispatched units and no BOM; ` +
          `no return request could be raised. Recover this material by hand.`,
      );
      return;
    }
    await this.returnRequestService.create(
      { allocationId: allocation.id, bomId, quantity, reason },
      userId,
    );
  }
```

Add `ReturnRequestService` and a `findProjectBomId` helper (a single `SELECT id FROM bom WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1` — the table is `bom`, singular) to the constructor and the class.

**Correction, found in review — this loop as written cannot work.**

`cancel()` sets the allocation to `CANCELLED`, and `returnToStock` refuses a cancelled allocation outright (`stock-allocation.service.ts:375-377`). So for any allocation with material at site, this loop cancels it and then raises a return request that can **never** be completed: the panels can only be written off. Reordering does not help — the refusal happens at completion time, not creation.

Two changes fix it:

1. **Relax the guard in `returnToStock`.** Delete the `status === CANCELLED` check. Material physically at site can come back regardless of the allocation's administrative status, and the quantity guard three lines below (`maxReturnQty = dispatched − returned; if (maxReturnQty <= 0) throw`) already rejects an allocation that never shipped — which is the case the status guard was really protecting. Say so in a comment so nobody reinstates it.

2. **Decide on quantities, not status.** `if (allocation.status !== DISPATCHED)` misses `COMPLETED`, which is set when an allocation is fully dispatched *and* delivered. `cancel()` then releases nothing and flips a delivered allocation to `CANCELLED` for no gain. Call `cancel()` only when there is something to release:

```ts
      const undispatched = Number(allocation.allocatedQuantity) - Number(allocation.dispatchedQuantity);
      if (undispatched > 0) {
        await this.stockAllocationService.cancel(allocation.id, note, userId);
      }
```

The two quantities are disjoint — `cancel()` releases the undispatched remainder, the return request recovers what is at site — so both can run on one allocation without double-counting. Register `ProjectCancellationService` in `projects.module.ts` and import the inventory, ledger, quotes and customers modules it depends on, following the import style already used by `ProjectService`.

- [ ] **Step 6: Add `collectedByPayer`**

```ts
  /**
   * Who actually paid. Allocations carry the payer through the milestone they
   * paid; cash that was never allocated to a milestone is the customer's.
   */
  private async collectedByPayer(projectId: string): Promise<Record<string, number>> {
    const rows: Array<{ payer_type: string; paise: string }> = await this.dataSource.query(
      `SELECT m.payer_type, SUM(a.amount_paise)::text AS paise
         FROM ledger_allocations a
         JOIN payment_milestones m ON m.id = a.milestone_id
        WHERE a.project_id = $1
        GROUP BY m.payer_type`,
      [projectId],
    );

    const totals: Record<string, number> = {};
    for (const row of rows) totals[row.payer_type] = Number(row.paise);

    const [unallocated]: Array<{ paise: string }> = await this.dataSource.query(
      `SELECT (COALESCE(SUM(e.amount_paise) FILTER (WHERE e.direction = 'in'), 0)
             - COALESCE((SELECT SUM(a.amount_paise) FROM ledger_allocations a
                          WHERE a.project_id = $1), 0))::text AS paise
         FROM ledger_entries e WHERE e.project_id = $1`,
      [projectId],
    );
    const spare = Math.max(Number(unallocated?.paise ?? 0), 0);
    if (spare > 0) totals.customer = (totals.customer ?? 0) + spare;

    return totals;
  }
```

- [ ] **Step 7: Add the endpoint**

In `project.controller.ts`, following the shape of the neighbouring status route:

```ts
  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a project and clean up everything it holds' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelProjectDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<ProjectResponseDto> {
    const project = await this.cancellationService.cancel(id, dto, currentUser.id);
    return toProjectResponseDto(project);
  }
```

- [ ] **Step 8: Verify against a real project**

Pick an active project that has collected money and reserved stock. Note its free stock first:

```bash
docker exec oneohm-postgres psql -U root -d oneohm_epc -c "select p.project_number, sum(v.balance_paise)/100 as owed_rs, (select sum(reserved_quantity) from inventory_stock) as reserved_total from projects p join v_milestone_balance v on v.project_id=p.id where p.status='active' group by 1 order by owed_rs desc limit 3;"
```

Cancel it through the web UI at `http://localhost:3001`, keeping less than everything so a refund is written. Then:

```bash
docker exec oneohm-postgres psql -U root -d oneohm_epc -c "select p.project_number, p.status, p.settled_at is not null as settled, (select count(*) from payment_milestones m where m.project_id=p.id and m.status='active') as still_active_ms, (select sum(v.balance_paise) from v_milestone_balance v where v.project_id=p.id) as owed_paise, (select count(*) from ledger_entries e where e.project_id=p.id and e.entry_type='refund') as refunds, (select count(*) from return_requests r join stock_allocations s on s.id=r.allocation_id where s.project_id=p.id and r.status='pending') as pending_returns from projects p where p.status='cancelled' order by p.cancelled_at desc limit 1;"
```

Expected: `still_active_ms = 0`, `owed_paise = 0`, `refunds = 1`, and `reserved_total` lower by exactly the released quantity.

- [ ] **Step 9: Commit**

```bash
git add apps/backend/src/modules libs/shared
git commit -m "feat: cancelling a project cleans up everything it holds"
```

---

### Task 8: Cancellation is final, and the cleanup checklist

**Files:**
- Modify: `apps/backend/src/modules/projects/services/project.service.ts:663-673`
- Create: `apps/backend/src/modules/projects/dto/projects/cancellation-cleanup.dto.ts`
- Modify: `apps/backend/src/modules/projects/services/project-cancellation.service.ts`
- Modify: `apps/backend/src/modules/projects/controllers/project.controller.ts`
- Modify: `apps/web/components/features/projects/constants.ts:43-47`

**Interfaces:**
- Consumes: Task 7's service.
- Produces: `ProjectCancellationService.getCleanup(projectId): Promise<CancellationCleanupDto>`; `GET /projects/:id/cancellation-cleanup`.

- [ ] **Step 1: Close the door**

In `project.service.ts`, `POST /projects/:id/cancel` is now the only route into cancellation, so the plain status map must offer neither a way in nor a way out. Remove `ProjectStatus.CANCELLED` from the `PLANNING`, `ACTIVE` and `ON_HOLD` target lists, and empty its own:

```ts
      [ProjectStatus.PLANNING]: [ProjectStatus.ACTIVE],
      [ProjectStatus.ACTIVE]: [ProjectStatus.ON_HOLD, ProjectStatus.COMPLETED],
      [ProjectStatus.ON_HOLD]: [ProjectStatus.ACTIVE],
      [ProjectStatus.COMPLETED]: [ProjectStatus.ACTIVE],
      [ProjectStatus.CANCELLED]: [],
```

Mirror all five lines in `apps/web/components/features/projects/constants.ts:43-47`, so the status dropdown offers no transition the API will reject. Cancelling moves to its own action in Task 11.

- [ ] **Step 2: Add the checklist DTO**

```ts
export class CancellationCleanupDto {
  @ApiProperty({ example: 1 }) pendingReturns!: number;
  @ApiProperty({ example: 2 }) openPurchaseOrders!: number;
  @ApiProperty({ example: 0 }) unrecoveredCommissions!: number;
  @ApiProperty({ example: true }) settled!: boolean;
  @ApiProperty({ example: 'cleanup_pending', enum: ['cleanup_pending', 'settled'] })
  state!: 'cleanup_pending' | 'settled';
}
```

- [ ] **Step 3: Derive it — never store it**

```ts
  /**
   * Derived on read from the four things that can still be outstanding. A
   * stored flag would be one more cache to fall out of step with the rows it
   * describes.
   */
  async getCleanup(projectId: string): Promise<CancellationCleanupDto> {
    const [row] = await this.dataSource.query(
      `SELECT
         (SELECT COUNT(*) FROM return_requests r
            JOIN stock_allocations s ON s.id = r.allocation_id
           WHERE s.project_id = $1 AND r.status = 'pending')::int         AS pending_returns,
         (SELECT COUNT(*) FROM purchase_orders po
           WHERE po.project_id = $1
             AND po.status NOT IN ('received', 'cancelled'))::int         AS open_purchase_orders,
         (SELECT COUNT(*) FROM employee_commissions c
           WHERE c.project_id = $1
             AND c.status = 'paid'
             AND c.recovered_at IS NULL)::int                             AS unrecovered_commissions,
         (SELECT settled_at IS NOT NULL FROM projects WHERE id = $1)      AS settled`,
      [projectId],
    );

    const open =
      row.pending_returns + row.open_purchase_orders + row.unrecovered_commissions;

    return {
      pendingReturns: row.pending_returns,
      openPurchaseOrders: row.open_purchase_orders,
      unrecoveredCommissions: row.unrecovered_commissions,
      settled: row.settled,
      state: open === 0 && row.settled ? 'settled' : 'cleanup_pending',
    };
  }
```

- [ ] **Step 4: Expose it**

Add `GET :id/cancellation-cleanup` to `project.controller.ts` returning `CancellationCleanupDto`, matching the decorator shape of the neighbouring GET routes.

- [ ] **Step 5: Verify the state flips**

On the project cancelled in Task 7:

```bash
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8085/api/projects/$PROJECT_ID/cancellation-cleanup
```

Expected: `"state":"cleanup_pending"` with `pendingReturns` at 1. Complete that return request through the inventory screen, call again, and expect `"state":"settled"`.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/projects apps/web/components/features/projects/constants.ts
git commit -m "feat: cancellation is terminal and reports its own cleanup"
```

---

### Task 9: A cancelled project leaves the task dropdown

**Files:**
- Modify: `apps/backend/src/modules/projects/repositories/project-task.repository.ts:761-783`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing new.

`findByUserId`, `findAllByUserId` and `countSummaryForUser` already exclude cancelled projects. `findUserTaskProjects` is the one that does not.

**Correction, found during implementation.** This plan claimed the gap was visible in the My Tasks project dropdown. It is not: `findUserTaskProjects` has no caller anywhere in `apps/backend` or `apps/web`. It is dead code. The filter is still worth adding — it is one line, and it makes the method correct for whoever wires it up — but it fixes nothing a user can see today, and the plan should not have claimed otherwise. The method is left in place rather than deleted; removing pre-existing dead code is not this feature's business.

- [ ] **Step 1: Add the same filter its neighbours use**

After the existing `.andWhere('task.assigned_to_user_id = :userId', { userId })`:

```ts
      .andWhere('project.status != :cancelledStatus', {
        cancelledStatus: ProjectStatus.CANCELLED,
      })
```

`countCompletedThisWeek` is deliberately left alone: it counts `done` tasks, and work genuinely finished before the cancellation should still count.

- [ ] **Step 2: Verify against the data**

```bash
docker exec oneohm-postgres psql -U root -d oneohm_epc -c "select count(*) as cancelled_projects_with_open_tasks from projects p where p.status='cancelled' and exists (select 1 from project_tasks t where t.project_id=p.id and t.status <> 'done');"
```

Expected: a non-zero count — those are the projects the unfiltered query would have returned. There is no screen to check, because nothing calls this method; the count and the compiled filter are the whole verification.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/modules/projects/repositories/project-task.repository.ts
git commit -m "fix: cancelled projects no longer appear in the My Tasks filter"
```

---

### Task 10: Web — the rejection now asks a question

**Files:**
- Modify: `apps/web/components/features/quotes/components/quote-status-dropdown.tsx:64`, `:200-206`, `:420-445`
- Modify: `apps/web/components/features/quotes/hooks/types.ts`

**Interfaces:**
- Consumes: Task 6's DTO fields.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Carry the two new fields**

Add `rejectionOutcome: 'requote' | 'close'` and `lossReason?: LossReason` to the reject mutation input in `hooks/types.ts`, and to the request body the hook posts.

- [ ] **Step 2: Add the choice to the dialog**

In the reject branch of `quote-status-dropdown.tsx`, below the existing reason field, add a `LossReason` select and two submit buttons in place of the single one at line 440: **Re-quote** posts `rejectionOutcome: 'requote'`, **Site is lost** posts `'close'`. Both stay disabled while the reason is empty, matching the existing `!rejectionReason.trim()` guard.

Keep the loss-reason select visible only for **Site is lost** — a re-quote has not lost anything, and showing the field on both paths would state the same fact in two places.

- [ ] **Step 3: Walk both paths**

At `http://localhost:3001`, reject one quote with **Re-quote** and another with **Site is lost**.

Expected: the first leaves the property active and quotable; the second shows the property as lost with the picked reason, and its sibling quotes read as voided.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/features/quotes
git commit -m "feat(web): rejecting a quote asks whether the site is dead"
```

---

### Task 11: Web — cancel dialog, cleanup card, reopen

**Files:**
- Create: `apps/web/components/features/projects/components/project-detail/cancel-project-dialog.tsx`
- Create: `apps/web/components/features/projects/components/project-detail/cancellation-cleanup-card.tsx`
- Create: `apps/web/components/features/properties/property-detail/reopen-property-dialog.tsx`
- Modify: `apps/web/components/features/projects/components/project-detail/project-detail-header.tsx:80-84`, `:446`
- Modify: `apps/web/components/features/properties/property-detail/property-detail-page.tsx:144`
- Modify: `apps/web/components/features/properties/components/property-row-actions-menu.tsx:141`
- Modify: `apps/web/components/features/properties/property-detail/mark-as-lost-dialog.tsx`

**Interfaces:**
- Consumes: `POST /projects/:id/cancel`, `GET /projects/:id/cancellation-cleanup`, `POST /customer-properties/:id/reopen`.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Build the cancel dialog**

Three fields in one dialog: the `LossReason` select, the free-text note, and the roof choice (**Close the site** / **Keep it for a re-quote**). Below them, one row per payer returned as having paid, each pre-filled with the full collected amount so the common case is a single click. Model the dialog shell on `mark-as-lost-dialog.tsx`, which already has the busy-state and escape-key handling this needs.

Wire it to the **Cancel project** action in the header status menu. Cancellation no longer goes through the plain status dropdown, because it now needs answers.

- [ ] **Step 2: Build the cleanup card**

Shown only when `project.status === 'cancelled'`. Reads `GET /projects/:id/cancellation-cleanup` and renders each non-zero count as a line with a link to the screen that resolves it: pending returns to the returns list, open purchase orders to the PO list, unrecovered commissions to the commission screen. When `state === 'settled'`, render one quiet "Cancelled — settled" line instead of a list of zeroes.

Update the header entry at `project-detail-header.tsx:80` so the cancelled title reads **"Cancelled — cleanup pending"** or **"Cancelled — settled"** from that same response, and leave the existing `timeSub` line at `:446` as the only other place the cancellation is described.

- [ ] **Step 3: Add the loss-reason select and reopen**

Add the `LossReason` select to `mark-as-lost-dialog.tsx` above the existing reason box. Add a **Reopen** item to `property-row-actions-menu.tsx`, shown only when the property is `lost`, opening the new reopen dialog. The row's overflow menu stays visible at rest — do not hide it behind hover.

- [ ] **Step 4: Walk the whole flow once, end to end**

At `http://localhost:3001`: cancel a project with stock and money → the cleanup card lists the pending return → resolve the return → the card reads settled → the roof shows lost → reopen it → quote it → accept → convert to a project.

That last conversion is the step the old one-project-per-roof guard would have rejected. If it succeeds, the core of this work is proven.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/features
git commit -m "feat(web): cancel dialog, cleanup checklist and property reopen"
```

---

### Task 12: Backfill the three cancelled projects

**Files:**
- Create: `apps/backend/src/database/migrations/1857020000000-BackfillCancelledProjects.ts`

**Interfaces:**
- Consumes: every column from Task 1 and the view from Task 2.
- Produces: nothing.

Measured on 2026-09-09: three cancelled projects hold ₹5,50,457 of receivables nobody owes, and their roofs are stuck on `converted`. All three collected ₹0, so none needs a refund.

- [ ] **Step 1: Re-check the assumption before writing anything**

```bash
docker exec oneohm-postgres psql -U root -d oneohm_epc -c "select p.project_number, (select coalesce(sum(e.amount_paise),0) from ledger_entries e where e.project_id=p.id and e.direction='in') as collected_paise from projects p where p.status='cancelled' and p.deleted_at is null;"
```

Expected: `collected_paise = 0` on every row. If any is non-zero, stop — that project needs a settlement decision from a person, and the migration must skip it rather than guess.

- [ ] **Step 2: Write the migration**

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

const NOTE = 'backfilled: cancelled before cleanup existed';

export class BackfillCancelledProjects1857020000000 implements MigrationInterface {
  name = 'BackfillCancelledProjects1857020000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Only projects where nothing was ever collected. Anything with cash needs
    // a person to decide what is kept, and this migration must not guess.
    await queryRunner.query(`
      UPDATE payment_milestones m SET status = 'cancelled', updated_at = now()
       WHERE m.status = 'active'
         AND m.project_id IN (
           SELECT p.id FROM projects p
            WHERE p.status = 'cancelled' AND p.deleted_at IS NULL
              AND NOT EXISTS (SELECT 1 FROM ledger_entries e
                               WHERE e.project_id = p.id AND e.direction = 'in')
         )
    `);

    await queryRunner.query(`
      UPDATE projects p
         SET cancelled_at  = COALESCE(p.cancelled_at, p.updated_at),
             settled_at    = COALESCE(p.settled_at, p.updated_at),
             loss_reason   = COALESCE(p.loss_reason, 'other'),
             cancel_reason = COALESCE(p.cancel_reason, '${NOTE}')
       WHERE p.status = 'cancelled' AND p.deleted_at IS NULL
         AND NOT EXISTS (SELECT 1 FROM ledger_entries e
                          WHERE e.project_id = p.id AND e.direction = 'in')
    `);

    await queryRunner.query(`
      UPDATE customer_properties cp
         SET status = 'lost', lost_reason = '${NOTE}', loss_reason = 'other',
             lost_at = COALESCE(cp.lost_at, now()), updated_at = now()
       WHERE cp.status = 'converted'
         AND EXISTS (SELECT 1 FROM projects p
                      WHERE p.property_id = cp.id AND p.status = 'cancelled'
                        AND p.deleted_at IS NULL AND p.settled_at IS NOT NULL)
         AND NOT EXISTS (SELECT 1 FROM projects p
                          WHERE p.property_id = cp.id AND p.status <> 'cancelled'
                            AND p.deleted_at IS NULL)
    `);

    // Free the roof so it can be quoted again.
    await queryRunner.query(`
      UPDATE quotes q SET voided_at = now(), void_reason = '${NOTE}'
       WHERE q.voided_at IS NULL AND q.deleted_at IS NULL
         AND q.property_id IN (
           SELECT cp.id FROM customer_properties cp
            WHERE cp.status = 'lost' AND cp.lost_reason = '${NOTE}'
         )
    `);

    // Tasks are deliberately untouched: there is no cancelled task status, and
    // cancelled projects are already filtered out of every task read.
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE quotes SET voided_at = NULL, void_reason = NULL WHERE void_reason = '${NOTE}'`,
    );
    await queryRunner.query(
      `UPDATE customer_properties SET status = 'converted', lost_reason = NULL,
              loss_reason = NULL, lost_at = NULL WHERE lost_reason = '${NOTE}'`,
    );
    await queryRunner.query(
      `UPDATE projects SET cancelled_at = NULL, settled_at = NULL, loss_reason = NULL,
              cancel_reason = NULL WHERE cancel_reason = '${NOTE}'`,
    );
    await queryRunner.query(
      `UPDATE payment_milestones SET status = 'active'
        WHERE status = 'cancelled'
          AND project_id IN (SELECT id FROM projects WHERE cancel_reason = '${NOTE}')`,
    );
  }
}
```

- [ ] **Step 3: Run it**

```bash
cd apps/backend && npm run migration:run
```

- [ ] **Step 4: Prove the phantom receivables are gone**

```bash
docker exec oneohm-postgres psql -U root -d oneohm_epc -c "select coalesce(sum(v.balance_paise),0)/100 as fake_receivables_rs from v_milestone_balance v join projects p on p.id=v.project_id where p.status='cancelled' and v.status='active';"
```

Expected: `0`. Before this migration it was ₹5,50,457.

- [ ] **Step 5: Confirm the roofs are free**

```bash
docker exec oneohm-postgres psql -U root -d oneohm_epc -c "select cp.property_code, cp.status, (select count(*) from quotes q where q.property_id=cp.id and q.status='accepted' and q.voided_at is null) as still_locking from customer_properties cp where cp.lost_reason = 'backfilled: cancelled before cleanup existed';"
```

Expected: three rows, all `lost`, all `still_locking = 0`.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/database/migrations
git commit -m "fix: backfill the three cancelled projects holding phantom receivables"
```

---

### Task 13: Why we lose

**Files:**
- Create: `apps/backend/src/modules/analytics/domains/sales-pipeline/helpers/loss-reason-sql.helper.ts`
- Modify: `apps/backend/src/modules/analytics/domains/sales-pipeline/sales-pipeline.service.ts`
- Modify: `apps/backend/src/modules/analytics/domains/sales-pipeline/sales-pipeline.controller.ts`
- Modify: `apps/backend/src/modules/analytics/domains/sales-pipeline/dto/sales-pipeline-response.dto.ts`
- Modify: `apps/web/components/features/dashboard/business/components/business-mode.tsx`

**Interfaces:**
- Consumes: `loss_reason` on `customer_properties`, `customer_profiles` and `projects`.
- Produces: `GET /analytics/loss-reasons?from=&to=` returning `Array<{ lossReason: string; leadsLost: number; projectsCancelled: number }>`.

- [ ] **Step 1: Add the query**

`sales-pipeline` already keeps its SQL in `helpers/sales-pipeline-sql.helper.ts`. Put this beside it as a named exported constant, matching that file's style — not an inline string in the service:

```sql
SELECT reason AS "lossReason",
       SUM(is_lead)::int    AS "leadsLost",
       SUM(is_project)::int AS "projectsCancelled"
  FROM (
    SELECT COALESCE(loss_reason, 'other') AS reason, 1 AS is_lead, 0 AS is_project
      FROM customer_properties
     WHERE status = 'lost' AND deleted_at IS NULL
       AND lost_at >= $1::date AND lost_at <= $2::date
    UNION ALL
    SELECT COALESCE(loss_reason, 'other'), 0, 1
      FROM projects
     WHERE status = 'cancelled' AND deleted_at IS NULL
       AND cancelled_at >= $1::date AND cancelled_at <= $2::date
  ) rows
 GROUP BY reason
 ORDER BY (SUM(is_lead) + SUM(is_project)) DESC
```

- [ ] **Step 2: Render it**

Add a loss-reason breakdown to `business-mode.tsx`, which already renders the sales-pipeline funnel, rather than making a new page. Sorted by volume, the biggest reason first — the chart exists to answer one question, so put the answer at the top.

- [ ] **Step 3: Verify**

Open the analytics screen. Expected: the three backfilled cancellations appear under `other`, and any deal closed during earlier task verification appears under the reason that was picked.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/modules/analytics apps/web/components/features
git commit -m "feat: loss reason breakdown"
```

---

## Deliberately not in this plan

The spec's **Phase 2** is the `oneohm-mobile` repo: the loss-reason picklist and
the reopen action on the two screens that already have mark-lost. It is a
separate repo and needs `libs/shared` published first, so it gets its own plan.
Until it ships, `lossReason` is optional on the API and missing values are
stored as `other`, so the current mobile build keeps working untouched.

The consumer mobile app needs no change at all: it already recognises
`cancelled` as one of its five milestone statuses, which
`consumer-contract.spec.ts` pins. Task 2 verifies that contract holds.

## Done when

- A rejected quote asks whether the roof is dead, and closing it voids every sibling quote.
- A cancelled project holds no active milestone, no reserved stock, and no unpaid commission.
- Dispatched material on a cancelled project shows as a pending return, and the project says so until it is resolved.
- A lost roof can be reopened, re-quoted, and converted to a new project.
- `v_milestone_balance` reports ₹0 owed against every cancelled project.
- The three pre-existing cancelled projects no longer appear in receivables.
