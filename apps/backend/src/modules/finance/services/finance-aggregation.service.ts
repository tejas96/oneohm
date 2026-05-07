import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { type PaginatedResponse } from '@oneohm-epc/shared/types';
import { DataSource } from 'typeorm';

import {
  DashboardDto,
  type ExpensesQueryDto,
  ExpenseListItemDto,
  type ReceiptsQueryDto,
  ReceiptListItemDto,
} from '../dto';

/**
 * FinanceAggregationService
 *
 * Org-wide read-only aggregations powering the Finance module pages.
 * All methods are single-SQL on existing tables (`payments`,
 * `project_payment_terms`, `project_expenses`, `projects`,
 * `customer_properties`, `customer_profiles`). No new entities, no
 * mutations — those continue to live on per-project endpoints.
 *
 * NOTE on vendors: `project_expenses.vendor_name` is free text. Vendor
 * grouping uses `LOWER(TRIM(vendor_name))` as the matching key. Two
 * slightly different spellings will appear as separate vendors. This is
 * documented inline on the V1 dashboard.
 */
@Injectable()
export class FinanceAggregationService {
  private readonly logger = new Logger(FinanceAggregationService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // ============================================
  // 1. DASHBOARD — single fat endpoint
  // ============================================
  async getDashboard(
    organizationId: string,
    fromInput?: string,
    toInput?: string,
  ): Promise<DashboardDto> {
    const { from, to } = this.resolveDateRange(fromInput, toInput);

    const [
      kpisRow,
      cashFlowRows,
      spendByCategoryRows,
      topCustomersRows,
      topVendorsRows,
      activityRows,
    ] = await Promise.all([
      this.queryDashboardKpis(organizationId, from, to),
      this.queryCashFlowMonthly(organizationId),
      this.querySpendByCategory(organizationId, from, to),
      this.queryTopCustomersOutstanding(organizationId, 5),
      this.queryTopVendorsSpend(organizationId, from, to, 5),
      this.queryRecentActivity(organizationId, 10),
    ]);

    const revenueInRange = Number(kpisRow.revenueInRange ?? 0);
    const spendInRange = Number(kpisRow.spendInRange ?? 0);

    const dto: DashboardDto = {
      range: { from, to },
      kpis: {
        revenueInRange,
        spendInRange,
        netCashflowInRange: revenueInRange - spendInRange,
        outstandingNow: Number(kpisRow.outstandingNow ?? 0),
        overdueCountNow: Number(kpisRow.overdueCountNow ?? 0),
        avgDaysToCollectTrailing90: Number(kpisRow.avgDaysToCollect ?? 0),
      },
      cashFlowMonthly: cashFlowRows.map((r) => ({
        month: r.month,
        cashIn: Number(r.cashIn ?? 0),
        cashOut: Number(r.cashOut ?? 0),
        net: Number(r.cashIn ?? 0) - Number(r.cashOut ?? 0),
      })),
      spendByCategory: spendByCategoryRows.map((r) => ({
        category: r.category,
        total: Number(r.total ?? 0),
      })),
      topCustomersOutstanding: topCustomersRows.map((r) => ({
        customerId: r.customerId,
        customerName: r.customerName,
        outstanding: Number(r.outstanding ?? 0),
      })),
      topVendorsSpend: topVendorsRows.map((r) => ({
        vendorKey: r.vendorKey,
        vendorName: r.vendorName,
        totalSpend: Number(r.totalSpend ?? 0),
      })),
      recentActivity: activityRows.map((r) => ({
        type: r.type,
        id: r.id,
        projectId: r.projectId,
        projectName: r.projectName,
        amount: Number(r.amount ?? 0),
        at: new Date(r.at),
      })),
    };

    return dto;
  }

  // ============================================
  // 2. RECEIPTS LEDGER (org-wide, paginated)
  // ============================================
  async getReceipts(
    organizationId: string,
    query: ReceiptsQueryDto,
  ): Promise<PaginatedResponse<ReceiptListItemDto>> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = Math.min(query.limit && query.limit > 0 ? query.limit : 25, 5000);
    const offset = (page - 1) * limit;

    const params: unknown[] = [organizationId];
    let where = ` p.organization_id = $1 AND p.deleted_at IS NULL `;

    if (query.status) {
      params.push(query.status);
      where += ` AND p.status = $${params.length} `;
    }
    if (query.dateFrom) {
      params.push(query.dateFrom);
      where += ` AND p.created_at >= $${params.length}::timestamptz `;
    }
    if (query.dateTo) {
      params.push(query.dateTo);
      where += ` AND p.created_at < ($${params.length}::date + INTERVAL '1 day') `;
    }
    if (query.customerId) {
      params.push(query.customerId);
      where += ` AND cp.customer_id = $${params.length}::uuid `;
    }
    if (query.projectId) {
      params.push(query.projectId);
      where += ` AND p.project_id = $${params.length}::uuid `;
    }
    if (query.search?.trim()) {
      params.push(`%${query.search.trim().toLowerCase()}%`);
      where += `
        AND (
          LOWER(p.payment_number)        LIKE $${params.length}
          OR LOWER(COALESCE(p.payment_reference, '')) LIKE $${params.length}
          OR LOWER(COALESCE(prof.first_name, '') || ' ' || COALESCE(prof.last_name, '')) LIKE $${params.length}
          OR LOWER(COALESCE(proj.name, '')) LIKE $${params.length}
        )
      `;
    }

    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM payments p
      LEFT JOIN projects proj           ON proj.id = p.project_id
      LEFT JOIN customer_properties cp  ON cp.id   = proj.property_id
      LEFT JOIN customer_profiles prof  ON prof.id = p.customer_id
      WHERE ${where}
    `;
    const countRows = await this.dataSource.query<{ total: number }[]>(countSql, params);
    const total = Number(countRows[0]?.total ?? 0);

    const dataParams = [...params, limit, offset];
    const dataSql = `
      SELECT
        p.id,
        p.payment_number                        AS "paymentNumber",
        p.paid_amount                           AS "paidAmount",
        p.expected_amount                       AS "expectedAmount",
        p.payment_method                        AS "paymentMethod",
        p.status,
        p.payment_reference                     AS "paymentReference",
        p.payment_term_id                       AS "paymentTermId",
        p.created_at                            AS "createdAt",
        p.reconciled_at                         AS "reconciledAt",
        p.project_id                            AS "projectId",
        proj.project_number                     AS "projectNumber",
        proj.name                               AS "projectName",
        p.customer_id                           AS "customerId",
        TRIM(CONCAT(
          COALESCE(prof.first_name, ''), ' ',
          COALESCE(prof.last_name, '')
        ))                                      AS "customerName",
        prof.phone                              AS "customerPhone",
        prof.email                              AS "customerEmail",
        NULLIF(TRIM(BOTH ', ' FROM CONCAT_WS(', ',
          NULLIF(prof.address, ''),
          NULLIF(prof.city, ''),
          NULLIF(prof.state, ''),
          NULLIF(prof.pincode, '')
        )), '')                                 AS "customerAddressLine"
      FROM payments p
      LEFT JOIN projects proj           ON proj.id = p.project_id
      LEFT JOIN customer_properties cp  ON cp.id   = proj.property_id
      LEFT JOIN customer_profiles prof  ON prof.id = p.customer_id
      WHERE ${where}
      ORDER BY p.created_at DESC
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
    `;
    const rows = await this.dataSource.query<RawReceiptRow[]>(dataSql, dataParams);

    return {
      data: rows.map(this.mapReceiptRow),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  // ============================================
  // 3. EXPENSES LEDGER (org-wide, paginated)
  // ============================================
  async getExpenses(
    organizationId: string,
    query: ExpensesQueryDto,
  ): Promise<PaginatedResponse<ExpenseListItemDto>> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = Math.min(query.limit && query.limit > 0 ? query.limit : 25, 5000);
    const offset = (page - 1) * limit;

    const params: unknown[] = [organizationId];
    let where = ` e.organization_id = $1 AND e.deleted_at IS NULL `;

    if (query.category) {
      params.push(query.category);
      where += ` AND e.category = $${params.length} `;
    }
    if (query.paidBy) {
      params.push(query.paidBy);
      where += ` AND e.paid_by = $${params.length} `;
    }
    if (query.reimbursementStatus) {
      params.push(query.reimbursementStatus);
      where += ` AND e.reimbursement_status = $${params.length} `;
    }
    if (query.vendorSearch?.trim()) {
      params.push(`%${query.vendorSearch.trim().toLowerCase()}%`);
      where += ` AND LOWER(COALESCE(e.vendor_name, '')) LIKE $${params.length} `;
    }
    if (query.projectId) {
      params.push(query.projectId);
      where += ` AND e.project_id = $${params.length}::uuid `;
    }
    if (query.dateFrom) {
      params.push(query.dateFrom);
      where += ` AND e.expense_date >= $${params.length}::date `;
    }
    if (query.dateTo) {
      params.push(query.dateTo);
      where += ` AND e.expense_date <= $${params.length}::date `;
    }

    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM project_expenses e
      LEFT JOIN projects proj ON proj.id = e.project_id
      WHERE ${where}
    `;
    const countRows = await this.dataSource.query<{ total: number }[]>(countSql, params);
    const total = Number(countRows[0]?.total ?? 0);

    const dataParams = [...params, limit, offset];
    const dataSql = `
      SELECT
        e.id,
        e.expense_number          AS "expenseNumber",
        e.category,
        e.vendor_name             AS "vendorName",
        e.amount,
        e.currency,
        e.expense_date            AS "expenseDate",
        e.payment_method          AS "paymentMethod",
        e.paid_by                 AS "paidBy",
        e.reimbursement_status    AS "reimbursementStatus",
        e.notes,
        e.created_at              AS "createdAt",
        e.project_id              AS "projectId",
        proj.project_number       AS "projectNumber",
        proj.name                 AS "projectName"
      FROM project_expenses e
      LEFT JOIN projects proj ON proj.id = e.project_id
      WHERE ${where}
      ORDER BY e.expense_date DESC, e.created_at DESC
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
    `;
    const rows = await this.dataSource.query<RawExpenseRow[]>(dataSql, dataParams);

    return {
      data: rows.map(this.mapExpenseRow),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  // ============================================
  // PRIVATE: dashboard sub-queries
  // ============================================

  /**
   * KPI bundle in a single SQL pass:
   *  - revenueInRange   : SUM(payments.paid_amount) for cleared receipts in [from,to]
   *  - spendInRange     : SUM(project_expenses.amount) for expense_date in [from,to]
   *  - outstandingNow   : SUM(expected_amount - paid_amount) over open terms
   *  - overdueCountNow  : count of open terms with due_date < today
   *  - avgDaysToCollect : avg(first_receipt.created_at - term.due_date) trailing 90d
   */
  private async queryDashboardKpis(
    organizationId: string,
    from: string,
    to: string,
  ): Promise<RawKpiRow> {
    const sql = `
      WITH params AS (
        SELECT
          $1::uuid       AS org_id,
          $2::date       AS from_d,
          $3::date       AS to_d,
          CURRENT_DATE   AS today
      ),
      revenue AS (
        SELECT COALESCE(SUM(p.paid_amount), 0)::numeric AS total
        FROM payments p, params
        WHERE p.organization_id = params.org_id
          AND p.deleted_at IS NULL
          AND p.status IN ('received','verified','cleared')
          AND p.created_at >= params.from_d::timestamptz
          AND p.created_at <  (params.to_d::date + INTERVAL '1 day')
      ),
      spend AS (
        SELECT COALESCE(SUM(e.amount), 0)::numeric AS total
        FROM project_expenses e, params
        WHERE e.organization_id = params.org_id
          AND e.deleted_at IS NULL
          AND e.expense_date BETWEEN params.from_d AND params.to_d
      ),
      outstanding AS (
        SELECT
          COALESCE(SUM(t.expected_amount - t.paid_amount), 0)::numeric AS total,
          COUNT(*) FILTER (
            WHERE t.due_date IS NOT NULL AND t.due_date < (SELECT today FROM params)
          )::int AS overdue_count
        FROM project_payment_terms t, params
        WHERE t.organization_id = params.org_id
          AND t.deleted_at IS NULL
          AND t.status NOT IN ('waived','cancelled')
          AND t.expected_amount > t.paid_amount
      ),
      collection AS (
        SELECT AVG(EXTRACT(EPOCH FROM (first_receipt - t.due_date::timestamptz)) / 86400.0)::numeric AS avg_days
        FROM project_payment_terms t
        JOIN LATERAL (
          SELECT MIN(p.created_at) AS first_receipt
          FROM payments p
          WHERE p.payment_term_id = t.id
            AND p.deleted_at IS NULL
            AND p.status IN ('received','verified','cleared')
        ) fr ON TRUE,
        params
        WHERE t.organization_id = params.org_id
          AND t.deleted_at IS NULL
          AND t.due_date IS NOT NULL
          AND fr.first_receipt IS NOT NULL
          AND fr.first_receipt >= (params.today - INTERVAL '90 days')
      )
      SELECT
        revenue.total      AS "revenueInRange",
        spend.total        AS "spendInRange",
        outstanding.total  AS "outstandingNow",
        outstanding.overdue_count AS "overdueCountNow",
        COALESCE(collection.avg_days, 0) AS "avgDaysToCollect"
      FROM revenue, spend, outstanding, collection
    `;
    const rows = await this.dataSource.query<RawKpiRow[]>(sql, [organizationId, from, to]);
    return (
      rows[0] ?? {
        revenueInRange: 0,
        spendInRange: 0,
        outstandingNow: 0,
        overdueCountNow: 0,
        avgDaysToCollect: 0,
      }
    );
  }

  /** Last 12 calendar months including current. */
  private async queryCashFlowMonthly(organizationId: string): Promise<RawCashFlowRow[]> {
    const sql = `
      WITH months AS (
        SELECT TO_CHAR(d, 'YYYY-MM') AS month, d::date AS first_day
        FROM generate_series(
          DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months',
          DATE_TRUNC('month', CURRENT_DATE),
          INTERVAL '1 month'
        ) AS d
      ),
      cash_in AS (
        SELECT TO_CHAR(DATE_TRUNC('month', p.created_at), 'YYYY-MM') AS month,
               SUM(p.paid_amount)::numeric AS total
        FROM payments p
        WHERE p.organization_id = $1
          AND p.deleted_at IS NULL
          AND p.status IN ('received','verified','cleared')
          AND p.created_at >= (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months')
        GROUP BY 1
      ),
      cash_out AS (
        SELECT TO_CHAR(DATE_TRUNC('month', e.expense_date), 'YYYY-MM') AS month,
               SUM(e.amount)::numeric AS total
        FROM project_expenses e
        WHERE e.organization_id = $1
          AND e.deleted_at IS NULL
          AND e.expense_date >= (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months')::date
        GROUP BY 1
      )
      SELECT
        m.month,
        COALESCE(cash_in.total,  0) AS "cashIn",
        COALESCE(cash_out.total, 0) AS "cashOut"
      FROM months m
      LEFT JOIN cash_in  ON cash_in.month  = m.month
      LEFT JOIN cash_out ON cash_out.month = m.month
      ORDER BY m.month ASC
    `;
    return this.dataSource.query<RawCashFlowRow[]>(sql, [organizationId]);
  }

  private async querySpendByCategory(
    organizationId: string,
    from: string,
    to: string,
  ): Promise<RawSpendByCategoryRow[]> {
    const sql = `
      SELECT e.category, COALESCE(SUM(e.amount), 0)::numeric AS total
      FROM project_expenses e
      WHERE e.organization_id = $1
        AND e.deleted_at IS NULL
        AND e.expense_date BETWEEN $2::date AND $3::date
      GROUP BY e.category
      ORDER BY total DESC
    `;
    return this.dataSource.query<RawSpendByCategoryRow[]>(sql, [organizationId, from, to]);
  }

  private async queryTopCustomersOutstanding(
    organizationId: string,
    limit: number,
  ): Promise<RawTopCustomerRow[]> {
    const sql = `
      SELECT
        c.id                                                              AS "customerId",
        TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) AS "customerName",
        SUM(t.expected_amount - t.paid_amount)::numeric                   AS outstanding
      FROM project_payment_terms t
      JOIN projects p           ON p.id  = t.project_id
      JOIN customer_properties cp ON cp.id = p.property_id
      JOIN customer_profiles c  ON c.id  = cp.customer_id
      WHERE t.organization_id = $1
        AND t.deleted_at IS NULL
        AND t.status NOT IN ('waived','cancelled')
        AND t.expected_amount > t.paid_amount
      GROUP BY c.id, c.first_name, c.last_name
      ORDER BY outstanding DESC
      LIMIT $2
    `;
    return this.dataSource.query<RawTopCustomerRow[]>(sql, [organizationId, limit]);
  }

  private async queryTopVendorsSpend(
    organizationId: string,
    from: string,
    to: string,
    limit: number,
  ): Promise<RawTopVendorRow[]> {
    const sql = `
      SELECT
        LOWER(TRIM(e.vendor_name))                          AS "vendorKey",
        (ARRAY_AGG(e.vendor_name ORDER BY e.created_at))[1] AS "vendorName",
        SUM(e.amount)::numeric                              AS "totalSpend"
      FROM project_expenses e
      WHERE e.organization_id = $1
        AND e.deleted_at IS NULL
        AND e.vendor_name IS NOT NULL
        AND TRIM(e.vendor_name) <> ''
        AND e.expense_date BETWEEN $2::date AND $3::date
      GROUP BY LOWER(TRIM(e.vendor_name))
      ORDER BY "totalSpend" DESC
      LIMIT $4
    `;
    return this.dataSource.query<RawTopVendorRow[]>(sql, [organizationId, from, to, limit]);
  }

  private async queryRecentActivity(
    organizationId: string,
    limit: number,
  ): Promise<RawActivityRow[]> {
    const sql = `
      (
        SELECT
          'receipt'::text         AS type,
          p.id                    AS id,
          p.project_id            AS "projectId",
          proj.name               AS "projectName",
          p.paid_amount::numeric  AS amount,
          p.created_at            AS at
        FROM payments p
        LEFT JOIN projects proj ON proj.id = p.project_id
        WHERE p.organization_id = $1
          AND p.deleted_at IS NULL
        ORDER BY p.created_at DESC
        LIMIT $2
      )
      UNION ALL
      (
        SELECT
          'expense'::text         AS type,
          e.id                    AS id,
          e.project_id            AS "projectId",
          proj.name               AS "projectName",
          e.amount::numeric       AS amount,
          e.created_at            AS at
        FROM project_expenses e
        LEFT JOIN projects proj ON proj.id = e.project_id
        WHERE e.organization_id = $1
          AND e.deleted_at IS NULL
        ORDER BY e.created_at DESC
        LIMIT $2
      )
      ORDER BY at DESC
      LIMIT $2
    `;
    return this.dataSource.query<RawActivityRow[]>(sql, [organizationId, limit]);
  }

  // ============================================
  // PRIVATE: utilities
  // ============================================

  /**
   * Default range = current month if either bound is missing. Strings are
   * already validated as YYYY-MM-DD by class-validator.
   */
  private resolveDateRange(from?: string, to?: string): { from: string; to: string } {
    if (from && to) return { from, to };
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const startOfMonth = new Date(y, m, 1);
    const endOfMonth = new Date(y, m + 1, 0);
    const fmt = (d: Date): string =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { from: from ?? fmt(startOfMonth), to: to ?? fmt(endOfMonth) };
  }

  /**
   * The pg driver hydrates `date` columns as JS Date objects (UTC midnight
   * shifted by local TZ). Coerce back to canonical YYYY-MM-DD so the
   * value matches what the create/update DTOs accept.
   */
  private formatDateOnly(value: string | Date): string {
    if (typeof value === 'string') return value.length >= 10 ? value.slice(0, 10) : value;
    const d = value;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private mapReceiptRow = (r: RawReceiptRow): ReceiptListItemDto => ({
    id: r.id,
    paymentNumber: r.paymentNumber,
    paidAmount: Number(r.paidAmount ?? 0),
    expectedAmount: Number(r.expectedAmount ?? 0),
    paymentMethod: r.paymentMethod,
    status: r.status,
    paymentReference: r.paymentReference,
    paymentTermId: r.paymentTermId,
    createdAt: new Date(r.createdAt),
    reconciledAt: r.reconciledAt ? new Date(r.reconciledAt) : null,
    projectId: r.projectId,
    projectNumber: r.projectNumber,
    projectName: r.projectName,
    customerId: r.customerId,
    customerName: r.customerName?.trim() || '',
    customerPhone: r.customerPhone,
    customerEmail: r.customerEmail,
    customerAddressLine: r.customerAddressLine,
  });

  private mapExpenseRow = (r: RawExpenseRow): ExpenseListItemDto => ({
    id: r.id,
    expenseNumber: r.expenseNumber,
    category: r.category,
    vendorName: r.vendorName,
    amount: Number(r.amount ?? 0),
    currency: r.currency,
    expenseDate: this.formatDateOnly(r.expenseDate),
    paymentMethod: r.paymentMethod,
    paidBy: r.paidBy,
    reimbursementStatus: r.reimbursementStatus,
    notes: r.notes,
    createdAt: new Date(r.createdAt),
    projectId: r.projectId,
    projectNumber: r.projectNumber,
    projectName: r.projectName,
  });
}

// ============================================
// Internal raw row types (untyped at SQL boundary)
// ============================================
interface RawKpiRow {
  revenueInRange: string | number;
  spendInRange: string | number;
  outstandingNow: string | number;
  overdueCountNow: string | number;
  avgDaysToCollect: string | number;
}

interface RawCashFlowRow {
  month: string;
  cashIn: string | number;
  cashOut: string | number;
}

interface RawSpendByCategoryRow {
  category: ExpenseListItemDto['category'];
  total: string | number;
}

interface RawTopCustomerRow {
  customerId: string;
  customerName: string;
  outstanding: string | number;
}

interface RawTopVendorRow {
  vendorKey: string;
  vendorName: string;
  totalSpend: string | number;
}

interface RawActivityRow {
  type: 'receipt' | 'expense';
  id: string;
  projectId: string;
  projectName: string;
  amount: string | number;
  at: string;
}

interface RawReceiptRow {
  id: string;
  paymentNumber: string;
  paidAmount: string | number;
  expectedAmount: string | number;
  paymentMethod: ReceiptListItemDto['paymentMethod'];
  status: ReceiptListItemDto['status'];
  paymentReference: string | null;
  paymentTermId: string | null;
  createdAt: string;
  reconciledAt: string | null;
  projectId: string;
  projectNumber: string;
  projectName: string;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  customerAddressLine: string | null;
}

interface RawExpenseRow {
  id: string;
  expenseNumber: string;
  category: ExpenseListItemDto['category'];
  vendorName: string | null;
  amount: string | number;
  currency: string;
  expenseDate: string | Date;
  paymentMethod: ExpenseListItemDto['paymentMethod'];
  paidBy: ExpenseListItemDto['paidBy'];
  reimbursementStatus: ExpenseListItemDto['reimbursementStatus'];
  notes: string | null;
  createdAt: string;
  projectId: string;
  projectNumber: string;
  projectName: string;
}
