import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  PaymentTerm as PaymentTermType,
  PaymentTermSource,
  PaymentTermStatus,
} from '@tejas96/shared/types';
import { DataSource, EntityManager, IsNull, OptimisticLockVersionMismatchError } from 'typeorm';

import { CreatePaymentTermDto, UpdatePaymentTermDto, WaivePaymentTermDto } from '../dto';
import { PaymentTermEntity } from '../entities/payment-term.entity';
import { PaymentTermRepository } from '../repositories/payment-term.repository';

/**
 * Shape of a quote payment milestone we accept for snapshotting. Kept loose
 * here (only the fields we read) to avoid a hard dependency on the quotes
 * module — the project service passes the array straight from the quote
 * version JSONB.
 */
interface SnapshotableMilestone {
  stage?: string | null;
  name?: string | null;
  description?: string | null;
  percentage?: number | null;
  amount?: number | null;
  dueDate?: string | null;
  order?: number | null;
}

/**
 * PaymentTermService
 *
 * Owns all writes to project_payment_terms. Read-side aggregation (paid_amount
 * / status) is performed by the receipts service via the repository's
 * `reaggregateTerm` helper, which acquires the FOR UPDATE lock first.
 */
@Injectable()
export class PaymentTermService {
  private readonly logger = new Logger(PaymentTermService.name);

  constructor(
    private readonly termRepository: PaymentTermRepository,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // ============================================
  // READ
  // ============================================

  async listForProject(projectId: string): Promise<PaymentTermEntity[]> {
    return this.termRepository.findByProject(projectId);
  }

  async findById(id: string): Promise<PaymentTermEntity> {
    const term = await this.termRepository.findById(id);
    if (!term) {
      throw new NotFoundException(`Payment term ${id} not found`);
    }
    return term;
  }

  // ============================================
  // CREATE — manual term (mid-project)
  // ============================================

  async create(
    projectId: string,
    dto: CreatePaymentTermDto,
    createdBy: string,
  ): Promise<PaymentTermEntity> {
    const displayOrder =
      dto.displayOrder ?? (await this.termRepository.getMaxDisplayOrder(projectId)) + 1;

    const repo = this.dataSource.getRepository(PaymentTermEntity);
    const entity = repo.create({
      projectId,
      source: PaymentTermSource.MANUAL,
      stage: dto.stage,
      name: dto.name,
      description: dto.description ?? null,
      displayOrder,
      expectedAmount: dto.expectedAmount,
      expectedPercentage: dto.expectedPercentage ?? null,
      currency: 'INR',
      dueDate: dto.dueDate ?? null,
      status: PaymentTermStatus.PENDING,
      paidAmount: 0,
      notes: dto.notes ?? null,
      createdBy,
      updatedBy: createdBy,
    });

    return repo.save(entity);
  }

  // ============================================
  // UPDATE — name/amount/due/order; status mutated only via dedicated actions
  // ============================================

  async update(
    id: string,
    dto: UpdatePaymentTermDto,
    updatedBy: string,
  ): Promise<PaymentTermEntity> {
    const term = await this.findById(id);

    if (term.status === PaymentTermStatus.WAIVED || term.status === PaymentTermStatus.CANCELLED) {
      throw new BadRequestException(
        `Cannot edit a ${term.status} term. Create a new term instead.`,
      );
    }

    const nextExpected = dto.expectedAmount ?? Number(term.expectedAmount);
    if (nextExpected <= 0) {
      throw new BadRequestException('expectedAmount must be greater than 0');
    }

    if (dto.version !== undefined && dto.version !== term.version) {
      throw new ConflictException('Term was modified by someone else; reload and try again.');
    }

    const repo = this.dataSource.getRepository(PaymentTermEntity);
    Object.assign(term, {
      name: dto.name ?? term.name,
      description: dto.description ?? term.description,
      displayOrder: dto.displayOrder ?? term.displayOrder,
      expectedAmount: nextExpected,
      expectedPercentage:
        dto.expectedPercentage !== undefined ? dto.expectedPercentage : term.expectedPercentage,
      dueDate: dto.dueDate ?? term.dueDate,
      notes: dto.notes ?? term.notes,
      updatedBy,
    });

    try {
      return await repo.save(term);
    } catch (err) {
      if (err instanceof OptimisticLockVersionMismatchError) {
        throw new ConflictException('Term was modified by someone else; reload and try again.');
      }
      throw err;
    }
  }

  // ============================================
  // STATUS ACTIONS — waive / cancel
  // ============================================

  async waive(id: string, dto: WaivePaymentTermDto, updatedBy: string): Promise<PaymentTermEntity> {
    const term = await this.findById(id);

    if (term.status === PaymentTermStatus.WAIVED) {
      throw new BadRequestException('Term is already waived');
    }
    if (term.status === PaymentTermStatus.CANCELLED) {
      throw new BadRequestException('Cannot waive a cancelled term');
    }

    const repo = this.dataSource.getRepository(PaymentTermEntity);
    term.status = PaymentTermStatus.WAIVED;
    term.waivedReason = dto.reason;
    term.completedAt = new Date();
    term.updatedBy = updatedBy;
    return repo.save(term);
  }

  // ============================================
  // DELETE — only allowed when no linked receipts
  // ============================================

  async delete(id: string): Promise<void> {
    const term = await this.findById(id);

    const linked = await this.termRepository.countLinkedReceipts(term.id);
    if (linked > 0) {
      throw new ConflictException(
        `Cannot delete term: ${linked} linked receipt(s) exist. Waive instead.`,
      );
    }

    await this.dataSource.getRepository(PaymentTermEntity).softDelete(id);
  }

  // ============================================
  // SNAPSHOT FROM QUOTE — called from project creation hook (plan §11)
  // ============================================

  /**
   * Snapshot payment terms from a quote version's `paymentMilestones` JSONB
   * into project_payment_terms rows. Idempotent — if any term already exists
   * for the project, returns the existing rows unchanged. Designed to run
   * inside an outer transaction (the project-creation transaction).
   *
   * @param projectId          Target project id (must already exist).
   * @param sourceVersionId    Quote version id for audit trail (nullable —
   *                           pass null to omit the FK).
   * @param milestones         Raw milestones array from the quote version.
   * @param createdBy          User id to record on each row.
   * @param manager            Outer transaction manager. Required.
   */
  async snapshotFromQuoteVersion(params: {
    projectId: string;
    sourceVersionId: string | null;
    milestones: SnapshotableMilestone[] | null | undefined;
    createdBy: string;
    manager: EntityManager;
  }): Promise<PaymentTermEntity[]> {
    const { projectId, sourceVersionId, milestones, createdBy, manager } = params;

    const repo = manager.getRepository(PaymentTermEntity);

    const existing = await repo.find({
      where: { projectId, deletedAt: IsNull() },
      order: { displayOrder: 'ASC' },
    });
    if (existing.length > 0) {
      this.logger.log(
        `Skipping payment-term snapshot for project ${projectId}: ${existing.length} term(s) already present.`,
      );
      return existing;
    }

    if (!milestones || milestones.length === 0) {
      this.logger.warn(
        `No payment milestones to snapshot for project ${projectId} (source version ${sourceVersionId ?? 'n/a'}).`,
      );
      return [];
    }

    const rows = milestones
      .map((m, idx) => this.mapMilestoneToRow(m, idx))
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .map((row) =>
        repo.create({
          ...row,
          projectId,
          sourceQuoteVersionId: sourceVersionId,
          source: PaymentTermSource.QUOTE_SNAPSHOT,
          currency: 'INR',
          status: PaymentTermStatus.PENDING,
          paidAmount: 0,
          createdBy,
          updatedBy: createdBy,
        }),
      );

    if (rows.length === 0) {
      this.logger.warn(
        `All milestones for project ${projectId} were invalid; no terms snapshotted.`,
      );
      return [];
    }

    return repo.save(rows);
  }

  /**
   * Re-snapshot from the latest quote version. Refuses if any existing term
   * has a non-zero paid_amount (plan §11 preflight).
   */
  async resnapshotFromLatestQuote(params: {
    projectId: string;
    sourceVersionId: string | null;
    milestones: SnapshotableMilestone[] | null | undefined;
    updatedBy: string;
  }): Promise<PaymentTermEntity[]> {
    const { projectId, sourceVersionId, milestones, updatedBy } = params;

    const hasPayments = await this.termRepository.projectHasReceivedPayments(projectId);
    if (hasPayments) {
      throw new ConflictException(
        'Cannot re-snapshot: at least one term already has received payments. Reconcile manually.',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(PaymentTermEntity);

      // Soft-delete existing pending terms (which have no payments per the
      // preflight) before snapshotting fresh.
      await repo
        .createQueryBuilder()
        .softDelete()
        .where('project_id = :projectId', { projectId })
        .andWhere('deleted_at IS NULL')
        .execute();

      return this.snapshotFromQuoteVersion({
        projectId,
        sourceVersionId,
        milestones,
        createdBy: updatedBy,
        manager,
      });
    });
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private mapMilestoneToRow(
    m: SnapshotableMilestone,
    idx: number,
  ): Pick<
    PaymentTermType,
    | 'stage'
    | 'name'
    | 'description'
    | 'displayOrder'
    | 'expectedAmount'
    | 'expectedPercentage'
    | 'dueDate'
  > | null {
    const amount = Number(m.amount ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      this.logger.warn(
        `Skipping milestone at index ${idx} (name=${m.name ?? 'unnamed'}): non-positive amount.`,
      );
      return null;
    }

    return {
      stage: (m.stage ?? 'custom').toString(),
      name: (m.name ?? `Milestone ${idx + 1}`).toString(),
      description: m.description ?? null,
      displayOrder: typeof m.order === 'number' && m.order > 0 ? m.order : idx + 1,
      expectedAmount: amount,
      expectedPercentage:
        typeof m.percentage === 'number' && Number.isFinite(m.percentage) ? m.percentage : null,
      dueDate: m.dueDate ?? null,
    };
  }
}
