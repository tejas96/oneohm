'use client';

import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_PAID_BY_LABELS,
  REIMBURSEMENT_STATUS_LABELS,
} from '@oneohm-epc/shared/constants';
import {
  ExpenseCategory,
  ExpensePaidByType,
  type PaginatedResponse,
  ReimbursementStatus,
} from '@oneohm-epc/shared/types';
import { formatDate } from '@oneohm-epc/shared/utils';
import * as React from 'react';

import { ProjectFinanceDrawer } from '../drawers';
import { OrgExpensesTable } from '../ledgers/org-expenses-table';
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
  type OrgExpenseListItem,
  type OrgExpensesFilters,
  useOrgExpenses,
} from '@/lib/hooks/resources';

/**
 * Org-wide Expenses ledger page. Same skeleton as
 * {@link FinanceReceiptsPage} — single hook, sticky toolbar, sticky
 * footer pagination, CSV export pulling the full filtered set.
 *
 * V1 keeps mutations on the per-project Finance tab; the search box
 * here looks for vendor names because that's the most common
 * "find me this expense" pattern when bouncing between projects.
 */

const CATEGORY_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '', label: 'All categories' },
  ...Object.values(ExpenseCategory).map((c) => ({
    value: c,
    label: EXPENSE_CATEGORY_LABELS[c] ?? c,
  })),
];

const PAID_BY_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '', label: 'Anyone' },
  ...Object.values(ExpensePaidByType).map((p) => ({
    value: p,
    label: EXPENSE_PAID_BY_LABELS[p] ?? p,
  })),
];

const REIMB_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '', label: 'All reimbursements' },
  ...Object.values(ReimbursementStatus).map((r) => ({
    value: r,
    label: REIMBURSEMENT_STATUS_LABELS[r] ?? r,
  })),
];

const DEFAULT_PAGE_SIZE = 25;

export function FinanceExpensesPage(): React.JSX.Element {
  const [range, setRange] = React.useState<DateRangeValue>(
    () => resolveFyPresetRange('this-month') ?? {},
  );
  const [vendorSearch, setVendorSearch] = React.useState('');
  const [debouncedVendor, setDebouncedVendor] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [paidBy, setPaidBy] = React.useState('');
  const [reimbursement, setReimbursement] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);
  const [drawerProject, setDrawerProject] = React.useState<{
    projectId: string;
    projectNumber: string;
    projectName: string;
  } | null>(null);

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedVendor(vendorSearch.trim()), 220);
    return () => window.clearTimeout(t);
  }, [vendorSearch]);

  React.useEffect(() => {
    setPage(1);
  }, [range, debouncedVendor, category, paidBy, reimbursement, pageSize]);

  const filters: OrgExpensesFilters = React.useMemo(
    () => ({
      dateFrom: range.from,
      dateTo: range.to,
      vendorSearch: debouncedVendor || undefined,
      category: (category || undefined) as ExpenseCategory | undefined,
      paidBy: (paidBy || undefined) as ExpensePaidByType | undefined,
      reimbursementStatus: (reimbursement || undefined) as ReimbursementStatus | undefined,
      page,
      limit: pageSize,
    }),
    [range, debouncedVendor, category, paidBy, reimbursement, page, pageSize],
  );

  const query = useOrgExpenses(filters);
  const { orgHeaders } = useOrgContext();

  const items = query.data?.data ?? [];
  const meta = query.data?.meta;

  const fetchAllForCsv = React.useCallback(
    async (cap: number): Promise<OrgExpenseListItem[]> => {
      const { data } = await apiClient.get<PaginatedResponse<OrgExpenseListItem>>(
        '/finance/expenses',
        {
          headers: orgHeaders,
          params: { ...filters, page: 1, limit: cap },
        },
      );
      return data.data;
    },
    [filters, orgHeaders],
  );

  const csvColumns: CsvColumn<OrgExpenseListItem>[] = React.useMemo(
    () => [
      { header: 'Date', accessor: (e) => formatDate(e.expenseDate, 'medium') },
      { header: 'Expense #', accessor: (e) => e.expenseNumber },
      { header: 'Project #', accessor: (e) => e.projectNumber },
      { header: 'Project', accessor: (e) => e.projectName },
      { header: 'Vendor', accessor: (e) => e.vendorName ?? '' },
      { header: 'Category', accessor: (e) => e.category },
      { header: 'Amount', accessor: (e) => e.amount },
      { header: 'Method', accessor: (e) => e.paymentMethod },
      { header: 'Paid By', accessor: (e) => e.paidBy },
      { header: 'Reimbursement', accessor: (e) => e.reimbursementStatus },
      { header: 'Notes', accessor: (e) => e.notes ?? '' },
    ],
    [],
  );

  return (
    <div className="flex h-full flex-col">
      <header className="border-border-light border-b px-6 py-4">
        <MUITypography variant="drawerTitle">Expenses</MUITypography>
        <MUITypography variant="body" className="text-foreground-secondary mt-1">
          Org-wide expenses ledger. Filter by category, paid-by, or reimbursement status; search by
          vendor name.
        </MUITypography>
      </header>

      <LedgerToolbar
        search={vendorSearch}
        onSearchChange={setVendorSearch}
        searchPlaceholder="Search by vendor name…"
        filtersSlot={
          <>
            <div className="w-[160px]">
              <MUISelect
                size="small"
                value={category}
                onChange={(e) => setCategory(String(e.target.value))}
                options={[...CATEGORY_OPTIONS]}
                displayEmpty
              />
            </div>
            <div className="w-[140px]">
              <MUISelect
                size="small"
                value={paidBy}
                onChange={(e) => setPaidBy(String(e.target.value))}
                options={[...PAID_BY_OPTIONS]}
                displayEmpty
              />
            </div>
            <div className="w-[180px]">
              <MUISelect
                size="small"
                value={reimbursement}
                onChange={(e) => setReimbursement(String(e.target.value))}
                options={[...REIMB_OPTIONS]}
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
            filename={`expenses-${range.from ?? 'all'}-${range.to ?? 'all'}`}
            disabled={items.length === 0}
          />
        }
      />

      <div className="flex-1 overflow-auto px-6 py-4">
        {query.isError ? (
          <ErrorState
            title="Couldn't load expenses"
            description={query.error?.message ?? 'Unknown error'}
            onRetry={() => {
              void query.refetch();
            }}
          />
        ) : (
          <OrgExpensesTable
            items={items}
            isLoading={query.isLoading}
            onRowClick={(e) =>
              setDrawerProject({
                projectId: e.projectId,
                projectNumber: e.projectNumber,
                projectName: e.projectName,
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
      />

      {meta && meta.totalPages > 1 && (
        <div className="border-border-light border-t px-6 py-3">
          <TablePagination
            currentPage={meta.page}
            totalPages={meta.totalPages}
            pageSize={pageSize}
            totalItems={meta.total}
            itemLabel="expenses"
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}
    </div>
  );
}
