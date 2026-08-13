import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  DocumentCategory,
  DocumentEntityType,
  DocumentTag,
  FinanceSequenceScope,
} from '@tejas96/shared/types';
import { DataSource, EntityManager } from 'typeorm';

import { assertMoneyWritesAllowed } from '../../../common/utils';
import { DocumentEntity } from '../../documents/entities/document.entity';
import { SequenceService } from '../../finance-common/services/sequence.service';
import {
  type Allocation,
  allocateWaterfall,
  assertValidManualAllocation,
} from '../domain/allocation';
import { isFutureIst, toIsoDate, todayIst } from '../domain/dates';
import { LedgerAllocationEntity, LedgerEntryEntity } from '../entities';
import { LedgerRepository } from '../repositories/ledger.repository';

export interface ProofDocumentInput {
  fileKey: string;
  fileName: string;
  mimeType: string;
  fileSize?: number;
}

export interface RecordReceiptInput {
  projectId: string;
  amountPaise: number;
  valueDate?: string;
  paymentMethod?: string;
  reference?: string;
  notes?: string;
  customerId?: string | null;
  /** Omit to auto-allocate by FIFO waterfall. Supply to override. */
  allocations?: Allocation[];
  proofDocument?: ProofDocumentInput;
}

/**
 * The insertable column set of a ledger entry.
 *
 * Relations are excluded on purpose, so an accidentally hydrated entity cannot
 * be passed to `insert()`. Columns with database defaults (`value_date_is_inferred`)
 * and every nullable detail column are optional.
 */
type LedgerEntryValues = Pick<
  LedgerEntryEntity,
  'projectId' | 'entryNo' | 'entryType' | 'direction' | 'amountPaise' | 'valueDate' | 'createdBy'
> &
  Partial<
    Pick<
      LedgerEntryEntity,
      | 'customerId'
      | 'valueDateIsInferred'
      | 'paymentMethod'
      | 'counterparty'
      | 'category'
      | 'reference'
      | 'notes'
      | 'sourceTable'
      | 'sourceId'
      | 'reversesId'
      | 'reversalReason'
    >
  >;

export interface RecordExpenseInput {
  projectId: string;
  amountPaise: number;
  valueDate?: string;
  category: string;
  payee?: string;
  paymentMethod?: string;
  notes?: string;
  proofDocument?: ProofDocumentInput;
}

/**
 * The ledger write path. Replaces `ReceiptService` and `ProjectExpenseService`.
 *
 * Three properties hold for every method here:
 *
 *  1. **Append-only.** Nothing is ever UPDATEd or DELETEd — the database
 *     enforces it (migration 1851000000006), so a mistake here fails loudly
 *     rather than silently corrupting history.
 *  2. **No cached balances.** There is no `paid_amount` to keep in sync, which
 *     is what let the old model drift: `POST /receipts` maintained the cache and
 *     the legacy `PATCH /payments/:id` did not.
 *  3. **One allocation rule.** `allocateWaterfall` is the same unit-tested pure
 *     function the migration's differential oracle checks the SQL against, so a
 *     receipt recorded today allocates exactly as a migrated one did.
 */
@Injectable()
export class LedgerWriteService {
  private readonly logger = new Logger(LedgerWriteService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly ledgerRepository: LedgerRepository,
    private readonly sequenceService: SequenceService,
  ) {}

  /**
   * Record money in.
   *
   * Runs in one transaction. Milestone rows are locked `FOR UPDATE` before
   * capacities are read, so two concurrent receipts cannot both see the same
   * free capacity and jointly over-allocate a milestone.
   *
   * Any amount that does not fit the remaining milestones stays **unallocated**
   * and surfaces as customer credit on `v_project_balance` — never forced onto
   * the last milestone and never silently dropped.
   */
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
      const balances = await this.ledgerRepository.getMilestoneBalances(
        input.projectId,
        manager,
        true, // FOR UPDATE — the actual concurrency mechanism
      );

      const active = balances.filter((b) => b.status === 'active');

      // Domain functions throw plain Errors; Nest maps those to a generic 500.
      // A client sending a bad allocation deserves an actionable 400 — the
      // frontend is being written against this API.
      let allocations: Allocation[];
      try {
        if (input.allocations) {
          assertValidManualAllocation(
            input.allocations,
            input.amountPaise,
            new Set(active.map((b) => b.milestoneId)),
            new Map(active.map((b) => [b.milestoneId, b.balancePaise])),
          );
          allocations = input.allocations;
        } else {
          allocations = allocateWaterfall(
            active.map((b) => ({ milestoneId: b.milestoneId, capacityPaise: b.balancePaise })),
            input.amountPaise,
          ).allocations;
        }
      } catch (error) {
        throw new BadRequestException((error as Error).message);
      }

      const entry = await this.insertEntry(manager, {
        projectId: input.projectId,
        customerId: input.customerId ?? null,
        entryNo: await this.sequenceService.getNextNumber(FinanceSequenceScope.RECEIPT, manager),
        entryType: 'receipt',
        direction: 'in',
        amountPaise: input.amountPaise,
        valueDate,
        paymentMethod: input.paymentMethod ?? null,
        reference: input.reference ?? null,
        notes: input.notes ?? null,
        createdBy,
      });

      await this.insertAllocations(manager, entry, allocations, createdBy);
      await this.attachProof(manager, entry, input.proofDocument, createdBy);

      const unallocated =
        input.amountPaise - allocations.reduce((sum, a) => sum + a.amountPaise, 0);
      if (unallocated > 0) {
        this.logger.log(
          `Receipt ${entry.entryNo}: ${unallocated} paise unallocated (project credit) on project ${input.projectId}`,
        );
      }

      return entry;
    });
  }

  /**
   * Record money out. Expenses carry no allocations — they are not receivable
   * against a milestone, and they never change what the customer owes.
   */
  async recordExpense(
    input: RecordExpenseInput,
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
        entryNo: await this.sequenceService.getNextNumber(FinanceSequenceScope.EXPENSE, manager),
        entryType: 'expense',
        direction: 'out',
        // money out is stored negative so SUM over the ledger is the cash position
        amountPaise: -input.amountPaise,
        valueDate,
        paymentMethod: input.paymentMethod ?? null,
        counterparty: input.payee ?? null,
        category: input.category,
        notes: input.notes ?? null,
        createdBy,
      }).then(async (entry) => {
        await this.attachProof(manager, entry, input.proofDocument, createdBy);
        return entry;
      }),
    );
  }

  /**
   * Attach proof to an entry, inside the same transaction.
   *
   * Reuses the existing polymorphic `documents` table and the S3 presigned
   * upload the client has already completed — the file is in storage by the time
   * this runs, so all that is recorded here is the link.
   *
   * Transactional on purpose: a receipt that claims to have proof but whose
   * document row failed to write is worse than one openly recorded without it.
   */
  private async attachProof(
    manager: EntityManager,
    entry: LedgerEntryEntity,
    proof: ProofDocumentInput | undefined,
    createdBy: string,
  ): Promise<void> {
    if (!proof) return;

    // `documents.property_id` is NOT NULL, and a ledger entry only knows its
    // project — resolve the property through it.
    const rows = await manager.query(`SELECT property_id FROM projects WHERE id = $1`, [
      entry.projectId,
    ]);
    const propertyId = rows[0]?.property_id as string | undefined;
    if (!propertyId) {
      throw new BadRequestException('Cannot attach proof: the project has no property');
    }

    await manager.getRepository(DocumentEntity).insert({
      propertyId,
      entityType: DocumentEntityType.LEDGER_ENTRY,
      entityId: entry.id,
      category: proof.mimeType.startsWith('image/')
        ? DocumentCategory.IMAGE
        : DocumentCategory.DOCUMENT,
      tag: entry.direction === 'in' ? DocumentTag.RECEIPT_PROOF : DocumentTag.EXPENSE_RECEIPT,
      fileName: proof.fileName,
      fileUrl: proof.fileKey,
      fileSizeBytes: proof.fileSize,
      mimeType: proof.mimeType,
      createdBy,
      updatedBy: createdBy,
    });
  }

  /**
   * Reverse an entry: a bounced cheque, or a plain data-entry mistake.
   *
   * Posts a NEW entry carrying the opposite sign with `reverses_id` set, plus
   * negative mirror allocations of the original's. Nothing is mutated, so the
   * original and the correction both remain visible forever — which is the audit
   * trail clients asked for.
   *
   * Kept as its own operation (and its own endpoint) so that when RBAC lands it
   * can be gated with a single decorator, without touching the recording path.
   */
  async reverse(
    entryId: string,
    reason: string,
    createdBy: string,
    externalManager?: EntityManager,
  ): Promise<LedgerEntryEntity> {
    this.assertWritesAllowed();
    if (!reason?.trim()) {
      throw new BadRequestException('A reversal reason is required');
    }

    return this.runInTransaction(externalManager, async (manager) => {
      const original = await this.ledgerRepository.findEntryById(entryId, manager);
      if (!original) {
        throw new NotFoundException(`Ledger entry ${entryId} not found`);
      }
      if (original.reversesId) {
        throw new ConflictException('Cannot reverse a reversal — reverse the original entry');
      }

      const existing = await this.ledgerRepository.findReversalOf(entryId, manager);
      if (existing) {
        throw new ConflictException(
          `Entry ${original.entryNo} is already reversed by ${existing.entryNo}`,
        );
      }

      const scope =
        original.direction === 'in' ? FinanceSequenceScope.RECEIPT : FinanceSequenceScope.EXPENSE;

      const reversal = await this.insertEntry(manager, {
        projectId: original.projectId,
        customerId: original.customerId ?? null,
        entryNo: await this.sequenceService.getNextNumber(scope, manager),
        entryType: original.entryType,
        direction: original.direction,
        amountPaise: -original.amountPaise,
        // The reversal is an event of TODAY, not a rewrite of the original's date.
        valueDate: todayIst(),
        paymentMethod: original.paymentMethod ?? null,
        reference: original.reference ?? null,
        reversesId: original.id,
        reversalReason: reason.trim(),
        createdBy,
      });

      const originalAllocations = await this.ledgerRepository.findAllocationsByEntry(
        original.id,
        manager,
      );
      await this.insertAllocations(
        manager,
        reversal,
        originalAllocations.map((a) => ({
          milestoneId: a.milestoneId,
          amountPaise: -a.amountPaise,
        })),
        createdBy,
      );

      return reversal;
    });
  }

  // ============================================
  // INTERNALS
  // ============================================

  /**
   * Column values only — never a hydrated entity. `insert()` is used rather than
   * `save()` because `save()` emits an UPDATE for an entity that already has an
   * id, and the append-only trigger rejects UPDATE.
   */
  private async insertEntry(
    manager: EntityManager,
    values: LedgerEntryValues,
  ): Promise<LedgerEntryEntity> {
    const repo = manager.getRepository(LedgerEntryEntity);
    const result = await repo.insert(values);
    const id = result.identifiers[0]?.id as string;
    return repo.findOneOrFail({ where: { id } });
  }

  private async insertAllocations(
    manager: EntityManager,
    entry: LedgerEntryEntity,
    allocations: Allocation[],
    createdBy: string,
  ): Promise<void> {
    if (allocations.length === 0) {
      return;
    }
    await manager.getRepository(LedgerAllocationEntity).insert(
      allocations.map((a) => ({
        entryId: entry.id,
        milestoneId: a.milestoneId,
        projectId: entry.projectId,
        amountPaise: a.amountPaise,
        isInferred: false,
        createdBy,
      })),
    );
  }

  /**
   * Cutover write freeze.
   *
   * During the migration window every ledger write must stop, or a receipt
   * recorded after the backfill snapshot is silently lost when the
   * reconciliation runs. `MAINTENANCE_MODE` cannot do this job — it is only
   * surfaced to the two mobile apps via `/app-config/version-check` and blocks
   * no web API write at all.
   *
   * Set `LEDGER_WRITES_FROZEN=true` for the window, and unset it after the gates
   * pass. Reads stay available throughout, so the app still renders.
   */
  /**
   * Ownership check — see `LedgerRepository.projectExists` for why the FK
   * alone is not a guard.
   */
  /**
   * Run `fn` inside the caller's transaction when one is supplied, otherwise
   * open our own.
   *
   * Payment approval needs the ledger insert and the pending-row stamp to commit
   * together. Without this the two would be separate transactions, and a crash
   * between them would leave money in the ledger that nothing records as
   * approved. Mirrors `SequenceService.getNextNumber(scope, manager?)`.
   */
  private runInTransaction<T>(
    externalManager: EntityManager | undefined,
    fn: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return externalManager ? fn(externalManager) : this.dataSource.transaction(fn);
  }

  private async assertProjectInOrg(projectId: string): Promise<void> {
    if (!(await this.ledgerRepository.projectExists(projectId))) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
  }

  private assertWritesAllowed(): void {
    assertMoneyWritesAllowed();
  }

  private resolveValueDate(supplied?: string): string {
    const date = supplied ? toIsoDate(supplied) : todayIst();
    if (isFutureIst(date)) {
      throw new BadRequestException(`Value date ${date} is in the future`);
    }
    return date;
  }

  private assertAmount(amountPaise: number): void {
    if (!Number.isInteger(amountPaise)) {
      throw new BadRequestException('Amount must be an integer number of paise');
    }
    if (amountPaise <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }
  }
}
