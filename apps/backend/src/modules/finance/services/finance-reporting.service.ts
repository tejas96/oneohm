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
  RECOVERY_BUCKETS_SQL,
  RECOVERY_COUNT_SQL,
  RECOVERY_PAGE_SQL,
  SPEND_BY_CATEGORY_SQL,
  TOP_CUSTOMERS_OUTSTANDING_SQL,
} from './finance-ledger-queries.sql';
import {
  PAYABLES_COUNT_SQL,
  PAYABLES_PAGE_SQL,
  PAYABLES_TOTALS_SQL,
  VENDOR_PAYABLE_BY_PROJECT_SQL,
  VENDOR_PAYABLE_ENTRIES_COUNT_SQL,
  VENDOR_PAYABLE_ENTRIES_SQL,
} from './finance-payables-queries.sql';

const rs = (paise: unknown): number => Number(paise ?? 0) / 100;

/** Widened to include 'year' — the client's date selector offers a yearly view. */
export type CashFlowGrain = 'day' | 'week' | 'month' | 'year';

export interface FinanceKpis {
  revenueInRange: number;
  /** Cash spent on the work: expenses and vendor payments. Refunds are not spend. */
  spendInRange: number;
  /** Cash handed back to customers. Summed apart from spend; Net subtracts both. */
  refundInRange: number;
  netCashflowInRange: number;
  outstandingNow: number;
  overdueCountNow: number;
  /** Of `outstandingNow`, how much is past its due date. Same population. */
  overdueNow: number;
  /** Counts are of entries still standing at the end of the period. */
  receiptCountInRange: number;
  /** Cash expenses only — vendor payments and refunds are counted on their own. */
  expenseCountInRange: number;
  vendorPaymentCountInRange: number;
  refundCountInRange: number;
  unallocatedCredit: number;
  /** Meter installations completed in the period — dated by task completion. */
  meterInstallations: number;
  /** What we owe vendors, netted. A snapshot as of today, like `outstandingNow`. */
  vendorPayable: number;
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
  async getKpis(from: string, to: string, search?: string | null): Promise<FinanceKpis> {
    const [row] = await this.dataSource.query(KPIS_SQL, [from, to, search ?? null]);
    return {
      revenueInRange: rs(row?.revenuePaise),
      spendInRange: rs(row?.spendPaise),
      refundInRange: rs(row?.refundPaise),
      netCashflowInRange: rs(row?.netPaise),
      outstandingNow: rs(row?.outstandingPaise),
      overdueCountNow: Number(row?.overdueCount ?? 0),
      overdueNow: rs(row?.overduePaise),
      receiptCountInRange: Number(row?.receiptCount ?? 0),
      expenseCountInRange: Number(row?.expenseCount ?? 0),
      vendorPaymentCountInRange: Number(row?.vendorPaymentCount ?? 0),
      refundCountInRange: Number(row?.refundCount ?? 0),
      unallocatedCredit: rs(row?.unallocatedPaise),
      meterInstallations: Number(row?.meterInstallations ?? 0),
      vendorPayable: rs(row?.vendorPayablePaise),
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
    search?: string | null,
  ): Promise<Array<{ month: string; cashIn: number; cashOut: number; net: number }>> {
    const rows = await this.dataSource.query(CASH_FLOW_SQL, [from, to, grain, search ?? null]);
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
        // Paise only. A rupee `amount` used to ride along beside it; nothing read
        // it, and two units of the same money in one row is how a component
        // ends up adding the wrong one.
        amountPaise: Number(r.amountPaise),
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
      scope?: string | null;
      funding?: string | null;
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
    // Shared by RECEIVABLES_SQL and RECEIVABLES_COUNT_SQL, which both expand
    // RECEIVABLES_FILTERS: $1 bucket, $2 search, $3 scope, $4 funding.
    const filters = [
      opts.bucket ?? null,
      opts.search ?? null,
      opts.scope ?? null,
      opts.funding ?? null,
    ];

    const [rows, [countRow], [bucketRow]] = await Promise.all([
      this.dataSource.query(RECEIVABLES_SQL, [
        ...filters,
        opts.sortBy ?? null,
        opts.sortOrder ?? 'desc',
        limit,
        (page - 1) * limit,
      ]),
      this.dataSource.query(RECEIVABLES_COUNT_SQL, filters),
      // Follows `search`, `scope` and `funding` but not `bucket`: those three
      // narrow the whole page, so the headline totals must follow them, while
      // selecting one ageing chip must not zero the counts on the others.
      // RECEIVABLES_BUCKETS_SQL does NOT share RECEIVABLES_FILTERS and has its
      // own, independent placeholder numbering: $1 search, $2 scope, $3
      // funding — bucket is never passed to it at all.
      this.dataSource.query(RECEIVABLES_BUCKETS_SQL, [
        opts.search ?? null,
        opts.scope ?? null,
        opts.funding ?? null,
      ]),
    ]);

    return {
      data: rows.map((r: Record<string, unknown>) => ({
        ...r,
        expectedAmount: rs(r.expectedPaise),
        paidAmount: rs(r.allocatedPaise),
        outstandingAmount: rs(r.balancePaise),
        daysOverdue: Number(r.daysOverdue ?? 0),
        // Raw bigint columns straight off the view, not SUM results — but
        // node-postgres still hands bigint back as a string either way, same
        // as getPayables below. AttachBankDialog (receivables-columns.tsx)
        // holds this raw value instead of formatting it, so it must arrive
        // as a number, not a string that happens to divide correctly.
        expectedPaise: Number(r.expectedPaise),
        allocatedPaise: Number(r.allocatedPaise),
        balancePaise: Number(r.balancePaise),
      })),
      buckets: Object.fromEntries(
        Object.entries(bucketRow ?? {}).map(([k, v]) => [k, Number(v ?? 0)]),
      ),
      total: Number(countRow?.count ?? 0),
      page,
      limit,
    };
  }

  /**
   * Recovery, one row per project — the call list. Same page / limit / sort
   * contract as `getReceivables`; every figure is computed server-side over
   * the whole list, never summed from the visible page.
   */
  async getRecovery(
    opts: {
      page?: number;
      limit?: number;
      funding?: string | null;
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
    // $1 funding, $2 search in every query; $3 bucket in page and count only.
    const base = [opts.funding ?? null, opts.search ?? null];
    const filters = [...base, opts.bucket ?? null];

    const [rows, [countRow], [bucketRow]] = await Promise.all([
      this.dataSource.query(RECOVERY_PAGE_SQL, [
        ...filters,
        opts.sortBy ?? null,
        opts.sortOrder ?? 'desc',
        limit,
        (page - 1) * limit,
      ]),
      this.dataSource.query(RECOVERY_COUNT_SQL, filters),
      this.dataSource.query(RECOVERY_BUCKETS_SQL, base),
    ]);

    return {
      data: rows.map((r: Record<string, unknown>) => ({
        ...r,
        // bigint arrives as a string; adding two would concatenate.
        outstandingPaise: Number(r.outstandingPaise),
        overduePaise: Number(r.overduePaise),
        undatedPaise: Number(r.undatedPaise),
      })),
      buckets: Object.fromEntries(
        Object.entries(bucketRow ?? {}).map(([k, v]) => [k, Number(v ?? 0)]),
      ),
      total: Number(countRow?.count ?? 0),
      page,
      limit,
    };
  }

  /**
   * What we owe each vendor — a net balance per vendor, not bill-by-bill.
   *
   * `payablePaise` may be NEGATIVE: that is an advance, money paid ahead of
   * any bill, and it is never clamped to zero. `totals` sums debts and
   * advances SEPARATELY and never nets them — owing one vendor while holding
   * an advance with another is a debt and a credit, not one smaller number.
   * A soft-deleted vendor still carrying a balance stays in the list,
   * flagged `isInactive`; only a soft-deleted vendor at exactly zero
   * disappears.
   *
   * Mirrors `getReceivables` exactly: same option names, same one-indexed
   * page, same offset maths, three queries in one `Promise.all`.
   */
  /**
   * The credit bills and payments behind one vendor's payable, newest first,
   * with the balance after each line. At most 100 lines; `total` says how many
   * exist so the screen can say when older ones are not shown.
   */
  async getVendorPayableEntries(
    vendorId: string,
  ): Promise<{ data: Record<string, unknown>[]; total: number }> {
    const [rows, [countRow]] = await Promise.all([
      this.dataSource.query(VENDOR_PAYABLE_ENTRIES_SQL, [vendorId]),
      this.dataSource.query(VENDOR_PAYABLE_ENTRIES_COUNT_SQL, [vendorId]),
    ]);
    return {
      // Coerce bigints: node-postgres hands them over as strings, and adding
      // two of those would concatenate.
      data: rows.map((r: Record<string, unknown>) => ({
        ...r,
        amountPaise: Number(r.amountPaise),
        balanceAfterPaise: Number(r.balanceAfterPaise),
      })),
      total: Number(countRow?.count ?? 0),
    };
  }

  /**
   * Projects this vendor is still owed on, with any payment already waiting
   * approval — and the vendor's whole balance read in the same request, so the
   * Pay dialog never sets fresh per-project figures beside a total copied from
   * the list when Pay was clicked.
   */
  async getVendorPayableByProject(vendorId: string): Promise<{
    data: Array<{
      projectId: string;
      projectNumber: string | null;
      projectName: string | null;
      customerName: string | null;
      owedPaise: number;
      waitingPaise: number;
    }>;
    vendorPayablePaise: number;
  }> {
    const [rows, [totalRow]]: [
      Array<Record<string, unknown>>,
      Array<{ payablePaise: string | number } | undefined>,
    ] = await Promise.all([
      this.dataSource.query(VENDOR_PAYABLE_BY_PROJECT_SQL, [vendorId]),
      this.dataSource.query(
        'SELECT payable_paise AS "payablePaise" FROM v_vendor_payable WHERE vendor_id = $1',
        [vendorId],
      ),
    ]);
    return {
      vendorPayablePaise: Number(totalRow?.payablePaise ?? 0),
      data: rows.map((r) => ({
        projectId: String(r.projectId),
        projectNumber: (r.projectNumber as string | null) ?? null,
        projectName: (r.projectName as string | null) ?? null,
        customerName: (r.customerName as string | null) ?? null,
        // bigint arrives as a string; see getVendorPayableEntries.
        owedPaise: Number(r.owedPaise),
        waitingPaise: Number(r.waitingPaise),
      })),
    };
  }

  async getPayables(
    opts: {
      page?: number;
      limit?: number;
      search?: string | null;
      onlyOwing?: boolean | null;
    } = {},
  ): Promise<{
    data: Record<string, unknown>[];
    total: number;
    page: number;
    limit: number;
    totals: { totalPayablePaise: number; vendorsOwedCount: number; advancePaise: number };
  }> {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(200, Math.max(1, opts.limit ?? 25));
    // Shared by PAYABLES_PAGE_SQL and PAYABLES_COUNT_SQL: $1 search, $2 onlyOwing.
    const filters = [opts.search ?? null, opts.onlyOwing ?? null];

    const [rows, [countRow], [totalsRow]] = await Promise.all([
      this.dataSource.query(PAYABLES_PAGE_SQL, [...filters, limit, (page - 1) * limit]),
      this.dataSource.query(PAYABLES_COUNT_SQL, filters),
      // Follows `search` only, not `onlyOwing`: the headline totals describe
      // every vendor matching the search, not just the page's filtered rows —
      // the same reason RECEIVABLES_BUCKETS_SQL ignores `bucket`.
      this.dataSource.query(PAYABLES_TOTALS_SQL, [opts.search ?? null]),
    ]);

    return {
      data: rows.map((r: Record<string, unknown>) => ({
        ...r,
        // Raw bigint columns straight off the view, not SUM results — but
        // node-postgres still hands bigint back as a string either way.
        payablePaise: Number(r.payablePaise),
        billedPaise: Number(r.billedPaise),
        paidPaise: Number(r.paidPaise),
      })),
      total: Number(countRow?.count ?? 0),
      page,
      limit,
      totals: {
        totalPayablePaise: Number(totalsRow?.totalPayablePaise ?? 0),
        vendorsOwedCount: Number(totalsRow?.vendorsOwedCount ?? 0),
        advancePaise: Number(totalsRow?.advancePaise ?? 0),
      },
    };
  }
}
