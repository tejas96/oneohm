'use client';

import { Box } from '@mui/material';
import { type JSX, useMemo, useState } from 'react';

import { RECEIVABLE_COLUMNS, type ReceivableRow } from './receivables-columns';

import type { TableSortModel } from '@/components/shared/advanced-table';
import { CrmTable, type CrmQuickFilter } from '@/components/shared/crm-table';
import { useReceivables, type ReceivableFilters } from '@/lib/hooks/resources/ledger';
import { color, crm, radius, shadow } from '@/lib/theme/tokens';
import { formatPaise } from '@/lib/utils/paise';

const PAGE_SIZE = 25;

type SortField = NonNullable<ReceivableFilters['sortBy']>;
const SORTABLE: readonly SortField[] = [
  'daysOverdue',
  'outstandingAmount',
  'dueDate',
  'customerName',
];

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
 * Who owes us money, milestone by milestone.
 *
 * This is the client's requirement stated almost verbatim: "per milestone how
 * many customer amount is pending — a customer who needs to pay 10k but paid
 * only 2k should be flagged that he has not paid 8k under the 1st milestone."
 *
 * Waived milestones never appear: the backend view excludes them, so a written-
 * off residual stops being chased. In the old system the dashboard dropped it
 * while the project page kept reporting it, forever.
 *
 * Every figure comes from the API, including the totals and the bucket counts.
 * There is deliberately no client-side sum — the old AR table added up only the
 * rows currently visible and labelled the result "Total", which is how a
 * month-end reconciliation went wrong.
 */
export function FinanceReceivablesPage(): JSX.Element {
  const [bucket, setBucket] = useState<ReceivableFilters['bucket']>(undefined);
  // CrmTable's `page` is zero-indexed; the API is one-indexed.
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [sortModel, setSortModel] = useState<TableSortModel | null>(null);

  const query = useReceivables({
    bucket,
    search: search || undefined,
    sortBy: SORTABLE.find((f) => f === sortModel?.field),
    sortOrder: sortModel?.direction,
    page: page + 1,
    limit: PAGE_SIZE,
  });

  const rows = (query.data?.data ?? []) as ReceivableRow[];
  const buckets = query.data?.buckets;

  const quickFilters = useMemo<CrmQuickFilter[]>(
    () => [
      { key: '', label: 'All open', count: buckets?.all, tone: 'neutral', dot: false },
      { key: 'current', label: 'Current', count: buckets?.current, tone: 'success', dot: true },
      { key: '1-30', label: '1–30 days', count: buckets?.d1to30, tone: 'warning', dot: true },
      { key: '31-60', label: '31–60 days', count: buckets?.d31to60, tone: 'warning', dot: true },
      { key: '61-90', label: '61–90 days', count: buckets?.d61to90, tone: 'danger', dot: true },
      { key: '90plus', label: '90+ days', count: buckets?.d90plus, tone: 'danger', dot: true },
    ],
    [buckets],
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
          Receivables
        </Box>
        <Box
          component="p"
          sx={{ m: 0, fontSize: crm['text-row-title'], color: color['text-secondary'] }}
        >
          Every open milestone, worst overdue first. Waived amounts are excluded, so a written-off
          residual stops being chased.
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
          label="Open milestones"
          value={String(buckets?.all ?? 0)}
          note="with money still due"
        />
        <StatCard
          label="Total outstanding"
          value={formatPaise(buckets?.totalOutstandingPaise ?? 0)}
          note="across every open milestone"
        />
        <StatCard
          label="Overdue"
          value={formatPaise(buckets?.overduePaise ?? 0)}
          note="past its due date"
          danger={(buckets?.overduePaise ?? 0) > 0}
        />
      </Box>

      <CrmTable<ReceivableRow>
        columns={RECEIVABLE_COLUMNS}
        rows={rows}
        getRowId={(row) => row.milestoneId}
        loading={query.isLoading}
        refetching={query.isFetching && !query.isLoading}
        itemLabel="milestones"
        gridMinWidth="920px"
        searchPlaceholder="Search customer, project or milestone"
        onSearchChange={(next) => {
          setSearch(next);
          setPage(0);
        }}
        quickFilters={quickFilters}
        activeQuickFilter={bucket ?? ''}
        onQuickFilterChange={(key) => {
          setBucket((key || undefined) as ReceivableFilters['bucket']);
          setPage(0);
        }}
        sortModel={sortModel}
        onSortChange={(next) => {
          setSortModel(next);
          setPage(0);
        }}
        page={page}
        pageSize={PAGE_SIZE}
        totalRowCount={query.data?.total ?? 0}
        onPageChange={setPage}
        emptyMessage="Nothing outstanding."
      />
    </Box>
  );
}
