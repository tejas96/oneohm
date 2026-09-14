'use client';

import { Box, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type JSX, useMemo, useState } from 'react';

import {
  RECEIVABLE_COLUMNS,
  RECOVERY_PROJECT_COLUMNS,
  type ReceivableRow,
  type RecoveryTableRow,
} from './receivables-columns';
import { RecoveryMilestones } from './recovery-milestones';

import { Alert } from '@/components/shared';
import type { TableSortModel } from '@/components/shared/advanced-table';
import { CrmTable, type CrmQuickFilter } from '@/components/shared/crm-table';
import {
  useReceivables,
  useRecovery,
  type ReceivableFilters,
  type RecoveryFilters,
} from '@/lib/hooks/resources/ledger';
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

type RecoverySortField = NonNullable<RecoveryFilters['sortBy']>;
const RECOVERY_SORTABLE: readonly RecoverySortField[] = [
  'daysSinceMeter',
  'outstanding',
  'worstDaysOverdue',
  'customerName',
];

/**
 * `all` is every open milestone; the other two are the collection list this
 * task adds — the net meter is in and money is still open, split by who
 * funded the job. One control, three states, never two rows of chips.
 */
type Scope = 'all' | 'recovery-cash' | 'recovery-loan';

/** Anything that is not a Recovery tab is the full list — the bare URL. */
function toScope(value: string | null): Scope {
  return value === 'recovery-cash' || value === 'recovery-loan' ? value : 'all';
}

const SCOPE_OPTIONS: ReadonlyArray<{ value: Scope; label: string }> = [
  { value: 'all', label: 'All open' },
  { value: 'recovery-cash', label: 'Recovery — Cash' },
  { value: 'recovery-loan', label: 'Recovery — Loan' },
];

/**
 * "Every open milestone, worst overdue first" is only true for `all` — a
 * Recovery scope selects by the meter being installed, not by ageing, so the
 * same line under it would claim an ordering/selection principle that is not
 * what put those rows on screen. One short description per scope state.
 */
const SCOPE_INTRO: Record<Scope, string> = {
  all: 'Every open milestone, worst overdue first. Waived amounts are excluded, so a written-off residual stops being chased.',
  'recovery-cash':
    'Meter installed, job delivered, cash still owed — one row per project. Open a row to see its milestones. Waived amounts are excluded.',
  'recovery-loan':
    'Meter installed, job delivered, loan still owed — one row per project. Open a row to see its milestones. Waived amounts are excluded.',
};

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
 * The Recovery scopes turn it into a call list: the meter is in, the job is
 * delivered, and someone still owes money for it. One row per job, not per
 * milestone — the length of the list is the number of calls to make.
 */
export function FinanceReceivablesPage(): JSX.Element {
  // The scope lives in the URL (`?scope=recovery-cash`), so a refresh keeps it,
  // a link can open it, and "Projects commissioned" lands on Recovery directly.
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scope = toScope(searchParams.get('scope'));
  const isRecovery = scope !== 'all';

  const [bucket, setBucket] = useState<ReceivableFilters['bucket']>(undefined);
  const [search, setSearch] = useState('');
  // Page and sort belong to one scope: the two lists sort on different
  // columns, and page 3 of one is not page 3 of the other. Keyed by scope so
  // a scope change — from the toggle or from the URL — starts both afresh.
  const [view, setView] = useState<{ scope: Scope; page: number; sort: TableSortModel | null }>({
    scope,
    page: 0,
    sort: null,
  });
  // CrmTable's `page` is zero-indexed; the API is one-indexed.
  const page = view.scope === scope ? view.page : 0;
  const sortModel = view.scope === scope ? view.sort : null;
  const setPage = (next: number): void => setView({ scope, page: next, sort: sortModel });
  const setSortModel = (next: TableSortModel | null): void =>
    setView({ scope, page: 0, sort: next });

  const setScope = (next: Scope): void => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'all') params.delete('scope');
    else params.set('scope', next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const receivables = useReceivables(
    {
      bucket,
      search: search || undefined,
      sortBy: SORTABLE.find((f) => f === sortModel?.field),
      sortOrder: sortModel?.direction,
      page: page + 1,
      limit: PAGE_SIZE,
    },
    { enabled: !isRecovery },
  );
  const recovery = useRecovery(
    {
      funding: scope === 'recovery-loan' ? 'loan' : 'cash',
      bucket,
      search: search || undefined,
      sortBy: RECOVERY_SORTABLE.find((f) => f === sortModel?.field),
      sortOrder: sortModel?.direction,
      page: page + 1,
      limit: PAGE_SIZE,
    },
    { enabled: isRecovery },
  );

  const receivableRows = (receivables.data?.data ?? []) as ReceivableRow[];
  const recoveryRows = (recovery.data?.data ?? []) as RecoveryTableRow[];
  const buckets = isRecovery ? recovery.data?.buckets : receivables.data?.buckets;
  // The undated note counts projects on Recovery and milestones on the full list.
  const undatedCount = isRecovery
    ? (recovery.data?.buckets.noDueDateProjects ?? 0)
    : (receivables.data?.buckets.noDueDate ?? 0);
  const undatedLabel = `${undatedCount} ${isRecovery ? 'project' : 'milestone'}${undatedCount === 1 ? '' : 's'}`;

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
          {SCOPE_INTRO[scope]}
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
          label={isRecovery ? 'Projects to recover' : 'Open milestones'}
          value={String(buckets?.all ?? 0)}
          note={isRecovery ? 'delivered, money still due' : 'with money still due'}
        />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <StatCard
            label="Total outstanding"
            value={formatPaise(buckets?.totalOutstandingPaise ?? 0)}
            note={isRecovery ? 'across these projects' : 'across every open milestone'}
          />
          {/*
            A forecasting gap, not hidden debt: per spec §2.4, 178 of these 198
            milestones have zero work done, so the money is genuinely not owed
            yet — it just cannot be dated. No seventh chip: this note IS the
            toggle, in both directions. `CrmTableToolbar` has no chip keyed
            'no_due_date', so none of the six preset chips (nor "All open")
            lights up while this filter is active — without the note itself
            changing state, a financier who clicked through would see the row
            count drop, nothing on screen indicate a filter is on, and no
            visible way back to "All open". `|| bucket === 'no_due_date'`
            keeps this block on screen for exactly that state even if a
            narrower search happens to leave zero undated rows in the current
            scope, so the way out never disappears while it is still needed.
          */}
          {buckets && (undatedCount > 0 || bucket === 'no_due_date') ? (
            <Box
              component="button"
              type="button"
              onClick={() => {
                setBucket(bucket === 'no_due_date' ? undefined : 'no_due_date');
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
              {bucket === 'no_due_date' ? (
                <>
                  Showing only the {undatedLabel} with money that has no due date —{' '}
                  {formatPaise(buckets.noDueDatePaise)} that just can&apos;t be forecast yet. Show
                  all →
                </>
              ) : (
                <>
                  {formatPaise(buckets.noDueDatePaise)} of this has no due date — it cannot be
                  forecast. Show these →
                </>
              )}
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
            if (next) setScope(next);
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
        A data gap, not an overdue debt — warning tone, never danger.
        `missingLenderProjects` counts projects with no lender-payer
        milestone: the bank's share was never split out of the contract.
        `BankCell`'s "Add bank" button only PATCHes `financingBank` on the
        property — it does not create that milestone and does not move this
        count. Confirmed live, not assumed: attach a real bank to a real row
        and refetch, and the number is unchanged (task-15-report.md,
        "End-to-end proof of the Add-bank flow"). Attaching a bank and
        splitting the bank's share out of the contract are different
        problems, so the copy says outright that the button below does not
        resolve this banner — otherwise a collector who clicks it and still
        sees "15 of 15" concludes the feature is broken.
      */}
      {scope === 'recovery-loan' &&
      recovery.data &&
      recovery.data.buckets.missingLenderProjects > 0 ? (
        <Alert variant="warning">
          {recovery.data.buckets.missingLenderProjects} of {recovery.data.buckets.all} loan projects
          have no bank share split out of the contract (marked on their rows). The customer may be
          getting chased for the bank&apos;s money. This needs the project&apos;s payment terms
          reviewed — adding a bank name below won&apos;t change this count.
        </Alert>
      ) : null}

      {isRecovery ? (
        <CrmTable<RecoveryTableRow>
          // Keyed by scope so Cash and Loan never share expanded rows.
          key={scope}
          columns={RECOVERY_PROJECT_COLUMNS}
          rows={recoveryRows}
          getRowId={(row) => row.projectId}
          loading={recovery.isLoading}
          refetching={recovery.isFetching && !recovery.isLoading}
          itemLabel="projects"
          gridMinWidth="980px"
          // The two tables are separate instances; carry the typed search over.
          initialSearch={search}
          searchPlaceholder="Search customer or project"
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
          onSortChange={setSortModel}
          page={page}
          pageSize={PAGE_SIZE}
          totalRowCount={recovery.data?.total ?? 0}
          onPageChange={setPage}
          renderExpandedRow={(row) => <RecoveryMilestones projectId={row.projectId} />}
          emptyMessage="Nothing to recover."
        />
      ) : (
        <CrmTable<ReceivableRow>
          key="all"
          columns={RECEIVABLE_COLUMNS}
          rows={receivableRows}
          getRowId={(row) => row.milestoneId}
          loading={receivables.isLoading}
          refetching={receivables.isFetching && !receivables.isLoading}
          itemLabel="milestones"
          gridMinWidth="920px"
          initialSearch={search}
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
          onSortChange={setSortModel}
          page={page}
          pageSize={PAGE_SIZE}
          totalRowCount={receivables.data?.total ?? 0}
          onPageChange={setPage}
          emptyMessage="Nothing outstanding."
        />
      )}
    </Box>
  );
}
