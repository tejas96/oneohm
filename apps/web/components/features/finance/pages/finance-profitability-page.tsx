'use client';

import { type PaginatedResponse } from '@tejas96/shared/types';
import * as React from 'react';

import { ProjectFinanceDrawer } from '../drawers';
import { ProfitabilityTable } from '../insights/profitability-table';
import { CsvExportButton, LedgerToolbar, type CsvColumn } from '../shared';

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
 * Profitability is a project-lifetime metric: latest quoted revenue vs
 * all-time posted spend. Mixing a date-range filter with the unfiltered
 * quoted revenue produced misleading "100% margin" rows for any project
 * whose spend fell outside the range, so we removed the date picker
 * entirely. Reviewers drill into individual periods via the per-project
 * drawer (which still shows date-banded receipts/expenses).
 *
 * Backend paginates this one because in established orgs there can be
 * hundreds of projects. The free-text input narrows the visible page
 * client-side (search across all rows would require backend support
 * we haven't added in V1).
 */

const DEFAULT_PAGE_SIZE = 25;

export function FinanceProfitabilityPage(): React.JSX.Element {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = React.useState('');
  const [drawerProject, setDrawerProject] = React.useState<{
    projectId: string;
    projectNumber: string;
    projectName: string;
    customerName: string;
  } | null>(null);

  React.useEffect(() => {
    setPage(1);
  }, [pageSize]);

  const filters: ProfitabilityFilters = React.useMemo(
    () => ({
      page,
      limit: pageSize,
    }),
    [page, pageSize],
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
      <header className="px-6 py-4">
        <MUITypography variant="drawerTitle">Project Profitability</MUITypography>
        <MUITypography variant="body" className="text-foreground-secondary mt-1">
          Per-project margin: latest quoted revenue minus all-time posted spend. Color highlights
          margin band (≥20% green, 10-20% amber, &lt;10% red).
        </MUITypography>
      </header>

      <LedgerToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Filter visible page by project / customer…"
        actionsSlot={
          <CsvExportButton
            fetchAll={fetchAllForCsv}
            columns={csvColumns}
            filename="profitability-lifetime"
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
          <ProfitabilityTable
            items={filtered}
            isLoading={query.isLoading}
            onRowClick={(p) =>
              setDrawerProject({
                projectId: p.projectId,
                projectNumber: p.projectNumber,
                projectName: p.projectName,
                customerName: p.customerName,
              })
            }
          />
        )}
      </div>

      <ProjectFinanceDrawer
        open={drawerProject !== null}
        onClose={() => setDrawerProject(null)}
        projectId={drawerProject?.projectId ?? null}
        projectNumber={drawerProject?.projectNumber}
        projectName={drawerProject?.projectName}
        customerName={drawerProject?.customerName}
      />

      {meta && meta.totalPages > 1 && (
        <div className="px-6 py-3">
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
