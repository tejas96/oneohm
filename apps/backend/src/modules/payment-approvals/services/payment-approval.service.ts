import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  DocumentCategory,
  DocumentEntityType,
  DocumentTag,
  ExpenseCategory,
  FinanceSequenceScope,
} from '@tejas96/shared/types';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { DocumentEntity } from '../../documents/entities/document.entity';
import { SequenceService } from '../../finance-common/services/sequence.service';
import { allocateWaterfall } from '../../ledger/domain/allocation';
import { isFutureIst, toIsoDate, todayIst } from '../../ledger/domain/dates';
import { LedgerEntryEntity } from '../../ledger/entities';
import { LedgerRepository } from '../../ledger/repositories/ledger.repository';
import { LedgerWriteService } from '../../ledger/services/ledger-write.service';
import { QueryApprovalsDto, SubmitApprovalDto } from '../dto';
import { PendingLedgerEntryEntity } from '../entities';

export interface BulkApproveResult {
  approved: string[];
  failed: Array<{ id: string; reason: string }>;
}

export interface ImpactLine {
  milestoneId: string;
  milestoneName: string;
  appliedPaise: number;
  balanceAfterPaise: number;
  settlesFully: boolean;
}

/** How far back duplicate detection looks. A warning, never a block. */
const DUPLICATE_WINDOW_HOURS = 24;

/** Postgres unique_violation. */
const PG_UNIQUE_VIOLATION = '23505';

function isUniqueViolation(error: unknown, constraint: string): boolean {
  const e = error as { code?: string; constraint?: string } | null;
  return e?.code === PG_UNIQUE_VIOLATION && e.constraint === constraint;
}

/**
 * Verification in front of every ledger write.
 *
 * Submitting records a claim. Approving is what actually puts money in the
 * ledger. Nothing in `pending_ledger_entries` counts towards any balance, so
 * between those two moments the customer's outstanding is unchanged.
 */
@Injectable()
export class PaymentApprovalService {
  private readonly logger = new Logger(PaymentApprovalService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly ledgerWrite: LedgerWriteService,
    private readonly ledgerRepository: LedgerRepository,
    private readonly sequenceService: SequenceService,
  ) {}

  // ============================================
  // SUBMIT
  // ============================================

  async submit(dto: SubmitApprovalDto, userId: string): Promise<PendingLedgerEntryEntity> {
    // Normalised first: @IsDateString accepts a full ISO datetime, and comparing
    // '2026-08-13T09:00:00Z' against '2026-08-13' lexicographically makes a
    // payment received TODAY look like a future date. This mirrors
    // LedgerWriteService.resolveValueDate, which this path replaced.
    const valueDate = dto.valueDate ? toIsoDate(dto.valueDate) : todayIst();
    if (isFutureIst(valueDate)) {
      throw new BadRequestException(`Value date ${valueDate} is in the future`);
    }

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(PendingLedgerEntryEntity);

      const requestNo = await this.sequenceService.getNextNumber(
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
        proofDocumentId: null as string | null,
      };

      let row: Partial<PendingLedgerEntryEntity>;

      if (dto.kind === 'reversal') {
        // Amount and project come from the entry being reversed, never from the
        // client, so a reversal cannot quietly reverse a different figure.
        const target = await manager
          .getRepository(LedgerEntryEntity)
          .findOne({ where: { id: dto.reversesEntryId } });
        if (!target) {
          throw new NotFoundException('The entry to reverse was not found');
        }

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
          projectId: dto.projectId as string,
          customerId: dto.customerId ?? null,
          entryType: isReceipt ? 'receipt' : 'expense',
          direction: isReceipt ? 'in' : 'out',
          // Signed on the way in, matching the ledger: money out is negative.
          amountPaise: isReceipt ? (dto.amountPaise as number) : -(dto.amountPaise as number),
          category: dto.category ?? null,
          // Receipts only — a DB constraint enforces the same rule.
          allocations: isReceipt && dto.allocations?.length ? dto.allocations : null,
        };
      }

      // Filed now, against the project, so the approver can actually look at it.
      // Re-pointed at the ledger entry on approval.
      if (dto.proofDocument) {
        row.proofDocumentId = await this.fileProof(
          manager,
          row.projectId as string,
          row.direction as 'in' | 'out',
          dto.proofDocument,
          userId,
        );
      }

      let inserted;
      try {
        inserted = await repo.insert(row);
      } catch (error) {
        // `uq_ple_one_pending_reversal` allows at most one PENDING reversal per
        // ledger entry. Without translating it the caller gets a raw 500 and an
        // "Internal server error" toast, when the real answer is simply that
        // somebody already queued this reversal.
        if (isUniqueViolation(error, 'uq_ple_one_pending_reversal')) {
          throw new ConflictException('A reversal of this entry is already awaiting approval');
        }
        throw error;
      }

      const id = inserted.identifiers[0]?.id as string;
      return repo.findOneOrFail({ where: { id } });
    });
  }

  /**
   * Store the customer's evidence as a project document and return its id.
   *
   * `documents.entity_id` is NOT NULL and there is no ledger entry yet, so this
   * hangs off the project — which it genuinely belongs to — until approval moves
   * it onto the entry, where the rest of the codebase expects proof to live.
   */
  private async fileProof(
    manager: EntityManager,
    projectId: string,
    direction: 'in' | 'out',
    proof: { fileKey: string; fileName: string; mimeType: string; fileSize?: number },
    createdBy: string,
  ): Promise<string> {
    // `documents.property_id` is NOT NULL and a project knows its property.
    const rows: Array<{ property_id?: string }> = await manager.query(
      `SELECT property_id FROM projects WHERE id = $1`,
      [projectId],
    );
    const propertyId = rows[0]?.property_id;
    if (!propertyId) {
      throw new BadRequestException('Cannot attach proof: the project has no property');
    }

    const inserted = await manager.getRepository(DocumentEntity).insert({
      propertyId,
      entityType: DocumentEntityType.PROJECT,
      entityId: projectId,
      category: proof.mimeType.startsWith('image/')
        ? DocumentCategory.IMAGE
        : DocumentCategory.DOCUMENT,
      tag: direction === 'in' ? DocumentTag.RECEIPT_PROOF : DocumentTag.EXPENSE_RECEIPT,
      fileName: proof.fileName,
      fileUrl: proof.fileKey,
      fileSizeBytes: proof.fileSize,
      mimeType: proof.mimeType,
      createdBy,
      updatedBy: createdBy,
    });

    return inserted.identifiers[0]?.id as string;
  }

  // ============================================
  // APPROVE
  // ============================================

  /**
   * Approving is what puts money in the ledger.
   *
   * One transaction, with the pending row locked FOR UPDATE so two approvers
   * clicking at once cannot both insert. The ledger write joins this same
   * transaction — otherwise a crash between the insert and the stamp would leave
   * money in the ledger that nothing records as approved.
   *
   * Allocation is computed inside `LedgerWriteService` here, at approval, not at
   * submission: two payments queued against one project must not both claim the
   * same milestone.
   */
  async approve(id: string, approverId: string): Promise<PendingLedgerEntryEntity> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(PendingLedgerEntryEntity);

      const row = await repo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      this.assertActionable(row, approverId);
      const pending = row as PendingLedgerEntryEntity;

      let entry: LedgerEntryEntity;

      if (pending.kind === 'reversal') {
        const ledgerRepo = manager.getRepository(LedgerEntryEntity);

        const target = await ledgerRepo.findOne({ where: { id: pending.reversesEntryId as string } });
        if (!target) {
          throw new NotFoundException('The entry to reverse no longer exists');
        }

        // Re-checked here, not only at submission: the target may have been
        // reversed by another request in the meantime.
        const already = await ledgerRepo.findOne({ where: { reversesId: target.id } });
        if (already) {
          throw new ConflictException('That entry has already been reversed');
        }

        entry = await this.ledgerWrite.reverse(
          target.id,
          pending.reversalReason ?? 'Approved reversal',
          approverId,
          manager,
        );
      } else if (pending.kind === 'receipt') {
        entry = await this.ledgerWrite.recordReceipt(
          {
            projectId: pending.projectId,
            amountPaise: pending.amountPaise,
            valueDate: pending.valueDate,
            paymentMethod: pending.paymentMethod ?? undefined,
            reference: pending.reference ?? undefined,
            notes: pending.notes ?? undefined,
            customerId: pending.customerId ?? undefined,
            // Undefined, not null: LedgerWriteService treats "omitted" as
            // auto-allocate and validates a supplied split against live
            // balances, throwing a 400 the approver can act on.
            allocations: pending.allocations ?? undefined,
          },
          approverId,
          manager,
        );
      } else {
        entry = await this.ledgerWrite.recordExpense(
          {
            projectId: pending.projectId,
            // recordExpense takes a positive magnitude and negates it itself;
            // this table already stores the value signed.
            amountPaise: Math.abs(pending.amountPaise),
            valueDate: pending.valueDate,
            // MISC, not 'other' — ExpenseCategory has no OTHER member, and
            // ledger_entries.category has no CHECK constraint, so an invalid
            // value would persist silently and show up as an unlabelled bucket
            // in spend-by-category.
            category: pending.category ?? ExpenseCategory.MISC,
            payee: pending.counterparty ?? undefined,
            paymentMethod: pending.paymentMethod ?? undefined,
            notes: pending.notes ?? undefined,
          },
          approverId,
          manager,
        );
      }

      // Move the proof onto the entry now that one exists, so it sits where the
      // rest of the codebase looks for a ledger entry's proof.
      if (pending.proofDocumentId) {
        await manager
          .getRepository(DocumentEntity)
          .update(pending.proofDocumentId, {
            entityType: DocumentEntityType.LEDGER_ENTRY,
            entityId: entry.id,
            updatedBy: approverId,
          });
      }

      await repo.update(pending.id, {
        status: 'approved',
        reviewedBy: approverId,
        reviewedAt: new Date(),
        ledgerEntryId: entry.id,
      });

      return repo.findOneOrFail({ where: { id: pending.id } });
    });
  }

  async bulkApprove(ids: string[], approverId: string): Promise<BulkApproveResult> {
    const approved: string[] = [];
    const failed: Array<{ id: string; reason: string }> = [];

    // Sequential on purpose. Each approval takes FOR UPDATE locks on the
    // project's milestone balances, so parallel calls would queue on those locks
    // anyway — and the failure list would come back in a non-deterministic order.
    for (const id of ids) {
      try {
        await this.approve(id, approverId);
        approved.push(id);
      } catch (error) {
        failed.push({ id, reason: this.describeFailure(id, error) });
      }
    }

    return { approved, failed };
  }

  /**
   * A reason safe to show the user.
   *
   * Only our own HttpExceptions carry text meant for a human — "another user
   * must approve it", "already approved". Anything else is a driver or database
   * error whose message would leak schema detail straight into a toast, so it is
   * logged and replaced.
   */
  private describeFailure(id: string, error: unknown): string {
    if (error instanceof HttpException) {
      const response = error.getResponse();
      if (typeof response === 'string') return response;
      const message = (response as { message?: string | string[] }).message;
      if (Array.isArray(message)) return message.join(', ');
      if (message) return message;
      return error.message;
    }

    this.logger.error(`Bulk approve failed for ${id}`, error instanceof Error ? error.stack : error);
    return 'Could not be approved — see the server log';
  }

  // ============================================
  // REJECT / CANCEL
  // ============================================

  async reject(id: string, reason: string, approverId: string): Promise<PendingLedgerEntryEntity> {
    return this.transitionPending(id, (row, repo) => {
      if (row.submittedBy === approverId) {
        throw new ForbiddenException(
          'You submitted this payment — another user must review it',
        );
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
    return this.transitionPending(id, (row, repo) => {
      if (row.submittedBy !== userId) {
        throw new ForbiddenException('Only the person who submitted this can cancel it');
      }
      return repo.update(row.id, { status: 'cancelled' });
    });
  }

  // ============================================
  // READS
  // ============================================

  async list(query: QueryApprovalsDto): Promise<{
    data: PendingLedgerEntryEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(200, Math.max(1, query.limit ?? 25));

    const qb = this.dataSource.getRepository(PendingLedgerEntryEntity).createQueryBuilder('p');

    if (query.status) qb.andWhere('p.status = :status', { status: query.status });
    if (query.kind) qb.andWhere('p.kind = :kind', { kind: query.kind });
    if (query.projectId) qb.andWhere('p.projectId = :projectId', { projectId: query.projectId });
    if (query.customerId) {
      qb.andWhere('p.customerId = :customerId', { customerId: query.customerId });
    }
    if (query.dateFrom) qb.andWhere('p.valueDate >= :dateFrom', { dateFrom: query.dateFrom });
    if (query.dateTo) qb.andWhere('p.valueDate <= :dateTo', { dateTo: query.dateTo });
    if (query.search) {
      qb.andWhere('(p.requestNo ILIKE :q OR p.reference ILIKE :q OR p.counterparty ILIKE :q)', {
        q: `%${query.search}%`,
      });
    }

    // Oldest first — the queue should drain in the order it filled.
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

  async getOne(
    id: string,
  ): Promise<PendingLedgerEntryEntity & { possibleDuplicates: PendingLedgerEntryEntity[] }> {
    const row = await this.dataSource
      .getRepository(PendingLedgerEntryEntity)
      .findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('Approval request not found');
    }

    const possibleDuplicates = (
      await this.findDuplicates(row.projectId, row.amountPaise, row.valueDate)
    ).filter((d) => d.id !== row.id);

    return { ...row, possibleDuplicates };
  }

  /**
   * Same project, amount and payment date, submitted recently.
   *
   * Surfaced to the approver as a warning, never a block — a customer genuinely
   * can pay the same amount twice in one day.
   */
  async findDuplicates(
    projectId: string,
    amountPaise: number,
    valueDate: string,
  ): Promise<PendingLedgerEntryEntity[]> {
    const since = new Date(Date.now() - DUPLICATE_WINDOW_HOURS * 3_600_000);

    const candidates = await this.dataSource.getRepository(PendingLedgerEntryEntity).find({
      where: { projectId, amountPaise, valueDate },
      order: { submittedAt: 'DESC' },
      take: 5,
    });

    // A rejected row is not a competing claim on the same money.
    return candidates.filter((r) => r.submittedAt >= since && r.status !== 'rejected');
  }

  /**
   * What approving this would do, computed with the same `allocateWaterfall`
   * the real write uses so the preview cannot drift from the outcome.
   *
   * Read-only and unlocked. The binding allocation is computed again inside
   * `approve`, because balances can move between viewing and approving.
   */
  async previewImpact(id: string): Promise<{ lines: ImpactLine[]; unallocatedPaise: number }> {
    const row = await this.dataSource
      .getRepository(PendingLedgerEntryEntity)
      .findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('Approval request not found');
    }

    // Only receipts allocate. Expenses never touch a milestone, and a reversal's
    // effect is simply the removal of its target's allocations.
    if (row.kind !== 'receipt') {
      return { lines: [], unallocatedPaise: 0 };
    }

    const balances = await this.ledgerRepository.getMilestoneBalances(row.projectId);
    const active = balances.filter((b) => b.status === 'active');
    const byId = new Map(active.map((b) => [b.milestoneId, b]));

    // A manual split is what will actually be applied, so preview that rather
    // than the waterfall the payment is not going to use.
    if (row.allocations?.length) {
      const applied = row.allocations.reduce((sum, a) => sum + a.amountPaise, 0);
      return {
        lines: row.allocations.map((a) => {
          const balance = byId.get(a.milestoneId);
          const before = balance?.balancePaise ?? 0;
          return {
            milestoneId: a.milestoneId,
            milestoneName: balance?.name ?? 'Milestone',
            appliedPaise: a.amountPaise,
            balanceAfterPaise: before - a.amountPaise,
            settlesFully: before === a.amountPaise,
          };
        }),
        unallocatedPaise: Math.max(0, row.amountPaise - applied),
      };
    }

    // allocateWaterfall throws on a non-positive amount; a receipt is always
    // positive, but nothing downstream should depend on that assumption.
    if (row.amountPaise <= 0) {
      return { lines: [], unallocatedPaise: 0 };
    }

    const result = allocateWaterfall(
      active.map((b) => ({ milestoneId: b.milestoneId, capacityPaise: b.balancePaise })),
      row.amountPaise,
    );

    return {
      lines: result.allocations.map((a) => {
        const balance = byId.get(a.milestoneId);
        const before = balance?.balancePaise ?? 0;
        return {
          milestoneId: a.milestoneId,
          milestoneName: balance?.name ?? 'Milestone',
          appliedPaise: a.amountPaise,
          balanceAfterPaise: before - a.amountPaise,
          settlesFully: before === a.amountPaise,
        };
      }),
      unallocatedPaise: result.unallocatedPaise,
    };
  }

  // ============================================
  // INTERNALS
  // ============================================

  /** Lock, verify still pending, then apply. Shared by reject and cancel. */
  private async transitionPending(
    id: string,
    apply: (
      row: PendingLedgerEntryEntity,
      repo: Repository<PendingLedgerEntryEntity>,
    ) => Promise<unknown>,
  ): Promise<PendingLedgerEntryEntity> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(PendingLedgerEntryEntity);

      const row = await repo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!row) {
        throw new NotFoundException('Approval request not found');
      }
      if (row.status !== 'pending') {
        throw new ConflictException(`This request is already ${row.status}`);
      }

      await apply(row, repo);
      return repo.findOneOrFail({ where: { id } });
    });
  }

  private assertActionable(row: PendingLedgerEntryEntity | null, approverId: string): void {
    if (!row) {
      throw new NotFoundException('Approval request not found');
    }
    if (row.status !== 'pending') {
      throw new ConflictException(`This request is already ${row.status}`);
    }
    if (row.submittedBy === approverId) {
      throw new ForbiddenException(
        'You submitted this payment — another user must approve it',
      );
    }
  }
}
