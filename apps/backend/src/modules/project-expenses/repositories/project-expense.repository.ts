import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { ExpenseCategory, ExpensePaidByType, ReimbursementStatus } from '@tejas96/shared/types';
import { Brackets, DataSource, EntityManager, IsNull, Repository } from 'typeorm';

import { ExpenseProductLinkEntity } from '../entities/expense-product-link.entity';
import { ProjectExpenseEntity } from '../entities/project-expense.entity';

export interface ListExpensesFilters {
  category?: ExpenseCategory;
  dateFrom?: string;
  dateTo?: string;
  vendorSearch?: string;
  paidBy?: ExpensePaidByType;
  reimbursementStatus?: ReimbursementStatus;
  page?: number;
  limit?: number;
}

/**
 * Data access for project_expenses. Reads always honor multi-tenancy
 * (organization_id filter) and exclude soft-deleted rows.
 */
@Injectable()
export class ProjectExpenseRepository {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  private repo(manager?: EntityManager): Repository<ProjectExpenseEntity> {
    return manager
      ? manager.getRepository(ProjectExpenseEntity)
      : this.dataSource.getRepository(ProjectExpenseEntity);
  }

  async findById(
    id: string,
    organizationId: string,
    manager?: EntityManager,
  ): Promise<ProjectExpenseEntity | null> {
    return this.repo(manager).findOne({
      where: { id, organizationId, deletedAt: IsNull() },
      relations: ['productLinks'],
    });
  }

  /**
   * Pessimistic lock for in-transaction edits. Returns null if the row
   * doesn't exist (or doesn't belong to org / is soft-deleted) so the
   * service can throw a clean NotFoundException.
   */
  async findByIdForUpdate(
    manager: EntityManager,
    id: string,
    organizationId: string,
  ): Promise<ProjectExpenseEntity | null> {
    const expense = await manager
      .getRepository(ProjectExpenseEntity)
      .createQueryBuilder('e')
      .setLock('pessimistic_write')
      .where('e.id = :id', { id })
      .andWhere('e.organization_id = :organizationId', { organizationId })
      .andWhere('e.deleted_at IS NULL')
      .getOne();
    if (!expense) return null;
    // Hydrate productLinks via the same EntityManager so they participate
    // in the same transaction. Lock is on the parent expense row only —
    // links are updated via insert/delete (never mutated in place).
    expense.productLinks = await manager
      .getRepository(ExpenseProductLinkEntity)
      .find({ where: { expenseId: id } });
    return expense;
  }

  async list(
    projectId: string,
    organizationId: string,
    filters: ListExpensesFilters,
  ): Promise<{ data: ProjectExpenseEntity[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.max(1, Math.min(200, filters.limit ?? 20));

    const qb = this.repo()
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.productLinks', 'links')
      .where('e.project_id = :projectId', { projectId })
      .andWhere('e.organization_id = :organizationId', { organizationId })
      .andWhere('e.deleted_at IS NULL');

    if (filters.category) qb.andWhere('e.category = :category', { category: filters.category });
    if (filters.paidBy) qb.andWhere('e.paid_by = :paidBy', { paidBy: filters.paidBy });
    if (filters.reimbursementStatus)
      qb.andWhere('e.reimbursement_status = :rs', { rs: filters.reimbursementStatus });
    if (filters.dateFrom)
      qb.andWhere('e.expense_date >= :dateFrom', { dateFrom: filters.dateFrom });
    if (filters.dateTo) qb.andWhere('e.expense_date <= :dateTo', { dateTo: filters.dateTo });
    if (filters.vendorSearch) {
      qb.andWhere(
        new Brackets((q) => {
          q.where('e.vendor_name ILIKE :v', { v: `%${filters.vendorSearch}%` });
        }),
      );
    }

    const [data, total] = await qb
      .orderBy('e.expenseDate', 'DESC')
      .addOrderBy('e.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  /**
   * Aggregated totals (independent query — never derived from a paged
   * list, per backend rules).
   */
  async aggregateForProject(
    projectId: string,
    organizationId: string,
  ): Promise<{
    total: number;
    byCategory: Array<{ category: ExpenseCategory; amount: number; count: number }>;
    pendingReimbursementAmount: number;
  }> {
    const totalsRows = await this.dataSource.query(
      `SELECT COALESCE(SUM(amount),0)::numeric AS total
         FROM project_expenses
        WHERE project_id = $1
          AND organization_id = $2
          AND deleted_at IS NULL`,
      [projectId, organizationId],
    );

    const byCatRows = await this.dataSource.query(
      `SELECT category,
              COALESCE(SUM(amount),0)::numeric AS amount,
              COUNT(*)::int                    AS count
         FROM project_expenses
        WHERE project_id = $1
          AND organization_id = $2
          AND deleted_at IS NULL
        GROUP BY category
        ORDER BY amount DESC`,
      [projectId, organizationId],
    );

    const pendingRows = await this.dataSource.query(
      `SELECT COALESCE(SUM(amount),0)::numeric AS pending
         FROM project_expenses
        WHERE project_id = $1
          AND organization_id = $2
          AND deleted_at IS NULL
          AND paid_by = 'employee'
          AND reimbursement_status = 'pending'`,
      [projectId, organizationId],
    );

    return {
      total: Number(totalsRows[0]?.total ?? 0),
      byCategory: byCatRows.map((r: { category: string; amount: string; count: number }) => ({
        category: r.category,
        amount: Number(r.amount),
        count: r.count,
      })),
      pendingReimbursementAmount: Number(pendingRows[0]?.pending ?? 0),
    };
  }

  /**
   * Sum spent quantity per product across all non-deleted expenses for
   * the project. Used by BomService.getProcurementStatus and by the
   * procurement guard in CreateExpense.
   */
  async sumSpentQuantitiesByProduct(
    projectId: string,
    organizationId: string,
    manager?: EntityManager,
  ): Promise<Map<string, number>> {
    const rows = await (manager ?? this.dataSource).query(
      `SELECT epl.product_id AS product_id,
              COALESCE(SUM(epl.quantity), 0)::numeric AS spent
         FROM expense_product_links epl
         JOIN project_expenses pe ON pe.id = epl.expense_id
        WHERE pe.project_id = $1
          AND pe.organization_id = $2
          AND pe.deleted_at IS NULL
          AND epl.product_id IS NOT NULL
        GROUP BY epl.product_id`,
      [projectId, organizationId],
    );
    const out = new Map<string, number>();
    for (const r of rows) out.set(r.product_id, Number(r.spent));
    return out;
  }
}
