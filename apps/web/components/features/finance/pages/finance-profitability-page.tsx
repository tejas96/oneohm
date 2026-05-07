'use client';

import { type PaginatedResponse } from '@oneohm-epc/shared/types';
import * as React from 'react';

import { ProfitabilityTable } from '../insights/profitability-table';
import {
  CsvExportButton,
  DateRangePicker,
  LedgerToolbar,
  type CsvColumn,
  type DateRangeValue,
  resolveFyPresetRange,
} from '../shared';

import { ErrorState, TablePagination } from '@/components/shared';
import { MUITypography } from '@/components/ui';
import { apiClient } from '@/lib/api/client';
import { useOrgContext } from '@/lib/hooks/core';
import {
  type ProfitabilityFilters,
  type ProjectProfitability,
  useOrgProfitability,
} from '@/lib/hooks/resources';

/**
 * Org-wide Project Profitability insights page.
 *
 * Backend paginates this one because in established orgs there can be
 * hundreds of projects. We rely on the URL/state-driven page+pageSize
 * controls just like the Receipts/Expenses ledgers.
 *
 * Search is intentionally NOT included — the backend endpoint doesn't
 * support text search and a per-page client-side filter would feel
 * broken (it would only filter the visible page). The DateRangePicker
 * narrows down by project date range which is the primary slicing
 * dimension reviewers care about.
 *
 * V1: row click is a no-op until ProjectFinanceDrawer ships in slice
 * 9.
 */

const DEFAULT_PAGE_SIZE = 25;

export function FinanceProfitabilityPage(): React.JSX.Element {
  const [range, setRange] = React.useState<DateRangeValue>(
    () => resolveFyPresetRange('this-fy') ?? {},
  );
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    setPage(1);
  }, [range, pageSize]);

  const filters: ProfitabilityFilters = React.useMemo(
    () => ({
      dateFrom: range.from,
      dateTo: range.to,
      page,
      limit: pageSize,
    }),
    [range, page, pageSize],
  );

  const query = useOrgProfitability(filters);
  const { orgHeaders } = useOrgContext();

  const data = query.data?.data ?? [];
  const meta = query.data?.meta;

  // Client-side display filter only — narrows the current page by
  // project number / name / customer. Doesn't refetch.
  const filtered = React.useMemo<ProjectProfitability[]>(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (p) =>
        p.projectNumber.toLowerCase().includes(q) ||
        p.projectName.toLowerCase().includes(q) ||
        p.customerName.toLowerCase().includes(q),
    );
  }, [data, search]);

  const fetchAllForCsv = React.useCallback(
    async (cap: number): Promise<ProjectProfitability[]> => {
      const { data: payload } = await apiClient.get<PaginatedResponse<ProjectProfitability>>(
        '/finance/projects/profitability',
        {
          headers: orgHeaders,
          params: { ...filters, page: 1, limit: cap },
        },
      );
      return payload.data;
    },
    [filters, orgHeaders],
  );

  const csvColumns: CsvColumn<ProjectProfitability>[] = React.useMemo(
    () => [
      { header: 'Project #', accessor: (p) => p.projectNumber },
      { header: 'Project', accessor: (p) => p.projectName },
      { header: 'Customer', accessor: (p) => p.customerName },
      { header: 'Quoted Revenue', accessor: (p) => p.quotedRevenue },
      { header: 'Received', accessor: (p) => p.receivedAmount },
      { header: 'Total Spend', accessor: (p) => p.totalSpend },
      { header: 'Margin (₹)', accessor: (p) => p.margin },
      { header: 'Margin %', accessor: (p) => Number(p.marginPct.toFixed(1)) },
      { header: 'BOM Target', accessor: (p) => p.bomTarget },
      { header: 'BOM Variance', accessor: (p) => p.bomVariance },
    ],
    [],
  );

  return (
    <div className="flex h-full flex-col">
      <header className="border-border-light border-b px-6 py-4">
        <MUITypography variant="drawerTitle">Project Profitability</MUITypography>
        <MUITypography variant="body" className="text-foreground-secondary mt-1">
          Per-project margin: latest quoted revenue minus total posted spend. Color highlights
          margin band (≥20% green, 10-20% amber, &lt;10% red).
        </MUITypography>
      </header>

      <LedgerToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Filter visible page by project / customer…"
        filtersSlot={<DateRangePicker value={range} onChange={setRange} />}
        actionsSlot={
          <CsvExportButton
            fetchAll={fetchAllForCsv}
            columns={csvColumns}
            filename={`profitability-${range.from ?? 'all'}-${range.to ?? 'all'}`}
            disabled={data.length === 0}
          />
        }
      />

      <div className="flex-1 overflow-auto px-6 py-4">
        {query.isError ? (
          <ErrorState
            title="Couldn't load profitability"
            description={query.error?.message ?? 'Unknown error'}
            onRetry={() => {
              void query.refetch();
            }}
          />
        ) : (
          <ProfitabilityTable items={filtered} isLoading={query.isLoading} />
        )}
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="border-border-light border-t px-6 py-3">
          <TablePagination
            currentPage={meta.page}
            totalPages={meta.totalPages}
            pageSize={pageSize}
            totalItems={meta.total}
            itemLabel="projects"
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}
    </div>
  );
}
