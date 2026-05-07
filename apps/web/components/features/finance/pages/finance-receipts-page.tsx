'use client';

import { type PaginatedResponse, PaymentTransactionStatus } from '@oneohm-epc/shared/types';
import { formatDate } from '@oneohm-epc/shared/utils';
import * as React from 'react';

import { PAYMENT_STATUS_LABELS } from '../../projects/constants';
import { ProjectFinanceDrawer } from '../drawers';
import { OrgReceiptsTable } from '../ledgers/org-receipts-table';
import {
  CsvExportButton,
  DateRangePicker,
  LedgerToolbar,
  type DateRangeValue,
  type CsvColumn,
  resolveFyPresetRange,
} from '../shared';

import { ErrorState, TablePagination } from '@/components/shared';
import { MUISelect, MUITypography } from '@/components/ui';
import { apiClient } from '@/lib/api/client';
import { useOrgContext } from '@/lib/hooks/core';
import {
  type OrgReceiptListItem,
  type OrgReceiptsFilters,
  useOrgReceipts,
} from '@/lib/hooks/resources';

/**
 * Org-wide Receipts ledger page.
 *
 * Single FDAL hook (`useOrgReceipts`) drives the table; the
 * DateRangePicker controls `dateFrom`/`dateTo`, the search box hits
 * the same `search` param the project-tab uses, and the status select
 * narrows by transaction status. CSV export refetches the SAME filter
 * shape with `limit=5000, page=1` (per slice 4's CsvExportButton
 * contract) so users get the full filtered set, not just the visible
 * page.
 *
 * V1: row click is a no-op until ProjectFinanceDrawer ships in slice
 * 9. Once that lands we'll just thread `onRowClick` into the table.
 */

const STATUS_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '', label: 'All statuses' },
  ...Object.values(PaymentTransactionStatus).map((s) => ({
    value: s,
    label: PAYMENT_STATUS_LABELS[s] ?? s,
  })),
];

const DEFAULT_PAGE_SIZE = 25;

export function FinanceReceiptsPage(): React.JSX.Element {
  const [range, setRange] = React.useState<DateRangeValue>(
    () => resolveFyPresetRange('this-month') ?? {},
  );
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [status, setStatus] = React.useState<string>('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);
  const [drawerProject, setDrawerProject] = React.useState<{
    projectId: string;
    projectNumber: string;
    projectName: string;
    customerName: string;
  } | null>(null);

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 220);
    return () => window.clearTimeout(t);
  }, [search]);

  React.useEffect(() => {
    setPage(1);
  }, [range, debouncedSearch, status, pageSize]);

  const filters: OrgReceiptsFilters = React.useMemo(
    () => ({
      dateFrom: range.from,
      dateTo: range.to,
      search: debouncedSearch || undefined,
      status: (status || undefined) as PaymentTransactionStatus | undefined,
      page,
      limit: pageSize,
    }),
    [range, debouncedSearch, status, page, pageSize],
  );

  const query = useOrgReceipts(filters);
  const { orgHeaders } = useOrgContext();

  const items = query.data?.data ?? [];
  const meta = query.data?.meta;

  const fetchAllForCsv = React.useCallback(
    async (cap: number): Promise<OrgReceiptListItem[]> => {
      const { data } = await apiClient.get<PaginatedResponse<OrgReceiptListItem>>(
        '/finance/receipts',
        {
          headers: orgHeaders,
          params: { ...filters, page: 1, limit: cap },
        },
      );
      return data.data;
    },
    [filters, orgHeaders],
  );

  const csvColumns: CsvColumn<OrgReceiptListItem>[] = React.useMemo(
    () => [
      { header: 'Date', accessor: (r) => formatDate(r.createdAt, 'medium') },
      { header: 'Receipt #', accessor: (r) => r.paymentNumber },
      { header: 'Project #', accessor: (r) => r.projectNumber },
      { header: 'Project', accessor: (r) => r.projectName },
      { header: 'Customer', accessor: (r) => r.customerName },
      { header: 'Customer Phone', accessor: (r) => r.customerPhone ?? '' },
      { header: 'Amount', accessor: (r) => r.paidAmount },
      { header: 'Method', accessor: (r) => r.paymentMethod },
      { header: 'Status', accessor: (r) => r.status },
      { header: 'Reference', accessor: (r) => r.paymentReference ?? '' },
    ],
    [],
  );

  return (
    <div className="flex h-full flex-col">
      <header className="border-border-light border-b px-6 py-4">
        <MUITypography variant="drawerTitle">Receipts</MUITypography>
        <MUITypography variant="body" className="text-foreground-secondary mt-1">
          Org-wide receipts ledger. Filter by date, status, or search by receipt number / customer.
        </MUITypography>
      </header>

      <LedgerToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search receipt #, customer, or project…"
        filtersSlot={
          <>
            <div className="w-[180px]">
              <MUISelect
                size="small"
                value={status}
                onChange={(e) => setStatus(String(e.target.value))}
                options={[...STATUS_OPTIONS]}
                displayEmpty
              />
            </div>
            <DateRangePicker value={range} onChange={setRange} />
          </>
        }
        actionsSlot={
          <CsvExportButton
            fetchAll={fetchAllForCsv}
            columns={csvColumns}
            filename={`receipts-${range.from ?? 'all'}-${range.to ?? 'all'}`}
            disabled={items.length === 0}
          />
        }
      />

      <div className="flex-1 overflow-auto px-6 py-4">
        {query.isError ? (
          <ErrorState
            title="Couldn't load receipts"
            description={query.error?.message ?? 'Unknown error'}
            onRetry={() => {
              void query.refetch();
            }}
          />
        ) : (
          <OrgReceiptsTable
            items={items}
            isLoading={query.isLoading}
            onRowClick={(r) =>
              setDrawerProject({
                projectId: r.projectId,
                projectNumber: r.projectNumber,
                projectName: r.projectName,
                customerName: r.customerName,
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
        <div className="border-border-light border-t px-6 py-3">
          <TablePagination
            currentPage={meta.page}
            totalPages={meta.totalPages}
            pageSize={pageSize}
            totalItems={meta.total}
            itemLabel="receipts"
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}
    </div>
  );
}
