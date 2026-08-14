import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { type PaginatedResponse } from '@tejas96/shared/types';
import { DataSource } from 'typeorm';

import { CustomerAgingDto, OutstandingTermDto } from '../dto';
import {
  CASH_FLOW_SQL,
  CUSTOMERS_AR_SQL,
  KPIS_SQL,
  LEDGER_COUNT_SQL,
  LEDGER_PAGE_SQL,
  OUTSTANDING_COUNT_SQL,
  OUTSTANDING_SQL,
  RECEIVABLES_BUCKETS_SQL,
  RECEIVABLES_COUNT_SQL,
  RECEIVABLES_SQL,
  SPEND_BY_CATEGORY_SQL,
  TOP_CUSTOMERS_OUTSTANDING_SQL,
} from './finance-ledger-queries.sql';

const rs = (paise: unknown): number => Number(paise ?? 0) / 100;

/** Widened to include 'year' — the client's date selector offers a yearly view. */
export type CashFlowGrain = 'day' | 'week' | 'month' | 'year';

export interface FinanceKpis {
  revenueInRange: number;
  spendInRange: number;
  netCashflowInRange: number;
  outstandingNow: number;
  overdueCountNow: number;
  receiptCountInRange: number;
  expenseCountInRange: number;
  unallocatedCredit: number;
  /** Meter installations completed in the period — dated by task completion. */
  meterInstallations: number;
}

/**
 * Org-wide finance reporting, read from the ledger views.
 *
 * Runs alongside `FinanceAggregationService`, which still serves the three
 * endpoints slated for removal (`customers/ar`, `vendors/spend`,
 * `projects/profitability`). Those keep reading the old tables until their
 * frontend pages are deleted — removing a backend route before its consumer is
 * gone just breaks the app mid-flight.
 *
 * Response shapes are unchanged on purpose. The values are now correct; the
 * contract is not being reshaped at the same time. Reshaping happens with the
 * frontend rewrite, not during a data migration.
 */
@Injectable()
export class FinanceReportingService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Headline numbers for the selected period.
   *
   * Note the deliberate asymmetry: revenue and spend are FLOWS bounded by
   * `value_date`, while outstanding is a SNAPSHOT as of today. Money owed does
   * not belong to a month, and conflating the two is how a dashboard ends up
   * claiming a customer "owes ₹X in March".
   */
  async getKpis(from: string, to: string): Promise<FinanceKpis> {
    const [row] = await this.dataSource.query(KPIS_SQL, [from, to]);
    return {
      revenueInRange: rs(row?.revenuePaise),
      spendInRange: rs(row?.spendPaise),
      netCashflowInRange: rs(row?.netPaise),
      outstandingNow: rs(row?.outstandingPaise),
      overdueCountNow: Number(row?.overdueCount ?? 0),
      receiptCountInRange: Number(row?.receiptCount ?? 0),
      expenseCountInRange: Number(row?.expenseCount ?? 0),
      unallocatedCredit: rs(row?.unallocatedPaise),
      meterInstallations: Number(row?.meterInstallations ?? 0),
    };
  }

  /**
   * Cash in/out over time. Empty periods come back as zeros rather than being
   * absent — a chart with gaps reads as missing data rather than as no activity.
   */
  async getCashFlow(
    from: string,
    to: string,
    grain: CashFlowGrain = 'month',
  ): Promise<Array<{ month: string; cashIn: number; cashOut: number; net: number }>> {
    const rows = await this.dataSource.query(CASH_FLOW_SQL, [from, to, grain]);
    return rows.map((r: Record<string, unknown>) => ({
      month: String(r.bucket),
      cashIn: rs(r.cashInPaise),
      cashOut: rs(r.cashOutPaise),
      net: rs(r.netPaise),
    }));
  }

  async getSpendByCategory(
    from: string,
    to: string,
  ): Promise<Array<{ category: string; total: number }>> {
    const rows = await this.dataSource.query(SPEND_BY_CATEGORY_SQL, [from, to]);
    return rows.map((r: Record<string, unknown>) => ({
      category: String(r.category),
      total: rs(r.totalPaise),
    }));
  }

  async getTopCustomersOutstanding(
    limit = 5,
  ): Promise<Array<{ customerId: string; customerName: string; outstanding: number }>> {
    const rows = await this.dataSource.query(TOP_CUSTOMERS_OUTSTANDING_SQL, [limit]);
    return rows.map((r: Record<string, unknown>) => ({
      customerId: String(r.customerId),
      customerName: (r.customerName as string) ?? 'Unknown',
      outstanding: rs(r.outstandingPaise),
    }));
  }

  /**
   * Per-customer AR ageing.
   *
   * The query already returns rupees under the DTO's own property names, so
   * rows pass straight through. `limit` is generous by default: this feeds the
   * customer Finance tab, which looks a single customer up in the result, so
   * truncating the list silently hides that customer's balance.
   */
  async getCustomersAr(limit = 1000): Promise<CustomerAgingDto[]> {
    return this.dataSource.query<CustomerAgingDto[]>(CUSTOMERS_AR_SQL, [limit]);
  }

  /**
   * Open payment terms — one row per unpaid milestone.
   *
   * Ordering is fixed at `days_overdue DESC`, which is what the only caller
   * asks for; see OutstandingQueryDto for why the other sort keys are gone.
   */
  async getOutstanding(opts: {
    customerId?: string | null;
    projectId?: string | null;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<OutstandingTermDto>> {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(200, Math.max(1, opts.limit ?? 20));
    const customerId = opts.customerId ?? null;
    const projectId = opts.projectId ?? null;

    const [rows, countRows] = await Promise.all([
      this.dataSource.query<OutstandingTermDto[]>(OUTSTANDING_SQL, [
        limit,
        (page - 1) * limit,
        customerId,
        projectId,
      ]),
      this.dataSource.query<{ count: number }[]>(OUTSTANDING_COUNT_SQL, [customerId, projectId]),
    ]);

    const total = Number(countRows[0]?.count ?? 0);
    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  /**
   * One paginated ledger for both directions.
   *
   * Replaces the separate receipts and expenses queries, which duplicated their
   * filtering, sorting and pagination logic and had already drifted apart.
   */
  async getEntries(opts: {
    direction?: 'in' | 'out' | null;
    from?: string | null;
    to?: string | null;
    projectId?: string | null;
    customerId?: string | null;
    search?: string | null;
    sortBy?: string | null;
    sortOrder?: 'asc' | 'desc' | null;
    page?: number;
    limit?: number;
  }): Promise<{ data: Record<string, unknown>[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(200, Math.max(1, opts.limit ?? 25));
    // Shared by the page and the count query, so "showing 1-25 of N" can never
    // disagree with the rows actually returned.
    const params = [
      opts.direction ?? null,
      opts.from ?? null,
      opts.to ?? null,
      opts.projectId ?? null,
      opts.customerId ?? null,
      opts.search ?? null,
    ];

    const [rows, [countRow]] = await Promise.all([
      this.dataSource.query(LEDGER_PAGE_SQL, [
        ...params,
        opts.sortBy ?? null,
        opts.sortOrder ?? 'desc',
        limit,
        (page - 1) * limit,
      ]),
      this.dataSource.query(LEDGER_COUNT_SQL, params),
    ]);

    return {
      data: rows.map((r: Record<string, unknown>) => ({
        ...r,
        amountPaise: Number(r.amountPaise),
        // rupee value for display; never sum these client-side
        amount: rs(r.amountPaise),
      })),
      total: Number(countRow?.count ?? 0),
      page,
      limit,
    };
  }

  /**
   * Open milestones across the org — the receivables screen.
   *
   * This is the client's requirement expressed directly: for every customer and
   * milestone, expected / received / short by. Waived milestones are excluded by
   * the view, so a written-off residual stops being chased.
   */
  async getReceivables(
    opts: {
      page?: number;
      limit?: number;
      bucket?: string | null;
      search?: string | null;
      sortBy?: string | null;
      sortOrder?: 'asc' | 'desc' | null;
    } = {},
  ): Promise<{
    data: Record<string, unknown>[];
    total: number;
    page: number;
    limit: number;
    buckets: Record<string, number>;
  }> {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(200, Math.max(1, opts.limit ?? 25));
    const filters = [opts.bucket ?? null, opts.search ?? null];

    const [rows, [countRow], [bucketRow]] = await Promise.all([
      this.dataSource.query(RECEIVABLES_SQL, [
        ...filters,
        opts.sortBy ?? null,
        opts.sortOrder ?? 'desc',
        limit,
        (page - 1) * limit,
      ]),
      this.dataSource.query(RECEIVABLES_COUNT_SQL, filters),
      // Bucket counts ignore the current bucket filter on purpose: the chips
      // must keep showing what is in every bucket, not just the selected one.
      this.dataSource.query(RECEIVABLES_BUCKETS_SQL, []),
    ]);

    return {
      data: rows.map((r: Record<string, unknown>) => ({
        ...r,
        expectedAmount: rs(r.expectedPaise),
        paidAmount: rs(r.allocatedPaise),
        outstandingAmount: rs(r.balancePaise),
        daysOverdue: Number(r.daysOverdue ?? 0),
      })),
      buckets: Object.fromEntries(
        Object.entries(bucketRow ?? {}).map(([k, v]) => [k, Number(v ?? 0)]),
      ),
      total: Number(countRow?.count ?? 0),
      page,
      limit,
    };
  }
}
