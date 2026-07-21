'use client';

import { formatDate } from '@tejas96/shared/utils';
import * as React from 'react';

import { CustomerFinanceDrawer } from '../drawers';
import { CustomersArTable } from '../insights/customers-ar-table';
import { CsvExportButton, LedgerToolbar, type CsvColumn } from '../shared';

import { ErrorState } from '@/components/shared';
import { MUIDatePicker, MUITypography } from '@/components/ui';
import { apiClient } from '@/lib/api/client';
import { useOrgContext } from '@/lib/hooks/core';
import { type CustomerAging, useOrgCustomersAr } from '@/lib/hooks/resources';

/**
 * Org-wide Customers AR (Accounts Receivable) insights page.
 *
 * The backend returns the FULL list of customers with any open
 * outstanding (no pagination) since this dataset is small in V1
 * (~hundreds at most). Filtering by name is therefore done client-side
 * to keep the page snappy and avoid round-trips while typing.
 *
 * "As of date" lets the team reconcile against an arbitrary historical
 * cutoff (e.g. month-end snapshots). Default is today.
 *
 * V1: row click is a no-op until CustomerArDrawer ships in slice 9.
 */

function todayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function FinanceCustomersPage(): React.JSX.Element {
  const [asOfDate, setAsOfDate] = React.useState<string>(() => todayIsoDate());
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [drawerCustomer, setDrawerCustomer] = React.useState<CustomerAging | null>(null);

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 200);
    return () => window.clearTimeout(t);
  }, [search]);

  const query = useOrgCustomersAr(asOfDate);
  const { orgHeaders } = useOrgContext();

  const filtered = React.useMemo<CustomerAging[]>(() => {
    const data = query.data ?? [];
    if (!debouncedSearch) return data;
    return data.filter((c) => c.customerName.toLowerCase().includes(debouncedSearch));
  }, [query.data, debouncedSearch]);

  const fetchAllForCsv = React.useCallback(
    async (_cap: number): Promise<CustomerAging[]> => {
      const { data } = await apiClient.get<CustomerAging[]>('/finance/customers/ar', {
        headers: orgHeaders,
        params: asOfDate ? { asOfDate } : undefined,
      });
      return debouncedSearch
        ? data.filter((c) => c.customerName.toLowerCase().includes(debouncedSearch))
        : data;
    },
    [asOfDate, debouncedSearch, orgHeaders],
  );

  const csvColumns: CsvColumn<CustomerAging>[] = React.useMemo(
    () => [
      { header: 'Customer', accessor: (c) => c.customerName },
      { header: 'Phone', accessor: (c) => c.customerPhone ?? '' },
      { header: 'Email', accessor: (c) => c.customerEmail ?? '' },
      { header: 'Total Outstanding', accessor: (c) => c.totalOutstanding },
      { header: 'Current', accessor: (c) => c.current },
      { header: '0-30 Days', accessor: (c) => c.bucket0to30 },
      { header: '31-60 Days', accessor: (c) => c.bucket31to60 },
      { header: '61-90 Days', accessor: (c) => c.bucket61to90 },
      { header: '90+ Days', accessor: (c) => c.bucket90plus },
      {
        header: 'Last Receipt',
        accessor: (c) => (c.lastReceiptDate ? formatDate(c.lastReceiptDate, 'medium') : ''),
      },
      { header: 'Open Terms', accessor: (c) => c.openTermCount },
    ],
    [],
  );

  return (
    <div className="flex h-full flex-col">
      <header className="px-6 py-4">
        <MUITypography variant="drawerTitle">Customers · Accounts Receivable</MUITypography>
        <MUITypography variant="body" className="text-foreground-secondary mt-1">
          One row per customer with open receivables, bucketed by age. Pick any "as of" date to
          reconcile against a historical cutoff.
        </MUITypography>
      </header>

      <LedgerToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search customer name…"
        filtersSlot={
          <div className="w-[180px]">
            <MUIDatePicker
              value={asOfDate ? new Date(asOfDate) : null}
              onChange={(d) => {
                if (!d) {
                  setAsOfDate(todayIsoDate());
                  return;
                }
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                setAsOfDate(`${y}-${m}-${day}`);
              }}
              slotProps={{ textField: { size: 'small', label: 'As of date' } }}
            />
          </div>
        }
        actionsSlot={
          <CsvExportButton
            fetchAll={fetchAllForCsv}
            columns={csvColumns}
            filename={`customers-ar-${asOfDate}`}
            disabled={filtered.length === 0}
          />
        }
      />

      <div className="flex-1 overflow-auto px-6 py-4">
        {query.isError ? (
          <ErrorState
            title="Couldn't load customers AR"
            description={query.error?.message ?? 'Unknown error'}
            onRetry={() => {
              void query.refetch();
            }}
          />
        ) : (
          <CustomersArTable
            items={filtered}
            isLoading={query.isLoading}
            onRowClick={(c) => setDrawerCustomer(c)}
          />
        )}
      </div>

      <CustomerFinanceDrawer
        open={drawerCustomer !== null}
        onClose={() => setDrawerCustomer(null)}
        customer={drawerCustomer}
      />
    </div>
  );
}
