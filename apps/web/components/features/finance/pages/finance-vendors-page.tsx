'use client';

import { EXPENSE_CATEGORY_LABELS } from '@oneohm-epc/shared/constants';
import { ExpenseCategory } from '@oneohm-epc/shared/types';
import { formatDate } from '@oneohm-epc/shared/utils';
import * as React from 'react';

import { VendorsSpendTable } from '../insights/vendors-spend-table';
import {
  CsvExportButton,
  DateRangePicker,
  LedgerToolbar,
  type CsvColumn,
  type DateRangeValue,
  resolveFyPresetRange,
} from '../shared';

import { ErrorState } from '@/components/shared';
import { MUISelect, MUITypography } from '@/components/ui';
import { apiClient } from '@/lib/api/client';
import { useOrgContext } from '@/lib/hooks/core';
import {
  type VendorSpend,
  type VendorsSpendFilters,
  useOrgVendorsSpend,
} from '@/lib/hooks/resources';

/**
 * Org-wide Vendors & Spend insights page.
 *
 * Backend returns the full grouped list (no pagination) — vendor names
 * are free-text in V1 and grouped via LOWER(TRIM(...)). Search and
 * sorting happen client-side over the returned list, which is small
 * enough to handle in the browser comfortably.
 *
 * V1 caveat: vendor matching is case-insensitive name only — there's
 * no vendor-master entity yet. Surfaced inline in the page subtitle so
 * users understand why "ABC Materials" and "abc materials" merge.
 *
 * V1: row click is a no-op until VendorSpendDrawer ships in slice 9.
 */

const CATEGORY_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '', label: 'All categories' },
  ...Object.values(ExpenseCategory).map((c) => ({
    value: c,
    label: EXPENSE_CATEGORY_LABELS[c],
  })),
];

export function FinanceVendorsPage(): React.JSX.Element {
  const [range, setRange] = React.useState<DateRangeValue>(
    () => resolveFyPresetRange('this-fy') ?? {},
  );
  const [category, setCategory] = React.useState<string>('');
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 200);
    return () => window.clearTimeout(t);
  }, [search]);

  const filters: VendorsSpendFilters = React.useMemo(
    () => ({
      dateFrom: range.from,
      dateTo: range.to,
      category: (category || undefined) as ExpenseCategory | undefined,
    }),
    [range, category],
  );

  const query = useOrgVendorsSpend(filters);
  const { orgHeaders } = useOrgContext();

  const filtered = React.useMemo<VendorSpend[]>(() => {
    const data = query.data ?? [];
    if (!debouncedSearch) return data;
    return data.filter((v) => v.vendorKey.includes(debouncedSearch));
  }, [query.data, debouncedSearch]);

  const fetchAllForCsv = React.useCallback(
    async (_cap: number): Promise<VendorSpend[]> => {
      const { data } = await apiClient.get<VendorSpend[]>('/finance/vendors/spend', {
        headers: orgHeaders,
        params: filters,
      });
      return debouncedSearch ? data.filter((v) => v.vendorKey.includes(debouncedSearch)) : data;
    },
    [filters, debouncedSearch, orgHeaders],
  );

  const csvColumns: CsvColumn<VendorSpend>[] = React.useMemo(
    () => [
      { header: 'Vendor', accessor: (v) => v.vendorName },
      { header: 'Total Spend', accessor: (v) => v.totalSpend },
      { header: 'Expense Count', accessor: (v) => v.expenseCount },
      {
        header: 'Last Expense',
        accessor: (v) => (v.lastExpenseDate ? formatDate(v.lastExpenseDate, 'medium') : ''),
      },
      {
        header: 'Top Category',
        accessor: (v) =>
          (EXPENSE_CATEGORY_LABELS as Record<string, string>)[v.topCategory] ?? v.topCategory,
      },
      { header: '% Reimbursed', accessor: (v) => Math.round(v.reimbursedPercentage) },
    ],
    [],
  );

  return (
    <div className="flex h-full flex-col">
      <header className="border-border-light border-b px-6 py-4">
        <MUITypography variant="drawerTitle">Vendors &amp; Spend</MUITypography>
        <MUITypography variant="body" className="text-foreground-secondary mt-1">
          Org-wide vendor spend grouped by case-insensitive name (no vendor master in V1). Filter
          by date range or expense category.
        </MUITypography>
      </header>

      <LedgerToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search vendor name…"
        filtersSlot={
          <>
            <div className="w-[180px]">
              <MUISelect
                size="small"
                value={category}
                onChange={(e) => setCategory(String(e.target.value))}
                options={[...CATEGORY_OPTIONS]}
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
            filename={`vendors-spend-${range.from ?? 'all'}-${range.to ?? 'all'}`}
            disabled={filtered.length === 0}
          />
        }
      />

      <div className="flex-1 overflow-auto px-6 py-4">
        {query.isError ? (
          <ErrorState
            title="Couldn't load vendor spend"
            description={query.error?.message ?? 'Unknown error'}
            onRetry={() => {
              void query.refetch();
            }}
          />
        ) : (
          <VendorsSpendTable items={filtered} isLoading={query.isLoading} />
        )}
      </div>
    </div>
  );
}
