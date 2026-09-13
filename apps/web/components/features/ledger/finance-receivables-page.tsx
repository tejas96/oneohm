'use client';

import { Box, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { type JSX, useMemo, useState } from 'react';

import { RECEIVABLE_COLUMNS, RECOVERY_COLUMNS, type ReceivableRow } from './receivables-columns';

import { Alert } from '@/components/shared';
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

/**
 * `all` is every open milestone; the other two are the collection list this
 * task adds — the net meter is in and money is still open, split by who
 * funded the job. One control, three states, never two rows of chips.
 */
type Scope = 'all' | 'recovery-cash' | 'recovery-loan';

const SCOPE_OPTIONS: ReadonlyArray<{ value: Scope; label: string }> = [
  { value: 'all', label: 'All open' },
  { value: 'recovery-cash', label: 'Recovery — Cash' },
  { value: 'recovery-loan', label: 'Recovery — Loan' },
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
 *
 * The Recovery scopes turn this same list into a call list: the meter is in,
 * the job is delivered, and someone still owes money for it.
 */
export function FinanceReceivablesPage(): JSX.Element {
  const [scope, setScope] = useState<Scope>('all');
  const [bucket, setBucket] = useState<ReceivableFilters['bucket']>(undefined);
  // CrmTable's `page` is zero-indexed; the API is one-indexed.
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [sortModel, setSortModel] = useState<TableSortModel | null>(null);

  const query = useReceivables({
    scope: scope === 'all' ? undefined : 'recovery',
    funding: scope === 'recovery-cash' ? 'cash' : scope === 'recovery-loan' ? 'loan' : undefined,
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
      { key: 'current', label: 'Not due yet', count: buckets?.current, tone: 'success', dot: true },
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
          alignItems: 'start',
        }}
      >
        <StatCard
          label="Open milestones"
          value={String(buckets?.all ?? 0)}
          note="with money still due"
        />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <StatCard
            label="Total outstanding"
            value={formatPaise(buckets?.totalOutstandingPaise ?? 0)}
            note="across every open milestone"
          />
          {/*
            A forecasting gap, not hidden debt: per spec §2.4, 178 of these 198
            milestones have zero work done, so the money is genuinely not owed
            yet — it just cannot be dated. No seventh chip; this note is the
            only affordance into `bucket=no_due_date`, and it disappears on its
            own once nothing is left undated.
          */}
          {buckets && buckets.noDueDate > 0 ? (
            <Box
              component="button"
              type="button"
              onClick={() => {
                setBucket('no_due_date');
                setPage(0);
              }}
              sx={{
                textAlign: 'left',
                background: 'none',
                border: 'none',
                p: 0,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                fontSize: crm['text-row-sm'],
                color: color.accent,
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              {formatPaise(buckets.noDueDatePaise)} of this has no due date — it cannot be
              forecast. Show these →
            </Box>
          ) : null}
        </Box>
        <StatCard
          label="Overdue"
          value={formatPaise(buckets?.overduePaise ?? 0)}
          note="past its due date"
          danger={(buckets?.overduePaise ?? 0) > 0}
        />
      </Box>

      <Box>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={scope}
          onChange={(_, next: Scope | null) => {
            // MUI hands back `null` when the already-active button is clicked
            // again — exclusive groups otherwise allow deselecting to nothing,
            // which this control has no "nothing selected" state for.
            if (next) {
              setScope(next);
              setPage(0);
            }
          }}
          aria-label="Receivables scope"
        >
          {SCOPE_OPTIONS.map((opt) => (
            <ToggleButton key={opt.value} value={opt.value}>
              {opt.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/*
        A data gap, not an overdue debt — warning tone, never danger. Every
        loan recovery row shows the Add-bank button today (0 of 72 open loan
        milestones have a bank on file), so this reads "N of N" far more often
        than it reads as a minority; the copy below is written to hold either
        way rather than assume a minority.
      */}
      {scope === 'recovery-loan' && buckets && buckets.missingLenderProjects > 0 ? (
        <Alert variant="warning">
          {buckets.missingLenderProjects} of {buckets.recoveryProjects} loan projects have no bank
          share recorded. You may be chasing the customer for the bank&apos;s money.
        </Alert>
      ) : null}

      <CrmTable<ReceivableRow>
        columns={scope === 'all' ? RECEIVABLE_COLUMNS : RECOVERY_COLUMNS}
        rows={rows}
        getRowId={(row) => row.milestoneId}
        loading={query.isLoading}
        refetching={query.isFetching && !query.isLoading}
        itemLabel="milestones"
        gridMinWidth={scope === 'all' ? '920px' : '1180px'}
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
