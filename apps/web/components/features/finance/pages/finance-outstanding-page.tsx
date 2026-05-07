'use client';

import { Button } from '@mui/material';
import { type PaginatedResponse } from '@oneohm-epc/shared/types';
import { formatDate } from '@oneohm-epc/shared/utils';
import * as React from 'react';

import { AGING_BUCKETS, AGING_BUCKET_LABEL } from '../constants';
import { OrgOutstandingTable } from '../ledgers/org-outstanding-table';
import {
  CsvExportButton,
  LedgerToolbar,
  type CsvColumn,
} from '../shared';

import { ErrorState, TablePagination } from '@/components/shared';
import { MUISelect, MUITypography } from '@/components/ui';
import { apiClient } from '@/lib/api/client';
import { useOrgContext } from '@/lib/hooks/core';
import {
  type AgingBucket,
  type OutstandingFilters,
  type OutstandingTerm,
  useOrgOutstanding,
} from '@/lib/hooks/resources';

/**
 * Outstanding payment terms ledger. Different shape from receipts /
 * expenses because there's no useful date range — every row is "what
 * we are owed today" — but we DO need:
 *  - a quick aging-bucket filter (chips, not a select, so the buckets
 *    stay visible and one-click switchable);
 *  - sortable columns (default = days overdue DESC).
 *
 * Sort is controlled by a small select rather than clickable column
 * headers because the matrix of (column × order) ends up cluttering
 * the dense header. The select stays in lockstep with the backend's
 * `sort` enum.
 */

const SORT_OPTIONS: ReadonlyArray<{ value: NonNullable<OutstandingFilters['sort']>; label: string }> = [
  { value: 'daysOverdue', label: 'Days Overdue (most first)' },
  { value: 'dueDate', label: 'Due Date (earliest first)' },
  { value: 'amount', label: 'Outstanding (largest first)' },
  { value: 'customer', label: 'Customer (A–Z)' },
  { value: 'project', label: 'Project (A–Z)' },
];

const DEFAULT_PAGE_SIZE = 25;

export function FinanceOutstandingPage(): React.JSX.Element {
  const [bucket, setBucket] = React.useState<AgingBucket | ''>('');
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [sort, setSort] = React.useState<NonNullable<OutstandingFilters['sort']>>('daysOverdue');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 220);
    return () => window.clearTimeout(t);
  }, [search]);

  React.useEffect(() => {
    setPage(1);
  }, [bucket, debouncedSearch, sort, pageSize]);

  const filters: OutstandingFilters = React.useMemo(
    () => ({
      bucket: bucket || undefined,
      search: debouncedSearch || undefined,
      sort,
      sortOrder: sort === 'customer' || sort === 'project' || sort === 'dueDate' ? 'ASC' : 'DESC',
      page,
      limit: pageSize,
    }),
    [bucket, debouncedSearch, sort, page, pageSize],
  );

  const query = useOrgOutstanding(filters);
  const { orgHeaders } = useOrgContext();

  const items = query.data?.data ?? [];
  const meta = query.data?.meta;

  const fetchAllForCsv = React.useCallback(
    async (cap: number): Promise<OutstandingTerm[]> => {
      const { data } = await apiClient.get<PaginatedResponse<OutstandingTerm>>(
        '/finance/outstanding',
        {
          headers: orgHeaders,
          params: { ...filters, page: 1, limit: cap },
        },
      );
      return data.data;
    },
    [filters, orgHeaders],
  );

  const csvColumns: CsvColumn<OutstandingTerm>[] = React.useMemo(
    () => [
      { header: 'Project #', accessor: (t) => t.projectNumber },
      { header: 'Project', accessor: (t) => t.projectName },
      { header: 'Customer', accessor: (t) => t.customerName },
      { header: 'Stage', accessor: (t) => t.stage },
      { header: 'Term', accessor: (t) => t.name },
      { header: 'Due Date', accessor: (t) => (t.dueDate ? formatDate(t.dueDate, 'medium') : '') },
      { header: 'Days Overdue', accessor: (t) => t.daysOverdue ?? '' },
      { header: 'Expected', accessor: (t) => t.expectedAmount },
      { header: 'Paid', accessor: (t) => t.paidAmount },
      { header: 'Outstanding', accessor: (t) => t.outstandingAmount },
      { header: 'Aging', accessor: (t) => t.agingBucket },
      { header: 'Status', accessor: (t) => t.status },
    ],
    [],
  );

  // Per-bucket totals would require a dedicated aggregation endpoint
  // (the current /finance/outstanding response only counts the active
  // filter). Keeping the chips count-free in V1 avoids the misleading
  // "All (0)" the filtered set would otherwise show.
  return (
    <div className="flex h-full flex-col">
      <header className="border-border-light border-b px-6 py-4">
        <MUITypography variant="drawerTitle">Outstanding Payment Terms</MUITypography>
        <MUITypography variant="body" className="text-foreground-secondary mt-1">
          Every unpaid term across the org. Click an aging chip to focus.
        </MUITypography>
      </header>

      <div className="border-border-light bg-background flex flex-wrap items-center gap-1 border-b px-4 py-2">
        <Button
          size="small"
          variant={bucket === '' ? 'contained' : 'outlined'}
          color={bucket === '' ? 'primary' : 'inherit'}
          onClick={() => setBucket('')}
          sx={{
            textTransform: 'none',
            fontSize: 12,
            minWidth: 0,
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
          }}
        >
          All
        </Button>
        {AGING_BUCKETS.map((b) => (
          <Button
            key={b}
            size="small"
            variant={bucket === b ? 'contained' : 'outlined'}
            color={bucket === b ? 'primary' : 'inherit'}
            onClick={() => setBucket(b)}
            sx={{
              textTransform: 'none',
              fontSize: 12,
              minWidth: 0,
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
            }}
          >
            {AGING_BUCKET_LABEL[b]}
          </Button>
        ))}
        {meta && (
          <span className="text-foreground-tertiary ml-2 text-xs">
            {meta.total} term{meta.total === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <LedgerToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search project or customer…"
        filtersSlot={
          <div className="w-[240px]">
            <MUISelect
              size="small"
              value={sort}
              onChange={(e) => setSort(e.target.value as NonNullable<OutstandingFilters['sort']>)}
              options={SORT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />
          </div>
        }
        actionsSlot={
          <CsvExportButton
            fetchAll={fetchAllForCsv}
            columns={csvColumns}
            filename="outstanding"
            disabled={items.length === 0}
          />
        }
      />

      <div className="flex-1 overflow-auto px-6 py-4">
        {query.isError ? (
          <ErrorState
            title="Couldn't load outstanding terms"
            description={query.error?.message ?? 'Unknown error'}
            onRetry={() => {
              void query.refetch();
            }}
          />
        ) : (
          <OrgOutstandingTable items={items} isLoading={query.isLoading} />
        )}
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="border-border-light border-t px-6 py-3">
          <TablePagination
            currentPage={meta.page}
            totalPages={meta.totalPages}
            pageSize={pageSize}
            totalItems={meta.total}
            itemLabel="terms"
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}
    </div>
  );
}
