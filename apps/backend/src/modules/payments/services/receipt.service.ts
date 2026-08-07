import {
  BadRequestException,
  ForbiddenException,
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
  PaymentTermStatus,
  PaymentTransactionStatus,
} from '@tejas96/shared/types';
import { DataSource, EntityManager, IsNull } from 'typeorm';

import { assertMoneyWritesAllowed } from '../../../common/utils';
import { DocumentEntity } from '../../documents/entities/document.entity';
import { SequenceService } from '../../finance-common/services/sequence.service';
import { PaymentTermEntity } from '../../payment-terms/entities/payment-term.entity';
import { PaymentTermRepository } from '../../payment-terms/repositories/payment-term.repository';
import { ProjectRepository } from '../../projects/repositories';
import { CreateReceiptDto, UpdateReceiptStatusDto } from '../dto';
import { PaymentEntity } from '../entities/payment.entity';

/**
 * Status values that count toward a payment term's `paid_amount`
 * aggregation (plan §2.2). Kept in one place so the receipts service and
 * the term repository's reaggregateTerm SQL stay consistent.
 */
const COUNTED_STATUSES: PaymentTransactionStatus[] = [
  PaymentTransactionStatus.RECEIVED,
  PaymentTransactionStatus.VERIFIED,
  PaymentTransactionStatus.CLEARED,
];

/**
 * Allowed FSM transitions for a receipt's `status` (plan §3.2). A
 * transition is permitted iff the proposed status is in the array
 * keyed by the current status.
 */
const STATUS_TRANSITIONS: Readonly<Record<PaymentTransactionStatus, PaymentTransactionStatus[]>> = {
  [PaymentTransactionStatus.PENDING]: [
    PaymentTransactionStatus.RECEIVED,
    PaymentTransactionStatus.BOUNCED,
  ],
  [PaymentTransactionStatus.RECEIVED]: [
    PaymentTransactionStatus.VERIFIED,
    PaymentTransactionStatus.BOUNCED,
  ],
  [PaymentTransactionStatus.VERIFIED]: [
    PaymentTransactionStatus.CLEARED,
    PaymentTransactionStatus.BOUNCED,
  ],
  [PaymentTransactionStatus.CLEARED]: [PaymentTransactionStatus.REFUNDED],
  [PaymentTransactionStatus.BOUNCED]: [],
  [PaymentTransactionStatus.REFUNDED]: [],
};

/**
 * ReceiptService
 *
 * Implements plan §3.2 — the cash-inflow ledger. Every mutation that can
 * change a term's paid_amount runs inside a single DB transaction with a
 * `SELECT ... FOR UPDATE` lock on the linked term so concurrent receipts
 * cannot produce inconsistent term state. Terminal statuses (waived,
 * cancelled) on the term are preserved by the term repository's
 * reaggregateTerm helper.
 */
@Injectable()
export class ReceiptService {
  private readonly logger = new Logger(ReceiptService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly termRepository: PaymentTermRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly sequenceService: SequenceService,
  ) {}

  // ============================================
  // CREATE
  // ============================================

  /**
   * Record a receipt against a project, optionally fulfilling a payment
   * term. Runs in a single transaction:
   *   1. Validate project belongs to org; resolve customer + propertyId.
   *   2. Validate term (if provided) belongs to project + same org +
   *      not in a terminal state, then acquire FOR UPDATE lock.
   *   3. Generate `RCP-{FY}-{6digit}` number via SequenceService.
   *   4. Insert receipt row.
   *   5. Insert proof document row (if attached).
   *   6. Re-aggregate term paid_amount/status (skipped if no term).
   * Failure of any step rolls back the entire flow.
   */
  async create(
    organizationId: string,
    dto: CreateReceiptDto,
    createdBy: string,
  ): Promise<PaymentEntity> {
    assertMoneyWritesAllowed();
    this.assertPaidAt(dto.paidAt);

    const project = await this.loadProjectInOrg(dto.projectId, organizationId);
    const customerId = await this.resolveCustomerId(project, dto.customerId);
    const propertyId = project.property?.id ?? project.propertyId;
    const initialStatus = dto.status ?? PaymentTransactionStatus.RECEIVED;

    return this.dataSource.transaction(async (manager) => {
      let lockedTerm: PaymentTermEntity | null = null;

      if (dto.paymentTermId) {
        lockedTerm = await this.termRepository.findByIdForUpdate(
          manager,
          dto.paymentTermId,
          organizationId,
        );
        if (!lockedTerm) {
          throw new NotFoundException(`Payment term ${dto.paymentTermId} not found`);
        }
        if (lockedTerm.projectId !== project.id) {
          throw new BadRequestException('Payment term does not belong to this project');
        }
        if (
          lockedTerm.status === PaymentTermStatus.WAIVED ||
          lockedTerm.status === PaymentTermStatus.CANCELLED
        ) {
          throw new BadRequestException(
            `Cannot record a receipt against a ${lockedTerm.status} term`,
          );
        }
      }

      const paymentNumber = await this.sequenceService.getNextNumber(
        FinanceSequenceScope.RECEIPT,
        manager,
      );

      const receiptRepo = manager.getRepository(PaymentEntity);
      const expectedAmount = lockedTerm ? Number(lockedTerm.expectedAmount) : dto.paidAmount;

      const receipt = receiptRepo.create({
        organizationId,
        projectId: project.id,
        customerId,
        paymentTermId: dto.paymentTermId ?? null,
        paymentNumber,
        expectedAmount,
        paidAmount: dto.paidAmount,
        // Value date: what the operator recorded, else today (IST). Previously
        // dto.paidAt was validated and then silently discarded.
        paidAt: dto.paidAt ? dto.paidAt.slice(0, 10) : this.todayIso(),
        paidAtIsInferred: false,
        paymentMethod: dto.paymentMethod,
        paymentReference: dto.paymentReference,
        bankName: dto.bankName,
        accountNumber: dto.accountNumber,
        ifscCode: dto.ifscCode,
        status: initialStatus,
        notes: dto.notes,
        createdBy,
        updatedBy: createdBy,
      });
      const saved = await receiptRepo.save(receipt);

      if (dto.proofDocument) {
        await this.attachProofDocument({
          manager,
          receiptId: saved.id,
          organizationId,
          propertyId,
          createdBy,
          proof: dto.proofDocument,
        });
      }

      if (lockedTerm && this.statusCountsTowardAggregation(initialStatus)) {
        await this.termRepository.reaggregateTerm(manager, lockedTerm.id);
      }

      return saved;
    });
  }

  // ============================================
  // FSM STATUS TRANSITION
  // ============================================

  /**
   * Mutate receipt status via the FSM. Runs in a transaction with the
   * linked term FOR UPDATE-locked so re-aggregation stays consistent.
   */
  async updateStatus(
    id: string,
    organizationId: string,
    dto: UpdateReceiptStatusDto,
    updatedBy: string,
  ): Promise<PaymentEntity> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(PaymentEntity);
      const receipt = await repo
        .createQueryBuilder('p')
        .setLock('pessimistic_write')
        .where('p.id = :id', { id })
        .andWhere('p.organization_id = :organizationId', { organizationId })
        .andWhere('p.deleted_at IS NULL')
        .getOne();

      if (!receipt) {
        throw new NotFoundException(`Receipt ${id} not found`);
      }

      const allowed = STATUS_TRANSITIONS[receipt.status] ?? [];
      if (!allowed.includes(dto.status)) {
        throw new BadRequestException(
          `Invalid status transition: ${receipt.status} → ${dto.status}`,
        );
      }
      if (receipt.status === dto.status) {
        return receipt;
      }

      // Lock the linked term (if any) before mutating the receipt so
      // re-aggregation sees a consistent snapshot.
      if (receipt.paymentTermId) {
        await this.termRepository.findByIdForUpdate(manager, receipt.paymentTermId, organizationId);
      }

      receipt.status = dto.status;
      if (dto.reason) {
        receipt.notes = receipt.notes
          ? `${receipt.notes}\n[${dto.status}] ${dto.reason}`
          : `[${dto.status}] ${dto.reason}`;
      }
      receipt.updatedBy = updatedBy;
      const saved = await repo.save(receipt);

      if (receipt.paymentTermId) {
        await this.termRepository.reaggregateTerm(manager, receipt.paymentTermId);
      }

      return saved;
    });
  }

  // ============================================
  // SOFT DELETE — re-aggregates parent term in same tx
  // ============================================

  async delete(id: string, organizationId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(PaymentEntity);
      const receipt = await repo
        .createQueryBuilder('p')
        .setLock('pessimistic_write')
        .where('p.id = :id', { id })
        .andWhere('p.organization_id = :organizationId', { organizationId })
        .andWhere('p.deleted_at IS NULL')
        .getOne();

      if (!receipt) {
        throw new NotFoundException(`Receipt ${id} not found`);
      }

      if (receipt.paymentTermId) {
        await this.termRepository.findByIdForUpdate(manager, receipt.paymentTermId, organizationId);
      }

      await repo.softDelete(id);

      if (receipt.paymentTermId) {
        await this.termRepository.reaggregateTerm(manager, receipt.paymentTermId);
      }
    });
  }

  // ============================================
  // READ — extended summary with per-term breakdown
  // ============================================

  /**
   * Project-level receipt summary (plan §3.2). Returns ledger totals
   * plus the per-term breakdown the Finance tab + Overview card consume.
   * Aggregations are independent queries — never derived from a
   * paginated list (per backend rules).
   */

  /**
   * Flat receipt list for a project, newest first.
   *
   * Exists so the web app can stop calling `GET /payments/project/:id`
   * (PaymentController), which is unscoped by organization and part of the
   * legacy surface slated for removal. Returns the same PaymentEntity shape,
   * so the response DTO is unchanged for callers.
   */
  async listByProject(projectId: string, organizationId: string): Promise<PaymentEntity[]> {
    return this.dataSource.getRepository(PaymentEntity).find({
      where: { projectId, organizationId, deletedAt: IsNull() },
      order: { paidAt: 'DESC', createdAt: 'DESC' },
      relations: ['customer', 'reconciledByUser'],
    });
  }

  async getProjectSummary(
    projectId: string,
    organizationId: string,
  ): Promise<{
    totals: {
      totalExpected: number;
      totalReceived: number;
      pending: number;
      receiptCount: number;
    };
    terms: Array<{
      id: string;
      name: string;
      displayOrder: number;
      expectedAmount: number;
      paidAmount: number;
      status: PaymentTermStatus;
      dueDate: string | null;
      payments: Array<{
        id: string;
        paymentNumber: string;
        paidAmount: number;
        paymentMethod: string;
        status: string;
        createdAt: string;
      }>;
    }>;
    nextDueTermId: string | null;
    overdueCount: number;
  }> {
    const project = await this.loadProjectInOrg(projectId, organizationId);

    const terms = await this.termRepository.findByProject(project.id, organizationId);

    const counted = COUNTED_STATUSES.map((s) => `'${s}'`).join(',');
    const totalsRows = await this.dataSource.query(
      `SELECT
         COUNT(*)::int                         AS receipt_count,
         COALESCE(SUM(paid_amount), 0)::numeric AS total_received
       FROM payments
       WHERE project_id = $1
         AND organization_id = $2
         AND deleted_at IS NULL
         AND status IN (${counted})`,
      [project.id, organizationId],
    );

    const totalReceived = Number(totalsRows[0]?.total_received ?? 0);
    const totalExpected = terms.reduce((sum, t) => sum + Number(t.expectedAmount), 0);
    const today = this.todayIso();

    const next = terms.find(
      (t) => t.status === PaymentTermStatus.PENDING || t.status === PaymentTermStatus.PARTIAL,
    );

    const overdueCount = terms.filter(
      (t) =>
        (t.status === PaymentTermStatus.PENDING || t.status === PaymentTermStatus.PARTIAL) &&
        t.dueDate !== null &&
        t.dueDate !== undefined &&
        t.dueDate < today,
    ).length;

    const paymentsRows = await this.dataSource.query(
      `SELECT
         id,
         payment_number AS "paymentNumber",
         paid_amount    AS "paidAmount",
         payment_method AS "paymentMethod",
         status,
         created_at     AS "createdAt",
         payment_term_id AS "paymentTermId"
       FROM payments
       WHERE project_id = $1
         AND organization_id = $2
         AND deleted_at IS NULL
         AND status IN (${counted})
       ORDER BY created_at DESC`,
      [project.id, organizationId],
    );

    return {
      totals: {
        totalExpected,
        totalReceived,
        pending: Math.max(totalExpected - totalReceived, 0),
        receiptCount: totalsRows[0]?.receipt_count ?? 0,
      },
      terms: terms.map((t) => ({
        id: t.id,
        name: t.name,
        displayOrder: t.displayOrder,
        expectedAmount: Number(t.expectedAmount),
        paidAmount: Number(t.paidAmount),
        status: t.status,
        dueDate: t.dueDate ?? null,
        payments: (
          paymentsRows as Array<{
            id: string;
            paymentNumber: string;
            paidAmount: string | number;
            paymentMethod: string;
            status: string;
            createdAt: Date | string;
            paymentTermId: string;
          }>
        )
          .filter((p) => p.paymentTermId === t.id)
          .map((p) => ({
            id: p.id,
            paymentNumber: p.paymentNumber,
            paidAmount: Number(p.paidAmount),
            paymentMethod: p.paymentMethod,
            status: p.status,
            createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
          })),
      })),
      nextDueTermId: next?.id ?? null,
      overdueCount,
    };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private statusCountsTowardAggregation(status: PaymentTransactionStatus): boolean {
    return COUNTED_STATUSES.includes(status);
  }

  private assertPaidAt(paidAt?: string): void {
    if (!paidAt) return;
    const dt = new Date(paidAt);
    if (Number.isNaN(dt.getTime())) {
      throw new BadRequestException('paidAt is not a valid date');
    }
    if (dt.getTime() > Date.now()) {
      throw new BadRequestException('paidAt cannot be in the future');
    }
  }

  private async loadProjectInOrg(
    projectId: string,
    organizationId: string,
  ): Promise<{
    id: string;
    propertyId: string;
    property?: { id: string };
    quote?: { customerId: string; organizationId?: string };
  }> {
    try {
      const p = await this.projectRepository.findById(projectId, organizationId);
      return {
        id: p.id,
        propertyId: p.propertyId,
        property: p.property ? { id: p.property.id } : undefined,
        quote: p.quote
          ? { customerId: p.quote.customerId, organizationId: p.quote.organizationId }
          : undefined,
      };
    } catch {
      throw new NotFoundException(`Project ${projectId} not found in this organization`);
    }
  }

  /**
   * Auto-fill customer for advance receipts (plan §2.2). When the caller
   * supplies a customerId, we trust it but still require it to belong to
   * the same project (via the quote's customer) — otherwise reject to
   * prevent cross-customer ledger pollution.
   */
  private async resolveCustomerId(
    project: { quote?: { customerId: string } },
    explicit?: string,
  ): Promise<string> {
    const projectCustomerId = project.quote?.customerId;
    if (!explicit) {
      if (!projectCustomerId) {
        throw new BadRequestException(
          'Project has no resolvable customer; supply customerId explicitly',
        );
      }
      return projectCustomerId;
    }
    if (projectCustomerId && explicit !== projectCustomerId) {
      throw new ForbiddenException('Receipt customer does not match the project customer');
    }
    return explicit;
  }

  private async attachProofDocument(params: {
    manager: EntityManager;
    receiptId: string;
    organizationId: string;
    propertyId: string;
    createdBy: string;
    proof: NonNullable<CreateReceiptDto['proofDocument']>;
  }): Promise<void> {
    const { manager, receiptId, organizationId, propertyId, createdBy, proof } = params;

    const category =
      proof.category ??
      (proof.mimeType.startsWith('image/') ? DocumentCategory.IMAGE : DocumentCategory.DOCUMENT);

    const repo = manager.getRepository(DocumentEntity);
    const doc = repo.create({
      organizationId,
      propertyId,
      entityType: DocumentEntityType.PAYMENT,
      entityId: receiptId,
      category,
      tag: DocumentTag.RECEIPT_PROOF,
      fileName: proof.fileName,
      fileUrl: proof.fileKey,
      fileSizeBytes: proof.fileSize,
      mimeType: proof.mimeType,
      createdBy,
      updatedBy: createdBy,
    });
    await repo.save(doc);
  }

  /**
   * Today's date as an IST business date (YYYY-MM-DD).
   *
   * Previously computed in UTC, which put the first 5h30m of every IST day on
   * the previous date — so an evening receipt was booked a day early, and the
   * not-in-the-future guard rejected legitimate same-day entries.
   */
  private todayIso(): string {
    // en-CA formats as YYYY-MM-DD.
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }
}
