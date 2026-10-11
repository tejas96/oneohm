'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type JSX, useCallback, useState } from 'react';

import {
  ReceivableRow,
  ReceivableRowSkeleton,
  RecoveryRowCard,
  RecoveryRowSkeleton,
} from './receivable-rows';

import { Alert } from '@/components/shared';
import {
  CalmListPage,
  ListEmpty,
  ListError,
  ListPager,
  ListSkeleton,
  ListTitle,
  ListToolbar,
  PillTabs,
  Segment,
  SegmentCard,
  type SortOption,
  StatTile,
  StatTiles,
  useListEntrance,
} from '@/components/shared/calm-list';
import type { TableUrlSortModel } from '@/lib/hooks';
import {
  useReceivables,
  useRecovery,
  type ReceivableFilters,
  type RecoveryFilters,
  type RecoveryRow,
} from '@/lib/hooks/resources/ledger';
import { getErrorMessage } from '@/lib/utils';
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
 * `all` is every open milestone; the other three are the collection list this
 * task adds — the net meter is in and money is still open, together or split
 * by who funded the job. One control, four states, never two rows of chips.
 */
type Scope = 'all' | 'recovery' | 'recovery-cash' | 'recovery-loan';

/** Anything that is not a Recovery tab is the full list — the bare URL. */
function toScope(value: string | null): Scope {
  return value === 'recovery' || value === 'recovery-cash' || value === 'recovery-loan'
    ? value
    : 'all';
}

const SCOPE_OPTIONS: ReadonlyArray<{ value: Scope; label: string }> = [
  { value: 'all', label: 'All open' },
  { value: 'recovery', label: 'Recovery — All' },
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
  recovery:
    'Meter installed, job delivered, money still owed — cash and loan jobs together, one row per project. Open a row to see its milestones. Waived amounts are excluded.',
  'recovery-cash':
    'Meter installed, job delivered, cash still owed — one row per project. Open a row to see its milestones. Waived amounts are excluded.',
  'recovery-loan':
    'Meter installed, job delivered, loan still owed — one row per project. Open a row to see its milestones. Waived amounts are excluded.',
};

/**
 * The four sortable columns of each old table, as one menu per list. With no
 * sort both APIs put the worst overdue first, which is why that option sends
 * none (asking for it by name returns the same order).
 */
const RECEIVABLE_SORT_OPTIONS: SortOption[] = [
  { label: 'Worst overdue first', model: null },
  { label: 'Least overdue first', model: { field: 'daysOverdue', direction: 'asc' } },
  { label: 'Short by: large to small', model: { field: 'outstandingAmount', direction: 'desc' } },
  { label: 'Short by: small to large', model: { field: 'outstandingAmount', direction: 'asc' } },
  { label: 'Due date: soonest first', model: { field: 'dueDate', direction: 'asc' } },
  { label: 'Due date: latest first', model: { field: 'dueDate', direction: 'desc' } },
  { label: 'Customer A–Z', model: { field: 'customerName', direction: 'asc' } },
  { label: 'Customer Z–A', model: { field: 'customerName', direction: 'desc' } },
];

const RECOVERY_SORT_OPTIONS: SortOption[] = [
  { label: 'Worst overdue first', model: null },
  { label: 'Least overdue first', model: { field: 'worstDaysOverdue', direction: 'asc' } },
  { label: 'Still owed: large to small', model: { field: 'outstanding', direction: 'desc' } },
  { label: 'Still owed: small to large', model: { field: 'outstanding', direction: 'asc' } },
  { label: 'Since meter: longest first', model: { field: 'daysSinceMeter', direction: 'desc' } },
  { label: 'Since meter: shortest first', model: { field: 'daysSinceMeter', direction: 'asc' } },
  { label: 'Customer A–Z', model: { field: 'customerName', direction: 'asc' } },
  { label: 'Customer Z–A', model: { field: 'customerName', direction: 'desc' } },
];

const MILESTONE_NOUN = { one: 'milestone', many: 'milestones' };
const PROJECT_NOUN = { one: 'project', many: 'projects' };

/** A screenful; a longer page does not need a longer placeholder. */
const MAX_SKELETON_ROWS = 10;

/** This list has no filter panel. */
const NO_FILTER_COLUMNS: never[] = [];
const NO_FILTERS = {};
const ignoreFilters = (): void => undefined;

/** The ageing views, by the bucket each asks the API for. */
const AGEING_VIEWS: ReadonlyArray<{
  bucket: NonNullable<ReceivableFilters['bucket']>;
  label: string;
  dot: string;
}> = [
  // Most of this bucket has no due date at all (198 of 202): a milestone is
  // only dated once its stage work is done. "Not due yet" claimed a date that
  // does not exist.
  { bucket: 'current', label: 'Not due / no date', dot: 'var(--ds-primary)' },
  { bucket: '1-30', label: '1–30 days', dot: 'var(--ds-warning)' },
  { bucket: '31-60', label: '31–60 days', dot: 'var(--ds-warning)' },
  { bucket: '61-90', label: '61–90 days', dot: 'var(--ds-danger)' },
  { bucket: '90plus', label: '90+ days', dot: 'var(--ds-danger)' },
];

const EMPTY_IDS: ReadonlySet<string> = new Set();

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
  // `?funding=cash|loan` narrows "All open" — the projects dashboard links here
  // with its Cash/Loan switch, and the total must match the card it came from.
  const fundingParam = searchParams.get('funding');
  const funding = fundingParam === 'cash' || fundingParam === 'loan' ? fundingParam : undefined;

  const [bucket, setBucket] = useState<ReceivableFilters['bucket']>(undefined);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  // Page and sort belong to one list: the lists sort on different columns, and
  // page 3 of one is not page 3 of another. Keyed by scope AND funding so a
  // change of either — from the toggle, a link, or Back/Forward between
  // `?funding=cash` and the bare URL — starts both afresh, never on a page the
  // shorter list does not have.
  const viewKey = `${scope}|${funding ?? 'all'}`;
  const [view, setView] = useState<{ key: string; page: number; sort: TableUrlSortModel | null }>({
    key: viewKey,
    page: 0,
    sort: null,
  });
  // The pager's `page` is zero-indexed; the API is one-indexed.
  const page = view.key === viewKey ? view.page : 0;
  const sortModel = view.key === viewKey ? view.sort : null;
  const setPage = (next: number): void => setView({ key: viewKey, page: next, sort: sortModel });
  const setSortModel = (next: TableUrlSortModel | null): void =>
    setView({ key: viewKey, page: 0, sort: next });
  const changePageSize = (next: number): void => {
    setPageSize(next);
    setPage(0);
  };

  const setScope = (next: Scope): void => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('funding');
    if (next === 'all') params.delete('scope');
    else params.set('scope', next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const receivables = useReceivables(
    {
      funding,
      bucket,
      search: search || undefined,
      sortBy: SORTABLE.find((f) => f === sortModel?.field),
      sortOrder: sortModel?.direction,
      page: page + 1,
      limit: pageSize,
    },
    { enabled: !isRecovery },
  );
  const recovery = useRecovery(
    {
      funding: scope === 'recovery-loan' ? 'loan' : scope === 'recovery-cash' ? 'cash' : undefined,
      bucket,
      search: search || undefined,
      sortBy: RECOVERY_SORTABLE.find((f) => f === sortModel?.field),
      sortOrder: sortModel?.direction,
      page: page + 1,
      limit: pageSize,
    },
    { enabled: isRecovery },
  );

  const receivableRows = receivables.data?.data ?? [];
  const recoveryRows = recovery.data?.data ?? [];
  const buckets = isRecovery ? recovery.data?.buckets : receivables.data?.buckets;
  // No figure until this scope, chip and search have answered. The cards used
  // to fall back to 0, so a slow or failed request read "₹0.00 — nothing
  // outstanding" on a book with ₹1.9 crore open.
  const failed = isRecovery ? recovery.isError : receivables.isError;
  const pending = failed ? 'could not load' : 'loading…';
  // The undated note counts projects on Recovery and milestones on the full list.
  const undatedCount = isRecovery
    ? (recovery.data?.buckets.noDueDateProjects ?? 0)
    : (receivables.data?.buckets.noDueDate ?? 0);
  const undatedLabel = `${undatedCount} ${isRecovery ? 'project' : 'milestone'}${undatedCount === 1 ? '' : 's'}`;

  const chooseBucket = (next: ReceivableFilters['bucket']): void => {
    setBucket(next);
    setPage(0);
  };
  const countFor = (key: NonNullable<ReceivableFilters['bucket']>): number | undefined => {
    if (!buckets) return undefined;
    if (key === 'current') return buckets.current;
    if (key === '1-30') return buckets.d1to30;
    if (key === '31-60') return buckets.d31to60;
    if (key === '61-90') return buckets.d61to90;
    return buckets.d90plus;
  };

  // Which projects show their milestones. Kept per scope, so Cash and Loan
  // never share opened rows.
  const [opened, setOpened] = useState<{ scope: Scope; ids: ReadonlySet<string> }>(() => ({
    scope,
    ids: new Set(),
  }));
  const openIds = opened.scope === scope ? opened.ids : EMPTY_IDS;
  const toggleProject = useCallback(
    (row: RecoveryRow): void => {
      setOpened((current) => {
        const ids = new Set(current.scope === scope ? current.ids : []);
        if (ids.has(row.projectId)) ids.delete(row.projectId);
        else ids.add(row.projectId);
        return { scope, ids };
      });
    },
    [scope],
  );

  const active = isRecovery ? recovery : receivables;
  const rowCount = isRecovery ? recoveryRows.length : receivableRows.length;
  // Rows rise in once. Later changes swap in without replaying it.
  const entering = useListEntrance(rowCount);

  return (
    <CalmListPage
      // Three figures, the scope and the ageing views would leave little room for the rows.
      pinHeader={false}
      header={
        <>
          <ListTitle
            title="Receivables"
            sub={
              <>
                {SCOPE_INTRO[scope]}
                {scope === 'all' && funding ? (
                  <span className="mt-1 block text-[13px]">
                    {funding === 'cash' ? 'Cash' : 'Loan'} jobs only.{' '}
                    <button
                      type="button"
                      onClick={() => {
                        const params = new URLSearchParams(searchParams.toString());
                        params.delete('funding');
                        const qs = params.toString();
                        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
                      }}
                      className="font-semibold text-primary-dark hover:underline"
                    >
                      Show all
                    </button>
                  </span>
                ) : null}
              </>
            }
            actions={
              <PillTabs
                label="Receivables scope"
                options={SCOPE_OPTIONS}
                value={scope}
                // Choosing the scope already shown changes nothing — in
                // particular it keeps a `?funding=` the link arrived with.
                onChange={(next) => {
                  if (next !== scope) setScope(next);
                }}
              />
            }
          />

          <StatTiles label="Receivables totals" className="mb-2.5 sm:grid-cols-3">
            <StatTile
              label={isRecovery ? 'Projects to recover' : 'Open milestones'}
              value={buckets ? String(buckets.all) : '—'}
              note={
                !buckets
                  ? pending
                  : isRecovery
                    ? 'delivered, money still due'
                    : 'with money still due'
              }
            />
            <StatTile
              label="Total outstanding"
              value={buckets ? formatPaise(buckets.totalOutstandingPaise) : '—'}
              note={
                !buckets
                  ? pending
                  : search
                    ? 'matching the search'
                    : isRecovery
                      ? 'across these projects'
                      : 'across every open milestone'
              }
              below={
                /*
                  A forecasting gap, not hidden debt: per spec §2.4, 178 of these 198
                  milestones have zero work done, so the money is genuinely not owed
                  yet — it just cannot be dated. No sixth ageing view: this note IS
                  the toggle, in both directions. None of the ageing views (nor
                  "All open") is pressed while this filter is active — without the
                  note itself changing state, a financier who clicked through would
                  see the row count drop, nothing on screen indicate a filter is on,
                  and no visible way back to "All open". `|| bucket === 'no_due_date'`
                  keeps this block on screen for exactly that state even if a
                  narrower search happens to leave zero undated rows in the current
                  scope, so the way out never disappears while it is still needed.
                */
                buckets && (undatedCount > 0 || bucket === 'no_due_date') ? (
                  <button
                    type="button"
                    onClick={() =>
                      chooseBucket(bucket === 'no_due_date' ? undefined : 'no_due_date')
                    }
                    className="px-1 text-left text-[12px] text-primary-dark hover:underline"
                  >
                    {bucket === 'no_due_date' ? (
                      <>
                        Showing only the {undatedLabel} with money that has no due date —{' '}
                        {formatPaise(buckets.noDueDatePaise)} that just can&apos;t be forecast yet.
                        Show all →
                      </>
                    ) : (
                      <>
                        {formatPaise(buckets.noDueDatePaise)} of this has no due date — it cannot be
                        forecast. Show these →
                      </>
                    )}
                  </button>
                ) : null
              }
            />
            <StatTile
              label="Overdue"
              value={buckets ? formatPaise(buckets.overduePaise) : '—'}
              note={buckets ? 'past its due date' : pending}
              tone={(buckets?.overduePaise ?? 0) > 0 ? 'danger' : 'default'}
            />
          </StatTiles>

          {/*
            A data gap, not an overdue debt — warning tone, never danger.
            `missingLenderProjects` counts projects with no lender-payer
            milestone: the bank's share was never split out of the contract.
            The row's "Add bank" button only PATCHes `financingBank` on the
            property — it does not create that milestone and does not move this
            count. Confirmed live, not assumed: attach a real bank to a real row
            and refetch, and the number is unchanged (task-15-report.md,
            "End-to-end proof of the Add-bank flow"). Attaching a bank and
            splitting the bank's share out of the contract are different
            problems, so the copy says outright that the button below does not
            resolve this banner — otherwise a collector who clicks it and still
            sees "15 of 15" concludes the feature is broken.
          */}
          {(scope === 'recovery-loan' || scope === 'recovery') &&
          recovery.data &&
          recovery.data.buckets.missingLenderProjects > 0 ? (
            <div className="mb-2.5">
              <Alert variant="warning">
                {recovery.data.buckets.missingLenderProjects} of{' '}
                {recovery.data.buckets.loanProjects} loan projects have no bank share split out of
                the contract (marked on their rows). The customer may be getting chased for the
                bank&apos;s money. This needs the project&apos;s payment terms reviewed — adding a
                bank name below won&apos;t change this count.
              </Alert>
            </div>
          ) : null}

          {/* The ageing views. "All open" carries no number: it is the first
              figure above, and one fact has one home. */}
          <SegmentCard label={isRecovery ? 'Projects by ageing' : 'Milestones by ageing'}>
            <Segment
              pressed={!bucket}
              onClick={() => chooseBucket(undefined)}
              count={null}
              label="All open"
            />
            {AGEING_VIEWS.map((view) => (
              <Segment
                key={view.bucket}
                pressed={bucket === view.bucket}
                onClick={() => chooseBucket(view.bucket)}
                count={countFor(view.bucket)}
                label={view.label}
                dot={view.dot}
              />
            ))}
          </SegmentCard>
        </>
      }
      toolbar={
        <ListToolbar
          search={search}
          onSearchChange={(next) => {
            setSearch(next);
            setPage(0);
          }}
          searchPlaceholder={
            isRecovery ? 'Search customer or project' : 'Search customer, project or milestone'
          }
          searchLabel={isRecovery ? 'Search projects to recover' : 'Search receivables'}
          // Both APIs search on any length.
          searchMinLength={1}
          filterColumns={NO_FILTER_COLUMNS}
          filters={NO_FILTERS}
          onFilterChange={ignoreFilters}
          sortOptions={isRecovery ? RECOVERY_SORT_OPTIONS : RECEIVABLE_SORT_OPTIONS}
          sortModel={sortModel}
          onSortChange={setSortModel}
        />
      }
      error={
        failed ? (
          <ListError
            title={isRecovery ? 'Couldn’t load the recovery list' : 'Couldn’t load receivables'}
            message={getErrorMessage(active.error)}
            onRetry={() => void active.refetch()}
          />
        ) : null
      }
      isFetching={active.isFetching}
      isLoading={active.isLoading}
      page={page}
      footer={
        <ListPager
          page={page}
          pageSize={pageSize}
          totalRowCount={active.data?.total ?? 0}
          onPageChange={setPage}
          onPageSizeChange={changePageSize}
          noun={isRecovery ? PROJECT_NOUN : MILESTONE_NOUN}
          countUnknown={failed && !active.data}
        />
      }
    >
      {active.isLoading ? (
        <ListSkeleton
          rows={Math.min(pageSize, MAX_SKELETON_ROWS)}
          label={isRecovery ? 'Loading projects' : 'Loading milestones'}
          renderRow={() => (isRecovery ? <RecoveryRowSkeleton /> : <ReceivableRowSkeleton />)}
        />
      ) : rowCount === 0 ? (
        failed ? null : (
          <ListEmpty
            title={
              search
                ? 'No match for this search'
                : isRecovery
                  ? 'Nothing to recover.'
                  : 'Nothing outstanding.'
            }
            hint={search ? 'Try another customer or project.' : undefined}
          />
        )
      ) : isRecovery ? (
        <div className="flex flex-col gap-2">
          {recoveryRows.map((row, index) => (
            <RecoveryRowCard
              key={row.projectId}
              row={row}
              index={index}
              entering={entering}
              expanded={openIds.has(row.projectId)}
              onToggle={toggleProject}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {receivableRows.map((row, index) => (
            <ReceivableRow key={row.milestoneId} row={row} index={index} entering={entering} />
          ))}
        </div>
      )}
    </CalmListPage>
  );
}
