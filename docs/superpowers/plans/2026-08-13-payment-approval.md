# Payment Approval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put a verification step in front of every ledger write, so a customer's outstanding only moves after a second person confirms the money arrived.

**Architecture:** Submitted-but-unverified money lands in a new mutable table, `pending_ledger_entries`. Approval runs one transaction that inserts the real `ledger_entries` row plus its allocations and stamps the pending row with the resulting entry id. The ledger stays INSERT-only with no status column, so every existing balance query is untouched.

**Tech Stack:** NestJS 11 + TypeORM (Postgres 15) at `apps/backend`; Next.js 16 + MUI + Tailwind + TanStack Query at `apps/web`; Nx monorepo; Jest.

## Global Constraints

- Money is **integer paise**, signed. Money in positive, money out negative. Never use floats.
- `ledger_entries` is **INSERT-only**. An append-only trigger (migration `1851000000006`) rejects UPDATE and DELETE. Never add a status column to it.
- The ledger has **no status machine** by design. Sums are net of reversals by arithmetic.
- `forbidNonWhitelisted` is globally enabled — every accepted query/body property must be declared on a DTO, or the request 400s.
- RBAC is out of scope. Use `JwtAuthGuard` only. **Do not introduce permission codes.**
- Four-eyes rule: `reviewed_by <> submitted_by`, enforced by a DB CHECK constraint as well as in the service.
- Effective date is the real payment date (`value_date`). Approval never changes it.
- Reuse existing components. Do not create new UI primitives.
- Backend tests: `npx nx test backend`. Typecheck: `npm run typecheck:backend` / `:web`. Lint: `npx nx lint backend`.
- Commit after every task.

---

### Task 1: Add the PAYMENT_APPROVAL sequence scope

`request_no` is minted by the existing `SequenceService`, which produces `PREFIX-FY-000001` (e.g. `PA-2026-27-000001`). It needs a new scope.

**Files:**
- Modify: `libs/shared/src/types/enums/finance.enum.ts:67`
- Modify: `apps/backend/src/modules/finance-common/services/sequence.service.ts` (the `getPrefix` switch)
- Test: `apps/backend/src/modules/finance-common/services/sequence.service.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `FinanceSequenceScope.PAYMENT_APPROVAL = 'payment_approval'`, prefix `PA`. Used by Task 6.

- [ ] **Step 1: Write the failing test**

Append to `sequence.service.spec.ts`, matching the existing tests in that file:

```typescript
it('mints a payment approval number with the PA prefix', async () => {
  const result = await service.getNextNumber(FinanceSequenceScope.PAYMENT_APPROVAL);
  expect(result).toMatch(/^PA-\d{4}-\d{2}-\d{6}$/);
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx nx test backend -- --testPathPattern=sequence.service.spec`
Expected: FAIL — `PAYMENT_APPROVAL` does not exist on `FinanceSequenceScope`.

- [ ] **Step 3: Add the enum member**

In `libs/shared/src/types/enums/finance.enum.ts`, inside `FinanceSequenceScope`:

```typescript
  PAYMENT_APPROVAL = 'payment_approval',
```

- [ ] **Step 4: Add the prefix case**

In `sequence.service.ts`, add a case **before** the `default:` branch (the `default` uses an exhaustive `never` check, so a missing case is a compile error):

```typescript
      case FinanceSequenceScope.PAYMENT_APPROVAL:
        return 'PA';
```

- [ ] **Step 5: Run tests and typecheck**

Run: `npx nx test backend -- --testPathPattern=sequence.service.spec`
Expected: PASS

Run: `npm run typecheck:backend`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add libs/shared/src/types/enums/finance.enum.ts apps/backend/src/modules/finance-common/services/sequence.service.ts apps/backend/src/modules/finance-common/services/sequence.service.spec.ts
git commit -m "feat(finance): add PAYMENT_APPROVAL sequence scope"
```

---

### Task 2: Let LedgerWriteService join an outer transaction

**Why this task exists.** `recordReceipt`, `recordExpense` and `reverse` each call `this.dataSource.transaction(...)`, opening their own transaction. Approval must insert the ledger row *and* stamp the pending row atomically — otherwise a crash between the two leaves money in the ledger with nothing recording that it was approved. They must therefore accept an optional `EntityManager`.

The codebase already has this pattern in `SequenceService.getNextNumber(scope, manager?)`: `const exec = manager ?? this.dataSource.manager`.

**Files:**
- Modify: `apps/backend/src/modules/ledger/services/ledger-write.service.ts` (methods at lines 125, 196, 280)
- Test: `apps/backend/src/modules/ledger/services/ledger-write.service.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `recordReceipt(input: RecordReceiptInput, createdBy: string, manager?: EntityManager): Promise<LedgerEntryEntity>`
  - `recordExpense(input: RecordExpenseInput, createdBy: string, manager?: EntityManager): Promise<LedgerEntryEntity>`
  - `reverse(entryId: string, reason: string, createdBy: string, manager?: EntityManager): Promise<LedgerEntryEntity>`
  Used by Task 7.

- [ ] **Step 1: Write the failing test**

Add to `ledger-write.service.spec.ts`. It asserts the supplied manager is used and no new transaction is opened:

```typescript
it('uses a supplied EntityManager instead of opening its own transaction', async () => {
  const captured: Captured = { entries: [], allocations: [] };
  const outer = makeManager(captured, {});
  const txSpy = jest.spyOn(dataSource, 'transaction');

  await service.recordReceipt(
    { projectId: PROJECT, amountPaise: 10_000 },
    USER,
    outer as never,
  );

  expect(txSpy).not.toHaveBeenCalled();
  expect(captured.entries).toHaveLength(1);
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx nx test backend -- --testPathPattern=ledger-write.service.spec`
Expected: FAIL — `dataSource.transaction` was called, and `recordReceipt` takes only two arguments.

- [ ] **Step 3: Add the helper**

Add this private method to `LedgerWriteService`:

```typescript
  /**
   * Run `fn` inside the caller's transaction when one is supplied, otherwise
   * open our own. Approval needs the ledger insert and the pending-row stamp to
   * commit together; without this they would be two separate transactions and a
   * crash between them would leave money in the ledger that nothing records as
   * approved.
   */
  private runInTransaction<T>(
    manager: EntityManager | undefined,
    fn: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return manager ? fn(manager) : this.dataSource.transaction(fn);
  }
```

- [ ] **Step 4: Route the three public methods through it**

For each of `recordReceipt` (line ~125), `recordExpense` (~196) and `reverse` (~280): add `manager?: EntityManager` as the final parameter and replace `return this.dataSource.transaction(async (manager) => {` with `return this.runInTransaction(manager, async (manager) => {`.

Rename the outer parameter to avoid shadowing — use `externalManager` for the argument and keep `manager` as the callback parameter:

```typescript
  async recordReceipt(
    input: RecordReceiptInput,
    createdBy: string,
    externalManager?: EntityManager,
  ): Promise<LedgerEntryEntity> {
    this.assertWritesAllowed();
    const valueDate = this.resolveValueDate(input.valueDate);
    this.assertAmount(input.amountPaise);
    await this.assertProjectInOrg(input.projectId);

    return this.runInTransaction(externalManager, async (manager) => {
      // ... existing body unchanged
    });
  }
```

- [ ] **Step 5: Run the full ledger test suite**

Run: `npx nx test backend -- --testPathPattern=ledger`
Expected: PASS, including all pre-existing tests. The parameter is optional, so every current caller is unaffected.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/ledger/services/ledger-write.service.ts apps/backend/src/modules/ledger/services/ledger-write.service.spec.ts
git commit -m "refactor(ledger): allow write methods to join an outer transaction"
```

---

### Task 3: Migration — pending_ledger_entries

**Files:**
- Create: `apps/backend/src/database/migrations/1854400000000-CreatePendingLedgerEntries.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: table `pending_ledger_entries`. Used by Task 4.

Follow the naming of the most recent migrations (`1854300000000-RestoreTaskCompletionTimestamps.ts`).

- [ ] **Step 1: Write the migration**

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Staging table for money awaiting verification.
 *
 * Deliberately NOT a status column on `ledger_entries`: that table is
 * INSERT-only (append-only trigger, migration 1851000000006) and carries no
 * status machine on purpose — a status machine is what made
 * project_payment_terms.paid_amount drift. Pending money therefore lives here,
 * and approval is the act that inserts the ledger row.
 *
 * Existing ledger entries are implicitly approved. No rows are backfilled, so
 * no customer balance moves when this ships.
 */
export class CreatePendingLedgerEntries1854400000000 implements MigrationInterface {
  name = 'CreatePendingLedgerEntries1854400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "pending_ledger_entries" (
        "id"                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "request_no"         varchar(30)  NOT NULL UNIQUE,
        "kind"               varchar(20)  NOT NULL,
        "status"             varchar(20)  NOT NULL DEFAULT 'pending',
        "project_id"         uuid         NOT NULL REFERENCES "projects"("id"),
        "customer_id"        uuid         NULL,
        "entry_type"         varchar(30)  NOT NULL,
        "direction"          varchar(3)   NOT NULL,
        "amount_paise"       bigint       NOT NULL,
        "value_date"         date         NOT NULL,
        "payment_method"     varchar(50)  NULL,
        "counterparty"       varchar(255) NULL,
        "category"           varchar(30)  NULL,
        "reference"          varchar(255) NULL,
        "notes"              text         NULL,
        "reverses_entry_id"  uuid         NULL REFERENCES "ledger_entries"("id"),
        "reversal_reason"    varchar(500) NULL,
        "proof_document_id"  uuid         NULL,
        "submitted_by"       uuid         NOT NULL,
        "submitted_at"       timestamptz  NOT NULL DEFAULT now(),
        "reviewed_by"        uuid         NULL,
        "reviewed_at"        timestamptz  NULL,
        "rejection_reason"   varchar(500) NULL,
        "ledger_entry_id"    uuid         NULL UNIQUE REFERENCES "ledger_entries"("id"),
        "created_at"         timestamptz  NOT NULL DEFAULT now(),
        "updated_at"         timestamptz  NOT NULL DEFAULT now(),

        CONSTRAINT "chk_ple_kind"      CHECK ("kind" IN ('receipt','expense','reversal')),
        CONSTRAINT "chk_ple_status"    CHECK ("status" IN ('pending','approved','rejected','cancelled')),
        CONSTRAINT "chk_ple_direction" CHECK ("direction" IN ('in','out')),

        -- Four-eyes, enforced by the database so it holds on any code path.
        CONSTRAINT "chk_ple_four_eyes" CHECK ("reviewed_by" IS NULL OR "reviewed_by" <> "submitted_by"),
        CONSTRAINT "chk_ple_approved_has_entry"
          CHECK ("status" <> 'approved' OR "ledger_entry_id" IS NOT NULL),
        CONSTRAINT "chk_ple_rejected_has_reason"
          CHECK ("status" <> 'rejected' OR "rejection_reason" IS NOT NULL),
        CONSTRAINT "chk_ple_reversal_has_target"
          CHECK ("kind" <> 'reversal' OR "reverses_entry_id" IS NOT NULL)
      );
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_ple_status_submitted" ON "pending_ledger_entries" ("status", "submitted_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_ple_project" ON "pending_ledger_entries" ("project_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_ple_customer" ON "pending_ledger_entries" ("customer_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_ple_submitted_by" ON "pending_ledger_entries" ("submitted_by")`,
    );

    // At most one queued reversal per ledger entry, so two approvers cannot
    // each approve a reversal of the same payment and double-reverse it.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_ple_one_pending_reversal"
        ON "pending_ledger_entries" ("reverses_entry_id")
        WHERE "status" = 'pending' AND "kind" = 'reversal'
    `);

    // Duplicate detection reads this on every submit.
    await queryRunner.query(`
      CREATE INDEX "idx_ple_dup_probe"
        ON "pending_ledger_entries" ("project_id", "amount_paise", "value_date")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "pending_ledger_entries"`);
  }
}
```

- [ ] **Step 2: Run the migration against local Postgres**

Run: `npx nx run backend:migration:run` (if that target is absent, use the command in `package.json` used for the previous migrations)
Expected: migration applies with no error.

- [ ] **Step 3: Verify the constraints actually reject bad rows**

```bash
docker exec -i oneohm-postgres psql -U postgres -d oneohm -c "
INSERT INTO pending_ledger_entries
  (request_no, kind, status, project_id, entry_type, direction, amount_paise, value_date, submitted_by, reviewed_by)
SELECT 'PA-TEST-1','receipt','pending', id, 'receipt','in', 100, CURRENT_DATE,
       '00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001'
FROM projects LIMIT 1;"
```
Expected: ERROR mentioning `chk_ple_four_eyes`. If it inserts, the constraint is wrong — fix before continuing.

- [ ] **Step 4: Confirm rollback works**

Run the migration revert command, confirm the table is gone, then re-run `up`.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/database/migrations/1854400000000-CreatePendingLedgerEntries.ts
git commit -m "feat(payment-approvals): add pending_ledger_entries table"
```

---

### Task 4: Entity and module skeleton

**Files:**
- Create: `apps/backend/src/modules/payment-approvals/entities/pending-ledger-entry.entity.ts`
- Create: `apps/backend/src/modules/payment-approvals/entities/index.ts`
- Create: `apps/backend/src/modules/payment-approvals/payment-approval.module.ts`
- Modify: `apps/backend/src/app.module.ts` (add to `imports`)

**Interfaces:**
- Consumes: table from Task 3.
- Produces: `PendingLedgerEntryEntity`, plus the exported types `PendingKind` and `PendingStatus`. Used by Tasks 5–9.

- [ ] **Step 1: Write the entity**

```typescript
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { paiseTransformer } from '../../ledger/domain/paise';

export type PendingKind = 'receipt' | 'expense' | 'reversal';
export type PendingStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

/**
 * Money that has been claimed but not yet verified.
 *
 * Unlike `LedgerEntryEntity` this row IS mutable — it has a status — which is
 * exactly why it cannot live in `ledger_entries`. Nothing here counts towards
 * any balance; `v_project_balance`, outstanding, AR and the KPIs all read
 * `ledger_entries`, which this table never touches until approval.
 */
@Entity('pending_ledger_entries')
@Index(['status', 'submittedAt'])
export class PendingLedgerEntryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'request_no', type: 'varchar', length: 30, unique: true })
  requestNo!: string;

  @Column({ type: 'varchar', length: 20 })
  kind!: PendingKind;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: PendingStatus;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId?: string | null;

  @Column({ name: 'entry_type', type: 'varchar', length: 30 })
  entryType!: string;

  @Column({ type: 'varchar', length: 3 })
  direction!: 'in' | 'out';

  @Column({ name: 'amount_paise', type: 'bigint', transformer: paiseTransformer })
  amountPaise!: number;

  @Column({ name: 'value_date', type: 'date' })
  valueDate!: string;

  @Column({ name: 'payment_method', type: 'varchar', length: 50, nullable: true })
  paymentMethod?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  counterparty?: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  category?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reference?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ name: 'reverses_entry_id', type: 'uuid', nullable: true })
  reversesEntryId?: string | null;

  @Column({ name: 'reversal_reason', type: 'varchar', length: 500, nullable: true })
  reversalReason?: string | null;

  @Column({ name: 'proof_document_id', type: 'uuid', nullable: true })
  proofDocumentId?: string | null;

  @Column({ name: 'submitted_by', type: 'uuid' })
  submittedBy!: string;

  @Column({ name: 'submitted_at', type: 'timestamptz' })
  submittedAt!: Date;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy?: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt?: Date | null;

  @Column({ name: 'rejection_reason', type: 'varchar', length: 500, nullable: true })
  rejectionReason?: string | null;

  @Column({ name: 'ledger_entry_id', type: 'uuid', nullable: true })
  ledgerEntryId?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
```

- [ ] **Step 2: Write the barrel export**

`entities/index.ts`:

```typescript
export * from './pending-ledger-entry.entity';
```

- [ ] **Step 3: Write the module**

`payment-approval.module.ts` — imports `LedgerModule` for `LedgerWriteService` and `FinanceCommonModule` for `SequenceService`. Check the exact module names exported by `apps/backend/src/modules/ledger/ledger.module.ts` and the finance-common module file, and import those:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FinanceCommonModule } from '../finance-common/finance-common.module';
import { LedgerModule } from '../ledger/ledger.module';
import { PendingLedgerEntryEntity } from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([PendingLedgerEntryEntity]),
    LedgerModule,
    FinanceCommonModule,
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class PaymentApprovalModule {}
```

- [ ] **Step 4: Register it**

Add `PaymentApprovalModule` to the `imports` array in `apps/backend/src/app.module.ts`, next to the other feature modules.

- [ ] **Step 5: Verify the app boots**

Run: `npm run typecheck:backend`
Expected: no errors.

Run: `npx nx serve backend` and confirm startup logs show no dependency-injection error, then stop it.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/payment-approvals apps/backend/src/app.module.ts
git commit -m "feat(payment-approvals): add entity and module skeleton"
```

---

### Task 5: DTOs

**Files:**
- Create: `apps/backend/src/modules/payment-approvals/dto/submit-approval.dto.ts`
- Create: `apps/backend/src/modules/payment-approvals/dto/review-approval.dto.ts`
- Create: `apps/backend/src/modules/payment-approvals/dto/query-approvals.dto.ts`
- Create: `apps/backend/src/modules/payment-approvals/dto/index.ts`

**Interfaces:**
- Consumes: `PendingKind`, `PendingStatus` from Task 4.
- Produces: `SubmitApprovalDto`, `RejectApprovalDto`, `BulkApproveDto`, `QueryApprovalsDto`. Used by Tasks 6–9, 12.

`forbidNonWhitelisted` is global: any property not declared here causes a 400.

- [ ] **Step 1: Write `submit-approval.dto.ts`**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString, IsEnum, IsInt, IsOptional, IsPositive, IsString,
  IsUUID, MaxLength, ValidateIf,
} from 'class-validator';

export class SubmitApprovalDto {
  @ApiProperty({ enum: ['receipt', 'expense', 'reversal'] })
  @IsEnum(['receipt', 'expense', 'reversal'])
  kind!: 'receipt' | 'expense' | 'reversal';

  @ApiPropertyOptional({ description: 'Required for receipt and expense.' })
  @ValidateIf((o) => o.kind !== 'reversal')
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Integer paise, positive. Required for receipt and expense.' })
  @ValidateIf((o) => o.kind !== 'reversal')
  @IsInt()
  @IsPositive()
  amountPaise?: number;

  @ApiPropertyOptional({ description: 'The real payment date, YYYY-MM-DD. Defaults to today.' })
  @IsOptional()
  @IsDateString()
  valueDate?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50)
  paymentMethod?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255)
  reference?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255)
  counterparty?: string;

  @ApiPropertyOptional({ description: 'Required for expense.' })
  @ValidateIf((o) => o.kind === 'expense')
  @IsString() @MaxLength(30)
  category?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  notes?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  customerId?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  proofDocumentId?: string;

  @ApiPropertyOptional({ description: 'Required for reversal — the ledger entry being reversed.' })
  @ValidateIf((o) => o.kind === 'reversal')
  @IsUUID()
  reversesEntryId?: string;

  @ApiPropertyOptional({ description: 'Required for reversal.' })
  @ValidateIf((o) => o.kind === 'reversal')
  @IsString() @MaxLength(500)
  reversalReason?: string;
}
```

- [ ] **Step 2: Write `review-approval.dto.ts`**

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class RejectApprovalDto {
  @ApiProperty({ description: 'Why this was rejected. Shown to the submitter.' })
  @IsString() @MinLength(3) @MaxLength(500)
  reason!: string;
}

export class BulkApproveDto {
  @ApiProperty({ type: [String], description: 'Pending ids to approve. Max 100 per call.' })
  @IsArray() @ArrayNotEmpty() @ArrayMaxSize(100) @IsUUID('4', { each: true })
  ids!: string[];
}
```

- [ ] **Step 3: Write `query-approvals.dto.ts`**

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class QueryApprovalsDto {
  @ApiPropertyOptional({ enum: ['pending', 'approved', 'rejected', 'cancelled'] })
  @IsOptional() @IsEnum(['pending', 'approved', 'rejected', 'cancelled'])
  status?: 'pending' | 'approved' | 'rejected' | 'cancelled';

  @ApiPropertyOptional({ enum: ['receipt', 'expense', 'reversal'] })
  @IsOptional() @IsEnum(['receipt', 'expense', 'reversal'])
  kind?: 'receipt' | 'expense' | 'reversal';

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  projectId?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Filters on value_date, inclusive.' })
  @IsOptional() @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Matches request_no, reference or counterparty.' })
  @IsOptional() @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 25 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200)
  limit?: number;
}
```

- [ ] **Step 4: Write the barrel and typecheck**

`dto/index.ts`:

```typescript
export * from './submit-approval.dto';
export * from './review-approval.dto';
export * from './query-approvals.dto';
```

Run: `npm run typecheck:backend`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/payment-approvals/dto
git commit -m "feat(payment-approvals): add request DTOs"
```

---

### Task 6: Service — submit, with duplicate detection

**Files:**
- Create: `apps/backend/src/modules/payment-approvals/services/payment-approval.service.ts`
- Create: `apps/backend/src/modules/payment-approvals/services/index.ts`
- Test: `apps/backend/src/modules/payment-approvals/services/payment-approval.service.spec.ts`
- Modify: `apps/backend/src/modules/payment-approvals/payment-approval.module.ts` (register the provider)

**Interfaces:**
- Consumes: `PendingLedgerEntryEntity` (Task 4), `SubmitApprovalDto` (Task 5), `FinanceSequenceScope.PAYMENT_APPROVAL` (Task 1).
- Produces:
  - `submit(dto: SubmitApprovalDto, userId: string): Promise<PendingLedgerEntryEntity>`
  - `findDuplicates(projectId: string, amountPaise: number, valueDate: string): Promise<PendingLedgerEntryEntity[]>`
  Used by Tasks 7–10.

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';

describe('PaymentApprovalService.submit', () => {
  it('creates a pending receipt with direction in and a PA request number', async () => {
    const row = await service.submit(
      { kind: 'receipt', projectId: PROJECT, amountPaise: 50_000, valueDate: '2026-08-01' },
      USER,
    );
    expect(row.status).toBe('pending');
    expect(row.direction).toBe('in');
    expect(row.amountPaise).toBe(50_000);
    expect(row.requestNo).toMatch(/^PA-/);
  });

  it('stores an expense as a negative amount going out', async () => {
    const row = await service.submit(
      { kind: 'expense', projectId: PROJECT, amountPaise: 20_000, category: 'materials' },
      USER,
    );
    expect(row.direction).toBe('out');
    expect(row.amountPaise).toBe(-20_000);
  });

  it('rejects a future-dated payment', async () => {
    await expect(
      service.submit(
        { kind: 'receipt', projectId: PROJECT, amountPaise: 1_000, valueDate: '2099-01-01' },
        USER,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('flags a same project, amount and date submitted in the last 24h as a possible duplicate', async () => {
    const dupes = await service.findDuplicates(PROJECT, 50_000, '2026-08-01');
    expect(dupes).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx nx test backend -- --testPathPattern=payment-approval.service`
Expected: FAIL — service does not exist.

- [ ] **Step 3: Implement submit**

```typescript
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { FinanceSequenceScope } from '@tejas96/shared/types';
import { DataSource } from 'typeorm';

import { SequenceService } from '../../finance-common/services/sequence.service';
import { LedgerEntryEntity } from '../../ledger/entities';
import { SubmitApprovalDto } from '../dto';
import { PendingLedgerEntryEntity } from '../entities';

@Injectable()
export class PaymentApprovalService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly sequences: SequenceService,
  ) {}

  async submit(dto: SubmitApprovalDto, userId: string): Promise<PendingLedgerEntryEntity> {
    const valueDate = dto.valueDate ?? new Date().toISOString().slice(0, 10);
    if (valueDate > new Date().toISOString().slice(0, 10)) {
      throw new BadRequestException('A payment cannot be dated in the future');
    }

    return this.dataSource.transaction(async (manager) => {
      const requestNo = await this.sequences.getNextNumber(
        FinanceSequenceScope.PAYMENT_APPROVAL,
        manager,
      );

      const base = {
        requestNo,
        status: 'pending' as const,
        submittedBy: userId,
        submittedAt: new Date(),
        valueDate,
        notes: dto.notes ?? null,
        reference: dto.reference ?? null,
        paymentMethod: dto.paymentMethod ?? null,
        counterparty: dto.counterparty ?? null,
        proofDocumentId: dto.proofDocumentId ?? null,
      };

      let row: Partial<PendingLedgerEntryEntity>;

      if (dto.kind === 'reversal') {
        // Reversals target a committed ledger row. Amount and project are taken
        // from that row, never from the client, so a reversal cannot silently
        // reverse a different figure than the original.
        const target = await manager
          .getRepository(LedgerEntryEntity)
          .findOne({ where: { id: dto.reversesEntryId } });
        if (!target) throw new NotFoundException('Entry to reverse was not found');

        row = {
          ...base,
          kind: 'reversal',
          projectId: target.projectId,
          customerId: target.customerId ?? null,
          entryType: target.entryType,
          direction: target.direction,
          amountPaise: -target.amountPaise,
          reversesEntryId: target.id,
          reversalReason: dto.reversalReason ?? null,
        };
      } else {
        const isReceipt = dto.kind === 'receipt';
        row = {
          ...base,
          kind: dto.kind,
          projectId: dto.projectId!,
          customerId: dto.customerId ?? null,
          entryType: isReceipt ? 'receipt' : 'expense',
          direction: isReceipt ? 'in' : 'out',
          // Signed, matching the ledger convention: money out is negative.
          amountPaise: isReceipt ? dto.amountPaise! : -dto.amountPaise!,
          category: dto.category ?? null,
        };
      }

      const repo = manager.getRepository(PendingLedgerEntryEntity);
      const inserted = await repo.insert(row);
      return repo.findOneOrFail({ where: { id: inserted.identifiers[0]!.id as string } });
    });
  }

  /**
   * Possible duplicates: the same project, amount and payment date submitted in
   * the last 24 hours. A warning for the approver, never a block — a customer
   * genuinely can pay the same amount twice in a day.
   */
  async findDuplicates(
    projectId: string,
    amountPaise: number,
    valueDate: string,
  ): Promise<PendingLedgerEntryEntity[]> {
    return this.dataSource.getRepository(PendingLedgerEntryEntity).find({
      where: {
        projectId,
        amountPaise,
        valueDate,
      },
      order: { submittedAt: 'DESC' },
      take: 5,
    });
  }
}
```

Register `PaymentApprovalService` in the module's `providers` and `exports`.

- [ ] **Step 4: Run tests**

Run: `npx nx test backend -- --testPathPattern=payment-approval.service`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/payment-approvals
git commit -m "feat(payment-approvals): submit pending entries with duplicate detection"
```

---

### Task 7: Service — approve, atomically

The heart of the feature. One transaction: lock the pending row, insert the ledger entry through `LedgerWriteService` using the **same** manager, then stamp the pending row.

**Files:**
- Modify: `apps/backend/src/modules/payment-approvals/services/payment-approval.service.ts`
- Test: `apps/backend/src/modules/payment-approvals/services/payment-approval.service.spec.ts`

**Interfaces:**
- Consumes: `LedgerWriteService.recordReceipt/recordExpense/reverse(..., manager?)` from Task 2.
- Produces: `approve(id: string, approverId: string): Promise<PendingLedgerEntryEntity>`. Used by Tasks 9, 10.

- [ ] **Step 1: Write the failing tests**

```typescript
describe('PaymentApprovalService.approve', () => {
  it('refuses when the approver is the submitter', async () => {
    await expect(service.approve(PENDING_ID, USER)).rejects.toThrow(ForbiddenException);
  });

  it('refuses a row that is not pending', async () => {
    await expect(service.approve(APPROVED_ID, OTHER_USER)).rejects.toThrow(ConflictException);
  });

  it('inserts the ledger entry and stamps the pending row in one transaction', async () => {
    const row = await service.approve(PENDING_ID, OTHER_USER);
    expect(row.status).toBe('approved');
    expect(row.ledgerEntryId).toBe('new-entry-id');
    expect(row.reviewedBy).toBe(OTHER_USER);
    expect(ledgerWrite.recordReceipt).toHaveBeenCalledWith(
      expect.objectContaining({ valueDate: '2026-08-01' }),
      OTHER_USER,
      expect.anything(), // the shared manager
    );
  });

  it('refuses to approve a reversal whose target is already reversed', async () => {
    await expect(service.approve(REVERSAL_ID, OTHER_USER)).rejects.toThrow(ConflictException);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx nx test backend -- --testPathPattern=payment-approval.service`
Expected: FAIL — `approve` is not a function.

- [ ] **Step 3: Implement approve**

Inject `LedgerWriteService` into the constructor, then:

```typescript
  /**
   * Approving is what puts money in the ledger.
   *
   * Everything happens in one transaction with the pending row locked
   * FOR UPDATE, so two approvers clicking at once cannot both insert. The
   * ledger write joins this transaction (see LedgerWriteService.runInTransaction)
   * — otherwise a crash between the insert and the stamp would leave money in
   * the ledger that nothing records as approved.
   *
   * Allocation is computed here, not at submission: two payments queued against
   * one project must not both claim the same milestone.
   */
  async approve(id: string, approverId: string): Promise<PendingLedgerEntryEntity> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(PendingLedgerEntryEntity);

      const row = await repo.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!row) throw new NotFoundException('Approval request not found');
      if (row.status !== 'pending') {
        throw new ConflictException(`This request is already ${row.status}`);
      }
      if (row.submittedBy === approverId) {
        throw new ForbiddenException('You submitted this payment — another user must approve it');
      }

      let entry: LedgerEntryEntity;

      if (row.kind === 'reversal') {
        const target = await manager
          .getRepository(LedgerEntryEntity)
          .findOne({ where: { id: row.reversesEntryId! } });
        if (!target) throw new NotFoundException('The entry to reverse no longer exists');

        const already = await manager.getRepository(LedgerEntryEntity).findOne({
          where: { reversesId: target.id },
        });
        if (already) {
          throw new ConflictException('That entry has already been reversed');
        }

        entry = await this.ledgerWrite.reverse(
          target.id,
          row.reversalReason ?? 'Approved reversal',
          approverId,
          manager,
        );
      } else if (row.kind === 'receipt') {
        entry = await this.ledgerWrite.recordReceipt(
          {
            projectId: row.projectId,
            amountPaise: row.amountPaise,
            valueDate: row.valueDate,
            paymentMethod: row.paymentMethod ?? undefined,
            reference: row.reference ?? undefined,
            notes: row.notes ?? undefined,
            customerId: row.customerId ?? undefined,
          },
          approverId,
          manager,
        );
      } else {
        entry = await this.ledgerWrite.recordExpense(
          {
            projectId: row.projectId,
            // The ledger's recordExpense takes a positive magnitude and applies
            // the sign itself; we store it signed.
            amountPaise: Math.abs(row.amountPaise),
            valueDate: row.valueDate,
            category: row.category ?? 'other',
            payee: row.counterparty ?? undefined,
            paymentMethod: row.paymentMethod ?? undefined,
            notes: row.notes ?? undefined,
          },
          approverId,
          manager,
        );
      }

      await repo.update(row.id, {
        status: 'approved',
        reviewedBy: approverId,
        reviewedAt: new Date(),
        ledgerEntryId: entry.id,
      });

      return repo.findOneOrFail({ where: { id: row.id } });
    });
  }
```

- [ ] **Step 4: Add the expense sign test**

`recordExpense` takes a **positive magnitude** and negates it internally
(`ledger-write.service.ts`: `amountPaise: -input.amountPaise`), while this table stores
the value already signed. That is why `Math.abs()` is correct above — passing the
stored negative would double-negate and credit the project instead of debiting it.

Lock that in:

```typescript
it('passes a positive magnitude to recordExpense and lands a negative ledger row', async () => {
  await service.approve(PENDING_EXPENSE_ID, OTHER_USER);
  expect(ledgerWrite.recordExpense).toHaveBeenCalledWith(
    expect.objectContaining({ amountPaise: 20_000 }), // positive
    OTHER_USER,
    expect.anything(),
  );
});
```

- [ ] **Step 5: Run tests**

Run: `npx nx test backend -- --testPathPattern=payment-approval.service`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/payment-approvals
git commit -m "feat(payment-approvals): approve atomically into the ledger"
```

---

### Task 8: Service — reject, cancel, list, summary

**Files:**
- Modify: `apps/backend/src/modules/payment-approvals/services/payment-approval.service.ts`
- Test: `apps/backend/src/modules/payment-approvals/services/payment-approval.service.spec.ts`

**Interfaces:**
- Produces:
  - `reject(id: string, reason: string, approverId: string): Promise<PendingLedgerEntryEntity>`
  - `cancel(id: string, userId: string): Promise<PendingLedgerEntryEntity>`
  - `list(query: QueryApprovalsDto): Promise<{ data: PendingLedgerEntryEntity[]; total: number; page: number; limit: number }>`
  - `summary(): Promise<{ pendingCount: number }>`
  Used by Tasks 9, 10, 13.

- [ ] **Step 1: Write the failing tests**

```typescript
it('rejects with a reason and does not touch the ledger', async () => {
  const row = await service.reject(PENDING_ID, 'UPI reference does not match', OTHER_USER);
  expect(row.status).toBe('rejected');
  expect(row.rejectionReason).toBe('UPI reference does not match');
  expect(ledgerWrite.recordReceipt).not.toHaveBeenCalled();
});

it('refuses to reject your own submission', async () => {
  await expect(service.reject(PENDING_ID, 'nope', USER)).rejects.toThrow(ForbiddenException);
});

it('lets the submitter cancel their own pending row', async () => {
  const row = await service.cancel(PENDING_ID, USER);
  expect(row.status).toBe('cancelled');
});

it('refuses to let anyone else cancel it', async () => {
  await expect(service.cancel(PENDING_ID, OTHER_USER)).rejects.toThrow(ForbiddenException);
});

it('counts only pending rows in the summary', async () => {
  await expect(service.summary()).resolves.toEqual({ pendingCount: 1 });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx nx test backend -- --testPathPattern=payment-approval.service`
Expected: FAIL

- [ ] **Step 3: Implement the four methods**

```typescript
  async reject(id: string, reason: string, approverId: string): Promise<PendingLedgerEntryEntity> {
    return this.transitionPending(id, approverId, (row, repo) => {
      if (row.submittedBy === approverId) {
        throw new ForbiddenException('You submitted this payment — another user must review it');
      }
      return repo.update(row.id, {
        status: 'rejected',
        rejectionReason: reason,
        reviewedBy: approverId,
        reviewedAt: new Date(),
      });
    });
  }

  /** Withdrawing your own submission. Terminal, and needs no approver. */
  async cancel(id: string, userId: string): Promise<PendingLedgerEntryEntity> {
    return this.transitionPending(id, userId, (row, repo) => {
      if (row.submittedBy !== userId) {
        throw new ForbiddenException('Only the person who submitted this can cancel it');
      }
      return repo.update(row.id, { status: 'cancelled' });
    });
  }

  /** Shared lock-and-check used by reject and cancel. */
  private async transitionPending(
    id: string,
    _actorId: string,
    apply: (row: PendingLedgerEntryEntity, repo: Repository<PendingLedgerEntryEntity>) => Promise<unknown>,
  ): Promise<PendingLedgerEntryEntity> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(PendingLedgerEntryEntity);
      const row = await repo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!row) throw new NotFoundException('Approval request not found');
      if (row.status !== 'pending') {
        throw new ConflictException(`This request is already ${row.status}`);
      }
      await apply(row, repo);
      return repo.findOneOrFail({ where: { id } });
    });
  }

  async list(query: QueryApprovalsDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(200, Math.max(1, query.limit ?? 25));

    const qb = this.dataSource
      .getRepository(PendingLedgerEntryEntity)
      .createQueryBuilder('p');

    if (query.status) qb.andWhere('p.status = :status', { status: query.status });
    if (query.kind) qb.andWhere('p.kind = :kind', { kind: query.kind });
    if (query.projectId) qb.andWhere('p.projectId = :projectId', { projectId: query.projectId });
    if (query.customerId) qb.andWhere('p.customerId = :customerId', { customerId: query.customerId });
    if (query.dateFrom) qb.andWhere('p.valueDate >= :dateFrom', { dateFrom: query.dateFrom });
    if (query.dateTo) qb.andWhere('p.valueDate <= :dateTo', { dateTo: query.dateTo });
    if (query.search) {
      qb.andWhere(
        '(p.requestNo ILIKE :q OR p.reference ILIKE :q OR p.counterparty ILIKE :q)',
        { q: `%${query.search}%` },
      );
    }

    // Oldest pending first — the queue should drain in the order it filled.
    const [data, total] = await qb
      .orderBy('p.submittedAt', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async summary(): Promise<{ pendingCount: number }> {
    const pendingCount = await this.dataSource
      .getRepository(PendingLedgerEntryEntity)
      .count({ where: { status: 'pending' } });
    return { pendingCount };
  }
```

- [ ] **Step 4: Run tests**

Run: `npx nx test backend -- --testPathPattern=payment-approval.service`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/payment-approvals
git commit -m "feat(payment-approvals): reject, cancel, list and summary"
```

---

### Task 9: Bulk approve

Each id gets its own transaction so eight successes are not lost to two failures.

**Files:**
- Modify: `apps/backend/src/modules/payment-approvals/services/payment-approval.service.ts`
- Test: `apps/backend/src/modules/payment-approvals/services/payment-approval.service.spec.ts`

**Interfaces:**
- Produces: `bulkApprove(ids: string[], approverId: string): Promise<BulkApproveResult>` where

```typescript
export interface BulkApproveResult {
  approved: string[];
  failed: Array<{ id: string; reason: string }>;
}
```

Used by Tasks 10, 13.

- [ ] **Step 1: Write the failing test**

```typescript
it('approves what it can and reports the rest', async () => {
  const result = await service.bulkApprove([PENDING_ID, OWN_ID, APPROVED_ID], OTHER_USER);
  expect(result.approved).toEqual([PENDING_ID]);
  expect(result.failed).toEqual([
    { id: OWN_ID, reason: expect.stringContaining('another user must approve') },
    { id: APPROVED_ID, reason: expect.stringContaining('already') },
  ]);
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx nx test backend -- --testPathPattern=payment-approval.service`
Expected: FAIL

- [ ] **Step 3: Implement**

```typescript
  /**
   * Sequential on purpose. Each approval takes FOR UPDATE locks on the project's
   * milestone balances; running them in parallel would have them queue on those
   * locks anyway, and would make the failure output non-deterministic.
   */
  async bulkApprove(ids: string[], approverId: string): Promise<BulkApproveResult> {
    const approved: string[] = [];
    const failed: Array<{ id: string; reason: string }> = [];

    for (const id of ids) {
      try {
        await this.approve(id, approverId);
        approved.push(id);
      } catch (error) {
        failed.push({
          id,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { approved, failed };
  }
```

- [ ] **Step 4: Run tests**

Run: `npx nx test backend -- --testPathPattern=payment-approval.service`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/payment-approvals
git commit -m "feat(payment-approvals): bulk approve with per-row outcomes"
```

---

### Task 10: Controller

**Files:**
- Create: `apps/backend/src/modules/payment-approvals/controllers/payment-approval.controller.ts`
- Create: `apps/backend/src/modules/payment-approvals/controllers/index.ts`
- Modify: `apps/backend/src/modules/payment-approvals/payment-approval.module.ts`

**Interfaces:**
- Consumes: the service methods from Tasks 6–9.
- Produces: the HTTP surface used by Task 13.

Copy the decorator style from `apps/backend/src/modules/ledger/controllers/ledger.controller.ts`, including how it reads the current user id.

The authenticated user is obtained exactly as `ledger.controller.ts:137` does it:

```typescript
import { CurrentUser } from '../../auth/decorators';
import type { CurrentUserType } from '../../auth/types';
// then in a handler:  @CurrentUser() currentUser: CurrentUserType   →  currentUser.id
```

- [ ] **Step 1: Write the controller**

```typescript
import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { BulkApproveDto, QueryApprovalsDto, RejectApprovalDto, SubmitApprovalDto } from '../dto';
import { PaymentApprovalService } from '../services';

@ApiTags('Payment Approvals')
@Controller('payment-approvals')
export class PaymentApprovalController {
  constructor(private readonly service: PaymentApprovalService) {}

  @Post()
  async submit(@Body() dto: SubmitApprovalDto, @CurrentUser() currentUser: CurrentUserType) {
    return this.service.submit(dto, currentUser.id);
  }

  @Get()
  async list(@Query() query: QueryApprovalsDto) {
    return this.service.list(query);
  }

  // Declared before ':id' so the literal path is not swallowed by the param route.
  @Get('summary')
  async summary() {
    return this.service.summary();
  }

  @Get(':id')
  async getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getOne(id);
  }

  @Post('bulk-approve')
  async bulkApprove(@Body() dto: BulkApproveDto, @CurrentUser() currentUser: CurrentUserType) {
    return this.service.bulkApprove(dto.ids, currentUser.id);
  }

  @Post(':id/approve')
  async approve(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: CurrentUserType) {
    return this.service.approve(id, currentUser.id);
  }

  @Post(':id/reject')
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectApprovalDto,
    @CurrentUser() currentUser: CurrentUserType,
  ) {
    return this.service.reject(id, dto.reason, currentUser.id);
  }

  @Post(':id/cancel')
  async cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: CurrentUserType) {
    return this.service.cancel(id, currentUser.id);
  }
}
```

- [ ] **Step 3: Add `getOne` to the service**

```typescript
  /** Includes possible duplicates so the review screen can warn about them. */
  async getOne(id: string): Promise<PendingLedgerEntryEntity & { possibleDuplicates: PendingLedgerEntryEntity[] }> {
    const row = await this.dataSource
      .getRepository(PendingLedgerEntryEntity)
      .findOne({ where: { id } });
    if (!row) throw new NotFoundException('Approval request not found');

    const possibleDuplicates = (
      await this.findDuplicates(row.projectId, row.amountPaise, row.valueDate)
    ).filter((d) => d.id !== row.id);

    return { ...row, possibleDuplicates };
  }
```

- [ ] **Step 4: Add the milestone impact preview**

The spec requires the approver to see which milestones a payment would settle
*before* agreeing to it. Compute it with the same domain function the real write
uses, but never commit it.

Add to the service:

```typescript
import { allocateWaterfall } from '../../ledger/domain/allocation';

export interface ImpactLine {
  milestoneId: string;
  milestoneName: string;
  appliedPaise: number;
  balanceAfterPaise: number;
  settlesFully: boolean;
}

  /**
   * What approving this would do, computed with `allocateWaterfall` — the same
   * function the real write uses, so the preview cannot drift from the outcome.
   * Read-only: no locks, nothing committed.
   *
   * This is a preview at the current moment. The binding allocation is computed
   * again inside `approve`, because balances can move between viewing and
   * approving.
   */
  async previewImpact(id: string): Promise<{ lines: ImpactLine[]; unallocatedPaise: number }> {
    const row = await this.dataSource
      .getRepository(PendingLedgerEntryEntity)
      .findOne({ where: { id } });
    if (!row) throw new NotFoundException('Approval request not found');

    if (row.kind !== 'receipt') return { lines: [], unallocatedPaise: 0 };

    const balances = await this.ledgerRepository.getMilestoneBalances(row.projectId);
    const active = balances.filter((b) => b.status === 'active');

    const result = allocateWaterfall(
      row.amountPaise,
      active.map((b) => ({ milestoneId: b.milestoneId, capacityPaise: b.balancePaise })),
    );

    const byId = new Map(active.map((b) => [b.milestoneId, b]));
    return {
      lines: result.allocations.map((a) => {
        const m = byId.get(a.milestoneId);
        return {
          milestoneId: a.milestoneId,
          milestoneName: m?.milestoneName ?? 'Milestone',
          appliedPaise: a.amountPaise,
          balanceAfterPaise: (m?.balancePaise ?? 0) - a.amountPaise,
          settlesFully: (m?.balancePaise ?? 0) === a.amountPaise,
        };
      }),
      unallocatedPaise: result.unallocatedPaise,
    };
  }
```

Inject `LedgerRepository` into the constructor. Confirm the exact field names on
`MilestoneCapacity`, `AllocationResult` and `MilestoneBalanceRow` by reading
`ledger/domain/allocation.ts:23-50` and `ledger/repositories/ledger.repository.ts:158`,
and adjust the property names above to match.

Add the controller route, declared **before** `@Get(':id')`:

```typescript
  @Get(':id/impact')
  async impact(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.previewImpact(id);
  }
```

Add a test asserting a payment larger than all outstanding milestones reports the
excess as `unallocatedPaise` rather than over-allocating.

- [ ] **Step 5: Register the controller and verify routes**

Add `PaymentApprovalController` to `controllers` in the module. Start the backend and confirm the log lists `/api/v1/payment-approvals` routes, with `summary` mapped before `:id`.

Run: `npx nx serve backend`
Expected: `Mapped {/api/v1/payment-approvals/summary, GET}` appears.

- [ ] **Step 6: Smoke test each endpoint**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -H "authorization: Bearer $TOKEN" \
  http://localhost:8085/api/v1/payment-approvals/summary
```
Expected: `200`.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/modules/payment-approvals
git commit -m "feat(payment-approvals): add REST controller and impact preview"
```

---

### Task 11: Route ledger writes through approval

**The security-critical task.** After this, no HTTP route writes to the ledger directly.

**Files:**
- Modify: `apps/backend/src/modules/ledger/controllers/ledger.controller.ts:127` (receipts), `:144` (expenses), `:190` (reverse)
- Modify: `apps/backend/src/modules/ledger/ledger.module.ts` (import `PaymentApprovalModule`)

**Interfaces:**
- Consumes: `PaymentApprovalService.submit` (Task 6).
- Produces: the three endpoints now return a `PendingLedgerEntryEntity` instead of a `LedgerEntryEntity`. Task 13 depends on this changed response shape.

> **Watch for a circular import.** `PaymentApprovalModule` imports `LedgerModule`. Having `LedgerModule` import `PaymentApprovalModule` back creates a cycle. Resolve it with `forwardRef(() => PaymentApprovalModule)` on the ledger side and `forwardRef(() => LedgerModule)` on the approval side, and inject with `@Inject(forwardRef(() => PaymentApprovalService))`. Verify the app boots before moving on.

- [ ] **Step 1: Write the failing test**

```typescript
it('creates a pending row rather than a ledger entry', async () => {
  const result = await controller.recordReceipt(PROJECT, { amountPaise: 50_000 }, USER);
  expect(result.status).toBe('pending');
  expect(approvalService.submit).toHaveBeenCalled();
  expect(ledgerWrite.recordReceipt).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx nx test backend -- --testPathPattern=ledger.controller`
Expected: FAIL.

- [ ] **Step 3: Change the three handlers**

Replace each body so it delegates. For receipts:

```typescript
  @Post('projects/:projectId/ledger/receipts')
  async recordReceipt(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: RecordReceiptDto,
    @CurrentUser() currentUser: CurrentUserType,
  ) {
    // Money no longer lands in the ledger here. It queues for approval, and the
    // approver's action is what inserts the ledger row. Leaving a direct write
    // path in place would be an unguarded hole through the control.
    return this.approvals.submit(
      {
        kind: 'receipt',
        projectId,
        amountPaise: dto.amountPaise,
        valueDate: dto.valueDate,
        paymentMethod: dto.paymentMethod,
        reference: dto.reference,
        notes: dto.notes,
        customerId: dto.customerId,
      },
      userId,
    );
  }
```

Do the same for expenses (`kind: 'expense'`, passing `category` and `payee` as `counterparty`) and for reverse (`kind: 'reversal'`, passing `reversesEntryId: entryId` and `reversalReason: dto.reason`).

- [ ] **Step 4: Handle the proof document**

The current receipt path accepts a `proofDocument` and attaches it inside the write transaction. Since there is no ledger entry yet, upload it first and pass the resulting id as `proofDocumentId`. Read how `attachProof` stores it in `ledger-write.service.ts:234`, then store the document at submit time and keep the id on the pending row.

- [ ] **Step 5: Verify no direct write path remains**

```bash
grep -rn "writeService\.\(recordReceipt\|recordExpense\|reverse\)" apps/backend/src/modules/ledger/controllers/
```
Expected: no matches. If any remain, they are unguarded holes — remove them.

- [ ] **Step 6: Run the suite and boot the app**

Run: `npx nx test backend`
Expected: PASS.

Run: `npx nx serve backend`
Expected: boots with no circular-dependency error.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/modules/ledger
git commit -m "feat(ledger): route record endpoints through payment approval"
```

---

### Task 12: Web — routes, nav and data hooks

**Files:**
- Modify: `apps/web/lib/config/routes.ts:137`
- Modify: `apps/web/lib/config/navigation.ts:373`
- Create: `apps/web/lib/hooks/resources/payment-approvals.ts`

**Interfaces:**
- Consumes: the endpoints from Task 10.
- Produces: `usePaymentApprovals`, `usePaymentApproval`, `useApprovalImpact`, `useApprovalSummary`, `useApprovalMutations`, and the `PaymentApproval` / `ImpactLine` types. Used by Tasks 13–15.

- [ ] **Step 1: Add the route**

In `routes.ts`, inside `FINANCE`:

```typescript
    APPROVALS: '/finance/approvals',
```

And in the panel-key map near line 444:

```typescript
  [ROUTES.FINANCE.APPROVALS]: 'finance',
```

- [ ] **Step 2: Add the nav item**

In `navigation.ts`, in the finance panel's `MONEY` section items array, after `finance-receivables`:

```typescript
            {
              id: 'finance-approvals',
              icon: ShieldCheck,
              label: 'Payment Approvals',
              href: ROUTES.FINANCE.APPROVALS,
            },
```

Import `ShieldCheck` from `lucide-react` alongside the existing icon imports.

- [ ] **Step 3: Write the hooks**

Follow the shape of `lib/hooks/resources/ledger.ts` — same `apiClient`, `showToast` and `getErrorMessage` imports.

```typescript
'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/utils/errors';
import { showToast } from '@/lib/utils/toast';

export type ApprovalKind = 'receipt' | 'expense' | 'reversal';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface PaymentApproval {
  id: string;
  requestNo: string;
  kind: ApprovalKind;
  status: ApprovalStatus;
  projectId: string;
  customerId?: string | null;
  amountPaise: number;
  valueDate: string;
  paymentMethod?: string | null;
  counterparty?: string | null;
  category?: string | null;
  reference?: string | null;
  notes?: string | null;
  proofDocumentId?: string | null;
  reversesEntryId?: string | null;
  reversalReason?: string | null;
  submittedBy: string;
  submittedAt: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  ledgerEntryId?: string | null;
  possibleDuplicates?: PaymentApproval[];
}

export interface ApprovalFilters {
  status?: ApprovalStatus;
  kind?: ApprovalKind;
  projectId?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface BulkApproveResult {
  approved: string[];
  failed: Array<{ id: string; reason: string }>;
}

export const approvalKeys = {
  root: () => ['payment-approvals'] as const,
  list: (f: ApprovalFilters) => [...approvalKeys.root(), 'list', f] as const,
  one: (id: string) => [...approvalKeys.root(), 'one', id] as const,
  summary: () => [...approvalKeys.root(), 'summary'] as const,
};

export function usePaymentApprovals(
  filters: ApprovalFilters = {},
): UseQueryResult<{ data: PaymentApproval[]; total: number; page: number; limit: number }> {
  return useQuery({
    queryKey: approvalKeys.list(filters),
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get('/payment-approvals', { params: filters, signal });
      return data;
    },
    staleTime: 15_000,
  });
}

export function usePaymentApproval(id: string | null): UseQueryResult<PaymentApproval> {
  return useQuery({
    queryKey: approvalKeys.one(id ?? ''),
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<PaymentApproval>(`/payment-approvals/${id}`, { signal });
      return data;
    },
    enabled: Boolean(id),
  });
}

export interface ImpactLine {
  milestoneId: string;
  milestoneName: string;
  appliedPaise: number;
  balanceAfterPaise: number;
  settlesFully: boolean;
}

/** Preview only — the binding allocation is recomputed inside approve(). */
export function useApprovalImpact(
  id: string | null,
): UseQueryResult<{ lines: ImpactLine[]; unallocatedPaise: number }> {
  return useQuery({
    queryKey: [...approvalKeys.one(id ?? ''), 'impact'],
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get(`/payment-approvals/${id}/impact`, { signal });
      return data;
    },
    enabled: Boolean(id),
  });
}

export function useApprovalSummary(): UseQueryResult<{ pendingCount: number }> {
  return useQuery({
    queryKey: approvalKeys.summary(),
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get('/payment-approvals/summary', { signal });
      return data;
    },
    staleTime: 30_000,
  });
}

export function useApprovalMutations() {
  const queryClient = useQueryClient();
  // Approval moves money, so the ledger caches are now stale too.
  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: approvalKeys.root() });
    void queryClient.invalidateQueries({ queryKey: ['ledger'] });
    void queryClient.invalidateQueries({ queryKey: ['finance-org'] });
  };

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post<PaymentApproval>(`/payment-approvals/${id}/approve`);
      return data;
    },
    onSuccess: (row) => {
      invalidate();
      showToast.success(`${row.requestNo} approved — the customer's balance is updated`);
    },
    onError: (error) => showToast.error(getErrorMessage(error)),
  });

  const reject = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data } = await apiClient.post<PaymentApproval>(
        `/payment-approvals/${id}/reject`,
        { reason },
      );
      return data;
    },
    onSuccess: (row) => {
      invalidate();
      showToast.success(`${row.requestNo} rejected`);
    },
    onError: (error) => showToast.error(getErrorMessage(error)),
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post<PaymentApproval>(`/payment-approvals/${id}/cancel`);
      return data;
    },
    onSuccess: () => {
      invalidate();
      showToast.success('Submission withdrawn');
    },
    onError: (error) => showToast.error(getErrorMessage(error)),
  });

  const bulkApprove = useMutation({
    mutationFn: async (ids: string[]) => {
      const { data } = await apiClient.post<BulkApproveResult>('/payment-approvals/bulk-approve', {
        ids,
      });
      return data;
    },
    onSuccess: (result) => {
      invalidate();
      if (result.failed.length === 0) {
        showToast.success(`${result.approved.length} approved`);
      } else {
        showToast.error(
          `${result.approved.length} approved, ${result.failed.length} failed: ${result.failed[0]?.reason ?? ''}`,
        );
      }
    },
    onError: (error) => showToast.error(getErrorMessage(error)),
  });

  return { approve, reject, cancel, bulkApprove };
}
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck:web`
Expected: no errors. Confirm `getErrorMessage` and `showToast` import paths match those used in `ledger.ts`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib
git commit -m "feat(web): payment approval routes, nav and hooks"
```

---

### Task 13: Web — the approvals page

**Files:**
- Create: `apps/web/app/(dashboard)/finance/approvals/page.tsx`
- Create: `apps/web/components/features/payment-approvals/payment-approvals-page.tsx`
- Create: `apps/web/components/features/payment-approvals/columns.tsx`
- Create: `apps/web/components/features/payment-approvals/index.ts`

**Interfaces:**
- Consumes: hooks from Task 12; `AdvancedTable` from `@/components/shared/advanced-table`; `MUIStatusChip` from `@/components/ui`.
- Produces: `PaymentApprovalsPage`, and `approvalColumns(onReview)` returning `ColumnConfig<PaymentApproval>[]`. Used by Task 14.

- [ ] **Step 1: Read the reference implementations**

Open `apps/web/components/features/quotes/components/quote-list-page.tsx` for how `AdvancedTable` is wired (columns, server pagination, bulk actions) and `apps/web/components/features/ledger/finance-receivables-page.tsx` for the finance page shell and `formatPaise` usage. Match both.

- [ ] **Step 2: Write the route file**

`app/(dashboard)/finance/approvals/page.tsx`:

```typescript
import { type JSX } from 'react';

import { PaymentApprovalsPage } from '@/components/features/payment-approvals';

export default function FinanceApprovalsPage(): JSX.Element {
  return <PaymentApprovalsPage />;
}
```

- [ ] **Step 3: Write the columns**

```typescript
'use client';

import { Button } from '@mui/material';
import { type JSX } from 'react';

import { MUIStatusChip } from '@/components/ui';
import type { ColumnConfig } from '@/components/shared/advanced-table';
import { formatPaise } from '@/lib/utils/paise';
import type { PaymentApproval } from '@/lib/hooks/resources/payment-approvals';

const STATUS_TONE: Record<PaymentApproval['status'], string> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  cancelled: 'default',
};

/** Elapsed time since submission. Only meaningful while a row is pending. */
function ageLabel(submittedAt: string): string {
  const hours = Math.floor((Date.now() - new Date(submittedAt).getTime()) / 3_600_000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function approvalColumns(
  onReview: (row: PaymentApproval) => void,
): ColumnConfig<PaymentApproval>[] {
  return [
    { field: 'requestNo', headerName: 'Request #', searchable: true, width: 170 },
    { field: 'valueDate', headerName: 'Payment date', type: 'date', filterable: true, filterType: 'date' },
    {
      field: 'kind',
      headerName: 'Type',
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { label: 'Receipt', value: 'receipt' },
        { label: 'Expense', value: 'expense' },
        { label: 'Reversal', value: 'reversal' },
      ],
    },
    {
      field: 'amountPaise',
      headerName: 'Amount',
      type: 'number',
      renderCell: ({ row }) => formatPaise(row.amountPaise),
    },
    { field: 'reference', headerName: 'Reference', searchable: true },
    {
      field: 'submittedAt',
      headerName: 'Age',
      renderCell: ({ row }) => (row.status === 'pending' ? ageLabel(row.submittedAt) : '—'),
    },
    {
      field: 'status',
      headerName: 'Status',
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { label: 'Pending', value: 'pending' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
      renderCell: ({ row }) => (
        <MUIStatusChip label={row.status} status={STATUS_TONE[row.status]} />
      ),
    },
    {
      field: 'actions',
      headerName: '',
      sortable: false,
      actions: (row) => (
        <Button size="small" onClick={() => onReview(row)}>
          Review
        </Button>
      ),
    },
  ];
}
```

Confirm `MUIStatusChip`'s actual prop names by reading `apps/web/components/ui/mui-status-chip.tsx` and adjust if they differ.

- [ ] **Step 4: Write the page**

```typescript
'use client';

import { Card } from '@mui/material';
import { type JSX, useMemo, useState } from 'react';

import { AdvancedTable } from '@/components/shared/advanced-table';
import { FilterTabs } from '@/components/shared/filters';
import {
  usePaymentApprovals,
  useApprovalMutations,
  type ApprovalStatus,
  type PaymentApproval,
} from '@/lib/hooks/resources/payment-approvals';
import { useAuth } from '@/providers/auth-provider';

import { approvalColumns } from './columns';
import { ApprovalReviewDrawer } from './approval-review-drawer';

const TABS: Array<{ label: string; value: ApprovalStatus }> = [
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

export function PaymentApprovalsPage(): JSX.Element {
  const { user } = useAuth();
  const [status, setStatus] = useState<ApprovalStatus>('pending');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<PaymentApproval | null>(null);

  const query = usePaymentApprovals({ status, page, limit: 25 });
  const { bulkApprove } = useApprovalMutations();

  const columns = useMemo(() => approvalColumns(setSelected), []);
  const rows = query.data?.data ?? [];

  return (
    <div className="flex flex-col gap-4 p-4">
      <FilterTabs tabs={TABS} value={status} onChange={(v) => { setStatus(v); setPage(1); }} />

      <Card>
        <AdvancedTable
          rows={rows}
          columns={columns}
          loading={query.isLoading}
          paginationMode="server"
          totalRowCount={query.data?.total ?? 0}
          page={page}
          onPageChange={setPage}
          bulkActions={
            status === 'pending'
              ? [
                  {
                    label: 'Approve selected',
                    color: 'success',
                    // Your own submissions cannot be approved by you; filtering
                    // here keeps the button honest, and the server rejects them
                    // regardless.
                    onClick: (selectedRows: PaymentApproval[]) =>
                      bulkApprove.mutate(
                        selectedRows
                          .filter((r) => r.submittedBy !== user?.id)
                          .map((r) => r.id),
                      ),
                  },
                ]
              : []
          }
        />
      </Card>

      <ApprovalReviewDrawer
        approvalId={selected?.id ?? null}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
```

Adjust `AdvancedTable`'s prop names to match `components/shared/advanced-table/types.ts` — read it and use the real names rather than the ones above if they differ.

- [ ] **Step 5: Verify in the browser**

Start the web app and open `http://localhost:3001/finance/approvals`. Confirm the nav shows "Payment Approvals" under Finance, tabs switch, and the table renders without console errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app apps/web/components/features/payment-approvals
git commit -m "feat(web): payment approvals queue page"
```

---

### Task 14: Web — the review drawer

**Files:**
- Create: `apps/web/components/features/payment-approvals/approval-review-drawer.tsx`
- Modify: `apps/web/components/features/payment-approvals/index.ts`

**Interfaces:**
- Consumes: `usePaymentApproval`, `useApprovalImpact`, `useApprovalMutations` (Task 12).
- Produces: `ApprovalReviewDrawer({ approvalId, onClose })`. Used by Task 13.

- [ ] **Step 1: Read the drawer component**

Open `apps/web/components/shared/drawers/drill-down-drawer.tsx` and note its exact props.

- [ ] **Step 2: Write the drawer**

```typescript
'use client';

import { Alert, Button, Divider, Stack, TextField } from '@mui/material';
import { type JSX, useState } from 'react';

import { DrillDownDrawer } from '@/components/shared/drawers';
import { MUITypography } from '@/components/ui';
import {
  usePaymentApproval,
  useApprovalImpact,
  useApprovalMutations,
} from '@/lib/hooks/resources/payment-approvals';
import { formatPaise } from '@/lib/utils/paise';
import { useAuth } from '@/providers/auth-provider';

interface Props {
  approvalId: string | null;
  onClose: () => void;
}

export function ApprovalReviewDrawer({ approvalId, onClose }: Props): JSX.Element | null {
  const { user } = useAuth();
  const { data, isLoading } = usePaymentApproval(approvalId);
  const impact = useApprovalImpact(approvalId);
  const { approve, reject } = useApprovalMutations();
  const [reason, setReason] = useState('');

  if (!approvalId) return null;

  const isOwn = data?.submittedBy === user?.id;
  const isPending = data?.status === 'pending';
  const busy = approve.isPending || reject.isPending;

  return (
    <DrillDownDrawer open onClose={onClose} title={data?.requestNo ?? 'Review'}>
      {isLoading || !data ? null : (
        <Stack spacing={2} className="p-4">
          <MUITypography variant="h5">{formatPaise(data.amountPaise)}</MUITypography>
          <MUITypography variant="body2">
            Paid on {data.valueDate} · {data.paymentMethod ?? 'method not recorded'}
            {data.reference ? ` · ${data.reference}` : ''}
          </MUITypography>

          {data.possibleDuplicates && data.possibleDuplicates.length > 0 && (
            <Alert severity="warning">
              {data.possibleDuplicates.length} other payment(s) with the same amount and date
              exist for this project. Check this is not a double entry.
            </Alert>
          )}

          {!data.proofDocumentId && (
            <Alert severity="info">
              No proof of payment was attached. Confirm by another means before approving.
            </Alert>
          )}

          <Divider />

          {/* The consequence, shown before the approver commits to it. */}
          {impact.data && impact.data.lines.length > 0 && (
            <Stack spacing={0.5}>
              <MUITypography variant="subtitle2">If approved, this settles</MUITypography>
              {impact.data.lines.map((line) => (
                <MUITypography key={line.milestoneId} variant="body2">
                  {line.milestoneName}: {formatPaise(line.appliedPaise)}
                  {line.settlesFully
                    ? ' — fully settled'
                    : ` — ${formatPaise(line.balanceAfterPaise)} still due`}
                </MUITypography>
              ))}
              {impact.data.unallocatedPaise > 0 && (
                <Alert severity="info">
                  {formatPaise(impact.data.unallocatedPaise)} exceeds what is currently due
                  and will be held as credit against future milestones.
                </Alert>
              )}
            </Stack>
          )}

          <Divider />

          {isOwn && isPending && (
            <Alert severity="info">
              You submitted this payment — another user must approve it.
            </Alert>
          )}

          {isPending && !isOwn && (
            <Stack spacing={2}>
              <Button
                variant="contained"
                color="success"
                disabled={busy}
                onClick={() => approve.mutate(data.id, { onSuccess: onClose })}
              >
                Approve — this updates the customer&apos;s balance
              </Button>

              <TextField
                label="Reason for rejection"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                multiline
                minRows={2}
                size="small"
              />
              <Button
                variant="outlined"
                color="error"
                disabled={busy || reason.trim().length < 3}
                onClick={() =>
                  reject.mutate({ id: data.id, reason }, { onSuccess: onClose })
                }
              >
                Reject
              </Button>
            </Stack>
          )}

          {data.status === 'rejected' && (
            <Alert severity="error">Rejected: {data.rejectionReason}</Alert>
          )}
        </Stack>
      )}
    </DrillDownDrawer>
  );
}
```

- [ ] **Step 3: Verify the four-eyes UI**

In the browser, open a request you submitted. Confirm the Approve button is absent and the explanatory alert shows. Open one submitted by another user and confirm Approve is enabled.

- [ ] **Step 4: Verify reject requires a reason**

Confirm the Reject button stays disabled until at least 3 characters are entered.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/features/payment-approvals
git commit -m "feat(web): approval review drawer"
```

---

### Task 15: Web — record dialog and project finance tab

**Files:**
- Modify: `apps/web/components/features/ledger/record-money-dialog.tsx`
- Modify: `apps/web/lib/hooks/resources/ledger.ts:397-436` (the three mutation `onSuccess` handlers)
- Modify: the project finance tab component that renders ledger entries (locate with the grep in Step 1)

**Interfaces:**
- Consumes: `usePaymentApprovals` (Task 12).
- Produces: no new exports.

- [ ] **Step 1: Locate the finance tab component**

```bash
grep -rln "useProjectLedger\|useProjectEntries" apps/web/components/features/projects apps/web/components/features/ledger
```
Use the component that renders the project Finance tab at `/projects/:id?tab=finance`.

- [ ] **Step 2: Fix the now-wrong toasts**

The three mutations in `ledger.ts` say "Receipt ${entry.entryNo} recorded". After Task 11 the response is a pending row with no `entryNo`, so this would print `undefined`. Replace:

```typescript
    onSuccess: (row) => {
      invalidate();
      showToast.success(
        `${row.requestNo} submitted for approval — the balance updates once approved`,
      );
    },
```

Apply the same change to `recordExpense` and `reverseEntry`, and change the mutation response types from `LedgerEntry` to `PaymentApproval`.

- [ ] **Step 3: Change the dialog's call to action**

In `record-money-dialog.tsx`, change the submit button label from its current text to **"Submit for approval"**, and add helper text under it:

```tsx
<MUITypography variant="caption">
  This is sent for verification. The customer&apos;s balance changes only after approval.
</MUITypography>
```

- [ ] **Step 4: Add the double-submit guard**

Add an in-flight ref, matching the pattern in `apps/web/components/features/ledger/hooks/use-receipt-pdf.ts`:

```typescript
  const inFlight = useRef(false);

  const handleSubmit = async (): Promise<void> => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      // existing submit logic
    } finally {
      inFlight.current = false;
    }
  };
```

- [ ] **Step 5: Add the "Awaiting approval" block**

In the finance tab, above the existing entries table:

```tsx
const pending = usePaymentApprovals({ projectId, status: 'pending' });

{(pending.data?.data.length ?? 0) > 0 && (
  <Card className="border-l-4 border-amber-500">
    <div className="p-4">
      <MUITypography variant="subtitle2">
        Awaiting approval ({pending.data?.data.length})
      </MUITypography>
      <MUITypography variant="caption">
        Not included in Received or Outstanding below.
      </MUITypography>
      {/* list requestNo, valueDate, formatPaise(amountPaise) per row */}
    </div>
  </Card>
)}
```

- [ ] **Step 6: Verify the totals do not move**

Open a project's Finance tab and note Received and Outstanding. Submit a payment. Confirm it appears under "Awaiting approval" and **both totals are unchanged**. This is the feature's core promise.

- [ ] **Step 7: Commit**

```bash
git add apps/web/components apps/web/lib/hooks/resources/ledger.ts
git commit -m "feat(web): submit for approval from the project finance tab"
```

---

### Task 16: End-to-end verification

Exercising this through the UI, not the API. The defect found in the previous QA pass was precisely a UI flow that had only been tested through the API.

**Files:**
- Create: `docs/superpowers/plans/2026-08-13-payment-approval-verification.md` (the filled-in results)

- [ ] **Step 1: Confirm the invariant with real figures**

On a test project, record the exact values of Received and Outstanding. Submit a receipt through the UI. Query the database directly:

```bash
docker exec -i oneohm-postgres psql -U postgres -d oneohm -c \
  "SELECT * FROM v_project_balance WHERE project_id = '<id>';"
```
Expected: **identical** to before submission. A pending row must move nothing.

- [ ] **Step 2: Four-eyes, through the UI**

As the submitting user, open the request in `/finance/approvals`. Expected: no Approve button, explanatory alert shown.

- [ ] **Step 3: Approve as a second user**

Log in as a different user, approve, and confirm: the ledger row now exists, Outstanding drops by exactly the amount, and `value_date` is the **payment** date not the approval date.

```bash
docker exec -i oneohm-postgres psql -U postgres -d oneohm -c \
  "SELECT entry_no, value_date, amount_paise FROM ledger_entries ORDER BY created_at DESC LIMIT 1;"
```

- [ ] **Step 4: Receipt availability**

Confirm the Receipt button was absent before approval and generates exactly **one** document after. Click it once and verify only one document is filed.

- [ ] **Step 5: Rejection and reversal**

Submit and reject one payment; confirm no ledger row was created. Submit a reversal of the approved entry, approve it, and confirm the balance returns. Then submit a second reversal of the same entry and confirm it is refused.

- [ ] **Step 6: Bulk approve with a deliberate failure**

Select three pending rows, one of which you submitted. Approve in bulk. Expected: two approved, one reported as failed with a readable reason — not a total failure.

- [ ] **Step 7: Full suite**

```bash
npx nx test backend && npm run typecheck:backend && npm run typecheck:web && npx nx lint backend && npx nx lint web
```
Expected: all pass.

- [ ] **Step 8: Record results and commit**

Write each step's actual observed result into the verification document — real numbers, not "works". Commit.

```bash
git add docs/superpowers/plans/2026-08-13-payment-approval-verification.md
git commit -m "docs: payment approval end-to-end verification results"
```
