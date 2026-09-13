'use client';

import { Box } from '@mui/material';
import { type JSX, useMemo, useState } from 'react';

import { PayVendorDialog } from './pay-vendor-dialog';
import { buildPayableColumns } from './payables-columns';

import { CrmTable, type CrmQuickFilter } from '@/components/shared/crm-table';
import { usePayables, type PayableRow } from '@/lib/hooks/resources/ledger';
import { color, crm, radius, shadow } from '@/lib/theme/tokens';
import { formatPaise } from '@/lib/utils/paise';

const PAGE_SIZE = 25;

function StatCard({
  label,
  value,
  note,
  danger,
}: {
  label: string;
  value: string;
  note: string;
  danger?: boolean;
}): JSX.Element {
  return (
    <Box
      sx={{
        height: crm['kpi-height'],
        px: 2,
        py: 1.75,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: color.surface,
        borderRadius: radius['card-functional'],
        boxShadow: shadow.e2,
      }}
    >
      <Box
        component="span"
        sx={{
          fontSize: 'var(--text-overline-size)',
          fontWeight: 700,
          letterSpacing: 'var(--text-overline-track)',
          textTransform: 'uppercase',
          color: color['text-tertiary'],
        }}
      >
        {label}
      </Box>
      <Box
        component="span"
        sx={{
          fontSize: 'var(--text-h3-size)',
          lineHeight: 'var(--text-h3-line)',
          letterSpacing: 'var(--text-h3-track)',
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          color: danger ? color.danger : undefined,
        }}
      >
        {value}
      </Box>
      <Box sx={{ fontSize: crm['text-row-sm'], color: color['text-tertiary'] }}>{note}</Box>
    </Box>
  );
}

/**
 * Who we owe, vendor by vendor.
 *
 * A net balance per vendor, not bill-by-bill matching — two vendors and a
 * handful of credit bills do not justify an allocation table, and a net
 * balance cannot drift out of step with the ledger rows behind it. This is
 * the vendor-side mirror of Receivables: that page answers "who owes us",
 * this one answers "who do we owe".
 *
 * `payablePaise` is signed. Negative means the company paid ahead of its
 * bills — an advance, not a debt — and the Payable column renders it as
 * "Advance ₹X" in the success tone, never as a bare negative number that
 * would read as a mistake.
 *
 * A soft-deleted vendor still carrying a balance stays on this list, flagged
 * Inactive: money owed does not disappear because someone tidied the vendor
 * list.
 *
 * Every figure here — all three KPI cards and every row value — comes
 * straight from the API's `data` and `totals`. There is deliberately no
 * client-side sum: the old AR table added up only the rows on the visible
 * page and labelled the result "Total", which is how a month-end
 * reconciliation went wrong.
 */
export function FinancePayablesPage(): JSX.Element {
  // CrmTable's `page` is zero-indexed; the API is one-indexed.
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [onlyOwing, setOnlyOwing] = useState<boolean | undefined>(undefined);
  // The single `PayVendorDialog` instance this page owns — see
  // `payables-columns.tsx`'s module doc for why the row menu takes a callback
  // instead of each row mounting its own dialog.
  const [payingVendor, setPayingVendor] = useState<PayableRow | null>(null);

  const query = usePayables({
    search: search || undefined,
    onlyOwing,
    page: page + 1,
    limit: PAGE_SIZE,
  });

  const rows = query.data?.data ?? [];
  const totals = query.data?.totals;

  const columns = useMemo(() => buildPayableColumns(setPayingVendor), []);

  // The API's `onlyOwing` keeps any nonzero balance — a debt or an advance
  // either way (`PAYABLES_COUNT_SQL`: `payable_paise <> 0`) — so "Owing only"
  // can still show an advance row. That is the server's decision from Task
  // 10, not this page's to second-guess.
  const quickFilters = useMemo<CrmQuickFilter[]>(
    () => [
      { key: '', label: 'All vendors', tone: 'neutral', dot: false },
      { key: 'owing', label: 'Owing only', tone: 'warning', dot: true },
    ],
    [],
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: { xs: 2, lg: 3 } }}>
      <Box>
        <Box
          component="span"
          sx={{
            fontSize: 'var(--text-overline-size)',
            fontWeight: 700,
            letterSpacing: 'var(--text-overline-track)',
            textTransform: 'uppercase',
            color: color['text-tertiary'],
          }}
        >
          Finance
        </Box>
        <Box
          component="h1"
          sx={{
            m: 0,
            mt: '5px',
            mb: '3px',
            fontSize: crm['text-page-title'],
            fontWeight: 700,
            letterSpacing: crm['text-page-title-track'],
          }}
        >
          Payables
        </Box>
        <Box
          component="p"
          sx={{ m: 0, fontSize: crm['text-row-title'], color: color['text-secondary'] }}
        >
          What we owe vendors — bills taken on credit, less what has been paid. A net balance per
          vendor, not bill by bill.
        </Box>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
        }}
      >
        <StatCard
          label="Total payable"
          value={formatPaise(totals?.totalPayablePaise ?? 0)}
          note="owed to vendors"
        />
        <StatCard
          label="Vendors owed"
          value={String(totals?.vendorsOwedCount ?? 0)}
          note="with a balance due"
        />
        <StatCard
          label="Advances paid"
          value={formatPaise(totals?.advancePaise ?? 0)}
          note="paid ahead of bills"
        />
      </Box>

      <CrmTable<PayableRow>
        columns={columns}
        rows={rows}
        getRowId={(row) => row.vendorId}
        loading={query.isLoading}
        refetching={query.isFetching && !query.isLoading}
        itemLabel="vendors"
        gridMinWidth="760px"
        searchPlaceholder="Search vendor name or code"
        onSearchChange={(next) => {
          setSearch(next);
          setPage(0);
        }}
        quickFilters={quickFilters}
        activeQuickFilter={onlyOwing ? 'owing' : ''}
        onQuickFilterChange={(key) => {
          setOnlyOwing(key === 'owing' ? true : undefined);
          setPage(0);
        }}
        page={page}
        pageSize={PAGE_SIZE}
        totalRowCount={query.data?.total ?? 0}
        onPageChange={setPage}
        emptyMessage="Nothing owed to anyone."
      />

      {payingVendor ? (
        <PayVendorDialog open vendor={payingVendor} onClose={() => setPayingVendor(null)} />
      ) : null}
    </Box>
  );
}
