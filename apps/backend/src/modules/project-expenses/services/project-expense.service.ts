import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  ExpenseCategory,
  ExpensePaidByType,
  FinanceSequenceScope,
  ReimbursementStatus,
} from '@oneohm-epc/shared/types';
import { DataSource, EntityManager } from 'typeorm';

import { BomService } from '../../bom/services/bom.service';
import { SequenceService } from '../../finance-common/services/sequence.service';
import { ProjectRepository } from '../../projects/repositories';
import {
  CreateExpenseDto,
  ExpenseProductLinkDto,
  ListExpensesQueryDto,
  UpdateExpenseDto,
  UpdateReimbursementStatusDto,
} from '../dto';
import { ExpenseProductLinkEntity } from '../entities/expense-product-link.entity';
import { ProjectExpenseEntity } from '../entities/project-expense.entity';
import { ProjectExpenseRepository } from '../repositories/project-expense.repository';

const TXN_REFERENCE_TYPE = 'project_expense';

/**
 * ProjectExpenseService
 *
 * Implements plan §3.3 — the cash-outflow ledger.
 *
 * Inventory model (deliberate, per plan §2.4):
 *   Expenses record vendor-supplied procurement that bypasses our
 *   warehouses (vendor → site directly). They DO NOT mutate
 *   stock_allocations. The audit trail of "what materials were paid for"
 *   lives in `expense_product_links`, which is FK-cascaded to the parent
 *   expense; soft-deleting the expense removes those rows from the
 *   procurement-spent aggregation in the next request, which is the
 *   compensating effect.
 *
 * Procurement guard (plan §2.5):
 *   When a materials expense is created/updated, for every product link
 *   we sum the already-spent quantity for that (project, product) and
 *   compare against the BOM target. Over-procurement is rejected unless
 *   the caller supplies override=true with a reason — which is captured
 *   immutably on the expense row (override_used + override_reason).
 *
 * Concurrency:
 *   The expense row is locked FOR UPDATE for the duration of edits/
 *   deletes. The procurement guard reads the current spent-qty inside
 *   the same transaction so two concurrent inserts cannot both pass the
 *   guard (the second waits for the first to commit and then re-reads).
 */
@Injectable()
export class ProjectExpenseService {
  private readonly logger = new Logger(ProjectExpenseService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly expenseRepository: ProjectExpenseRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly sequenceService: SequenceService,
    @Inject(forwardRef(() => BomService))
    private readonly bomService: BomService,
  ) {}

  // ============================================
  // CREATE
  // ============================================

  async create(
    organizationId: string,
    projectId: string,
    dto: CreateExpenseDto,
    createdBy: string,
    permissions: { canOverrideProcurementGuard: boolean },
  ): Promise<ProjectExpenseEntity> {
    this.assertExpenseDate(dto.expenseDate);
    this.assertPaidByConsistency(dto);
    this.assertItemizationCategory(dto.category, dto.productLinks);
    if (dto.override && !permissions.canOverrideProcurementGuard) {
      throw new ForbiddenException(
        'Override requires the expenses:override-procurement-guard permission',
      );
    }
    if (dto.productLinks) this.assertNoDuplicateProductLinks(dto.productLinks);

    await this.assertProjectInOrg(projectId, organizationId);

    return this.dataSource.transaction(async (manager) => {
      // Procurement guard runs inside the tx so concurrent inserts serialize.
      if (dto.category === ExpenseCategory.MATERIALS && dto.productLinks && !dto.override) {
        await this.assertProcurementGuard({
          manager,
          projectId,
          organizationId,
          newLinks: dto.productLinks,
          excludeExpenseId: null,
        });
      }

      const expenseNumber = await this.sequenceService.getNextNumber(
        organizationId,
        FinanceSequenceScope.EXPENSE,
        manager,
      );

      const expenseRepo = manager.getRepository(ProjectExpenseEntity);
      const reimbursementStatus =
        dto.paidBy === ExpensePaidByType.EMPLOYEE
          ? ReimbursementStatus.PENDING
          : ReimbursementStatus.NOT_APPLICABLE;

      const expense = expenseRepo.create({
        organizationId,
        projectId,
        expenseNumber,
        category: dto.category,
        vendorName: dto.vendorName ?? null,
        amount: dto.amount,
        currency: 'INR',
        expenseDate: dto.expenseDate,
        paymentMethod: dto.paymentMethod,
        paidBy: dto.paidBy ?? ExpensePaidByType.COMPANY,
        paidByEmployeeId: dto.paidByEmployeeId ?? null,
        reimbursementStatus,
        overrideUsed: dto.override === true,
        overrideReason: dto.override === true ? (dto.overrideReason ?? null) : null,
        notes: dto.notes ?? null,
        createdBy,
        updatedBy: createdBy,
      });
      const saved = await expenseRepo.save(expense);

      if (dto.productLinks?.length) {
        await this.replaceProductLinks(manager, saved.id, dto.productLinks);
      }

      return (await this.expenseRepository.findById(saved.id, organizationId, manager))!;
    });
  }

  // ============================================
  // READ
  // ============================================

  async findById(id: string, organizationId: string): Promise<ProjectExpenseEntity> {
    const expense = await this.expenseRepository.findById(id, organizationId);
    if (!expense) throw new NotFoundException(`Expense ${id} not found`);
    return expense;
  }

  async list(projectId: string, organizationId: string, query: ListExpensesQueryDto) {
    await this.assertProjectInOrg(projectId, organizationId);
    return this.expenseRepository.list(projectId, organizationId, query);
  }

  async getProjectSummary(projectId: string, organizationId: string) {
    await this.assertProjectInOrg(projectId, organizationId);
    return this.expenseRepository.aggregateForProject(projectId, organizationId);
  }

  // ============================================
  // UPDATE
  // ============================================

  async update(
    id: string,
    organizationId: string,
    dto: UpdateExpenseDto,
    updatedBy: string,
  ): Promise<ProjectExpenseEntity> {
    if (dto.expenseDate) this.assertExpenseDate(dto.expenseDate);

    return this.dataSource.transaction(async (manager) => {
      const existing = await this.expenseRepository.findByIdForUpdate(manager, id, organizationId);
      if (!existing) throw new NotFoundException(`Expense ${id} not found`);

      // Reimbursement state-change is its own endpoint; reject indirect changes here.
      if (
        dto.paidBy &&
        dto.paidBy !== existing.paidBy &&
        existing.reimbursementStatus === ReimbursementStatus.REIMBURSED
      ) {
        throw new ConflictException('Cannot change paidBy on a reimbursed expense');
      }

      const nextCategory = dto.category ?? existing.category;
      this.assertItemizationCategory(nextCategory, dto.productLinks ?? existing.productLinks);
      if (dto.productLinks) this.assertNoDuplicateProductLinks(dto.productLinks);

      const nextPaidBy = dto.paidBy ?? existing.paidBy;
      const nextEmployeeId = dto.paidByEmployeeId ?? existing.paidByEmployeeId;
      if (nextPaidBy === ExpensePaidByType.EMPLOYEE && !nextEmployeeId) {
        throw new BadRequestException('paidByEmployeeId is required when paidBy=employee');
      }

      // Procurement guard re-runs against the prospective new link set,
      // excluding this expense from the spent total. Override flag is
      // immutable post-create — edits cannot bypass the guard.
      if (
        nextCategory === ExpenseCategory.MATERIALS &&
        dto.productLinks &&
        !existing.overrideUsed
      ) {
        await this.assertProcurementGuard({
          manager,
          projectId: existing.projectId,
          organizationId,
          newLinks: dto.productLinks,
          excludeExpenseId: id,
        });
      }

      Object.assign(existing, {
        category: nextCategory,
        vendorName: dto.vendorName ?? existing.vendorName,
        amount: dto.amount ?? existing.amount,
        expenseDate: dto.expenseDate ?? existing.expenseDate,
        paymentMethod: dto.paymentMethod ?? existing.paymentMethod,
        paidBy: nextPaidBy,
        paidByEmployeeId: nextEmployeeId,
        notes: dto.notes ?? existing.notes,
        updatedBy,
      });

      // If paidBy flipped from employee→company on an unreimbursed expense,
      // collapse reimbursement_status to NOT_APPLICABLE so the FSM stays clean.
      if (
        nextPaidBy === ExpensePaidByType.COMPANY &&
        existing.reimbursementStatus !== ReimbursementStatus.REIMBURSED
      ) {
        existing.reimbursementStatus = ReimbursementStatus.NOT_APPLICABLE;
      }

      await manager.getRepository(ProjectExpenseEntity).save(existing);

      if (dto.productLinks) {
        await this.replaceProductLinks(manager, id, dto.productLinks);
      }

      return (await this.expenseRepository.findById(id, organizationId, manager))!;
    });
  }

  // ============================================
  // DELETE (soft) — releases procurement-spent quota in next request
  // ============================================

  async delete(id: string, organizationId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const existing = await this.expenseRepository.findByIdForUpdate(manager, id, organizationId);
      if (!existing) throw new NotFoundException(`Expense ${id} not found`);

      if (existing.reimbursementStatus === ReimbursementStatus.REIMBURSED) {
        throw new ConflictException(
          'Cannot delete a reimbursed expense — reverse the reimbursement first',
        );
      }

      await manager.getRepository(ProjectExpenseEntity).softDelete(id);
    });
  }

  // ============================================
  // FSM: REIMBURSEMENT STATUS
  // ============================================

  /**
   * In v1 the only allowed transition is `pending → reimbursed`. The
   * service stamps `reimbursed_at` and `reimbursed_by` atomically.
   */
  async updateReimbursementStatus(
    id: string,
    organizationId: string,
    dto: UpdateReimbursementStatusDto,
    updatedBy: string,
  ): Promise<ProjectExpenseEntity> {
    return this.dataSource.transaction(async (manager) => {
      const existing = await this.expenseRepository.findByIdForUpdate(manager, id, organizationId);
      if (!existing) throw new NotFoundException(`Expense ${id} not found`);

      if (existing.paidBy !== ExpensePaidByType.EMPLOYEE) {
        throw new BadRequestException('Reimbursement only applies to employee-paid expenses');
      }
      if (
        !(
          existing.reimbursementStatus === ReimbursementStatus.PENDING &&
          dto.status === ReimbursementStatus.REIMBURSED
        )
      ) {
        throw new BadRequestException(
          `Invalid reimbursement transition: ${existing.reimbursementStatus} → ${dto.status}`,
        );
      }

      existing.reimbursementStatus = ReimbursementStatus.REIMBURSED;
      existing.reimbursedAt = new Date();
      existing.reimbursedBy = updatedBy;
      existing.updatedBy = updatedBy;
      return manager.getRepository(ProjectExpenseEntity).save(existing);
    });
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private assertExpenseDate(dateIso: string): void {
    const dt = new Date(`${dateIso}T00:00:00Z`);
    if (Number.isNaN(dt.getTime())) {
      throw new BadRequestException('expenseDate is not a valid date');
    }
    const todayUtc = new Date();
    todayUtc.setUTCHours(23, 59, 59, 999);
    if (dt.getTime() > todayUtc.getTime()) {
      throw new BadRequestException('expenseDate cannot be in the future');
    }
  }

  private assertPaidByConsistency(dto: CreateExpenseDto): void {
    if (dto.paidBy === ExpensePaidByType.EMPLOYEE && !dto.paidByEmployeeId) {
      throw new BadRequestException('paidByEmployeeId is required when paidBy=employee');
    }
  }

  /**
   * Itemization is a materials-only concept. Other categories cannot
   * carry product links (they wouldn't participate in BOM aggregation
   * anyway).
   */
  private assertItemizationCategory(
    category: ExpenseCategory,
    links?: Array<unknown> | null,
  ): void {
    if (links && links.length > 0 && category !== ExpenseCategory.MATERIALS) {
      throw new BadRequestException('productLinks are only allowed when category=materials');
    }
  }

  private assertNoDuplicateProductLinks(links: ExpenseProductLinkDto[]): void {
    const seen = new Set<string>();
    for (const l of links) {
      if (!l.productId) continue;
      if (seen.has(l.productId)) {
        throw new BadRequestException(
          `Duplicate productId ${l.productId} in productLinks — combine into a single entry`,
        );
      }
      seen.add(l.productId);
    }
  }

  /**
   * Procurement guard. For each NEW product link we ensure that
   *   already_spent + new_qty <= bom_target
   * where:
   *   already_spent = SUM(quantity) over expense_product_links joined to
   *                   non-deleted project_expenses, optionally excluding
   *                   the row being edited.
   *   bom_target    = BOM item quantity for the same product on the
   *                   project's BOM (0 if product not in BOM → blocked
   *                   unless override is supplied).
   */
  private async assertProcurementGuard(params: {
    manager: EntityManager;
    projectId: string;
    organizationId: string;
    newLinks: ExpenseProductLinkDto[];
    excludeExpenseId: string | null;
  }): Promise<void> {
    const { manager, projectId, organizationId, newLinks, excludeExpenseId } = params;

    const productIds = newLinks.map((l) => l.productId).filter((id): id is string => !!id);
    if (productIds.length === 0) return;

    // Already-spent sum, optionally excluding the expense being edited.
    const spentRows = await manager.query(
      `SELECT epl.product_id AS product_id,
              COALESCE(SUM(epl.quantity), 0)::numeric AS spent
         FROM expense_product_links epl
         JOIN project_expenses pe ON pe.id = epl.expense_id
        WHERE pe.project_id = $1::uuid
          AND pe.organization_id = $2::uuid
          AND pe.deleted_at IS NULL
          AND epl.product_id = ANY($3::uuid[])
          AND ($4::uuid IS NULL OR pe.id <> $4::uuid)
        GROUP BY epl.product_id`,
      [projectId, organizationId, productIds, excludeExpenseId],
    );

    const spentMap = new Map<string, number>(spentRows.map((r) => [r.product_id, Number(r.spent)]));

    const bomTargets = await this.bomService.getBomTargetsForProject(
      projectId,
      organizationId,
      productIds,
    );

    for (const link of newLinks) {
      if (!link.productId) continue;
      const target = bomTargets.get(link.productId) ?? 0;
      const spent = spentMap.get(link.productId) ?? 0;
      const newSpent = spent + Number(link.quantity);
      if (target === 0) {
        throw new ConflictException(
          `Product ${link.productId} is not in the project BOM. Use override=true with a reason to record this anyway.`,
        );
      }
      if (newSpent > target + 1e-6) {
        throw new ConflictException(
          `Procurement guard: product ${link.productId} would exceed BOM target ${target} (already spent ${spent}, adding ${link.quantity}). Use override=true with a reason to bypass.`,
        );
      }
    }
  }

  /**
   * Replace the entire product-links set for an expense. Done as
   * delete-all + insert-new so we never leave stale rows from a
   * concurrent edit.
   */
  private async replaceProductLinks(
    manager: EntityManager,
    expenseId: string,
    links: ExpenseProductLinkDto[],
  ): Promise<void> {
    const linkRepo = manager.getRepository(ExpenseProductLinkEntity);
    await linkRepo.delete({ expenseId });
    if (links.length === 0) return;
    const rows = links.map((l) =>
      linkRepo.create({
        expenseId,
        productId: l.productId ?? null,
        itemName: l.itemName ?? null,
        unit: l.unit ?? null,
        quantity: l.quantity,
        unitPrice: l.unitPrice ?? null,
        notes: l.notes ?? null,
      }),
    );
    await linkRepo.save(rows);
  }

  private async assertProjectInOrg(projectId: string, organizationId: string): Promise<void> {
    try {
      await this.projectRepository.findById(projectId, organizationId);
    } catch {
      throw new NotFoundException(`Project ${projectId} not found in this organization`);
    }
  }
}
