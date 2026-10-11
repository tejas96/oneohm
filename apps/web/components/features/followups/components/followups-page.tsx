'use client';

import { Button } from '@mui/material';
import { FollowupStatus, FollowupType, LeadTemperature } from '@tejas96/shared/types';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type JSX } from 'react';

import { dayBoundaries, SCOPE_LABELS, type FollowupScope } from '../constants';
import {
  useCancelFollowup,
  useFollowupGaps,
  useFollowups,
  useFollowupSummary,
  type FollowupGap,
  type FollowupResponse,
} from '../hooks';
import { FollowupCompleteDialog } from './followup-complete-dialog';
import { FollowupDetailHost } from './followup-detail-host';
import { FollowupDrawer } from './followup-drawer';
import {
  FOLLOWUP_FILTER_COLUMNS,
  FollowupOwnerSelect,
  type FollowupOwner,
} from './followup-owner-select';
import { FollowupReassignDialog } from './followup-reassign-dialog';
import { FollowupRescheduleDialog } from './followup-reschedule-dialog';
import { FOLLOWUP_ROWS_STYLE, FollowupRow, FollowupRowSkeleton } from './followup-row';
import { followupRecordHref } from '../lib/followup-href';
import { useUrlChoice } from '../lib/use-url-choice';

import type { ColumnConfig, FilterState } from '@/components/shared/advanced-table';
import {
  BONE,
  CalmListPage,
  ListEmpty,
  ListError,
  ListPager,
  ListSkeleton,
  ListTitle,
  ListToolbar,
  Segment,
  SegmentCard,
  SelectionBar,
  SKELETON_CARD,
  useKeepPageInRange,
  useListEntrance,
} from '@/components/shared/calm-list';
import { showToast } from '@/components/ui';
import { type TableUrlFilterRecord, useTableUrlState } from '@/lib/hooks';
import { useGatedAction } from '@/lib/rbac';
import { cn, formatNumber, getErrorMessage } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

const SCOPES: FollowupScope[] = ['overdue', 'today', 'upcoming', 'gaps'];

const PAGE_SIZE = 50;

const FOLLOWUP_NOUN = { one: 'follow-up', many: 'follow-ups' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** `?scope=` as a window the page has, else null. */
const acceptScope = (raw: string): FollowupScope | null =>
  (SCOPES as string[]).includes(raw) ? (raw as FollowupScope) : null;

/** `?owner=` as "me", "all" or a user id, else null. */
const acceptOwner = (raw: string): FollowupOwner | null =>
  raw === 'me' || raw === 'all' || UUID.test(raw) ? raw : null;

const oneOf = (value: unknown, allowed: readonly string[]): string | undefined =>
  typeof value === 'string' && allowed.includes(value) ? value : undefined;

/**
 * The filter record from the URL with everything the list would not understand
 * taken out, so a hand-edited link cannot send the API a status it rejects or
 * show a chip for a filter that is not applied.
 */
function sanitizeFilters(raw: TableUrlFilterRecord): FilterState {
  const day = (value: unknown): string | undefined =>
    typeof value === 'string' && DAY.test(value) ? value : undefined;
  const kept: FilterState = {
    status: oneOf(raw.status, Object.values(FollowupStatus)),
    type: oneOf(raw.type, Object.values(FollowupType)),
    leadTemperature: oneOf(raw.leadTemperature, Object.values(LeadTemperature)),
    fromDate: day(raw.fromDate),
    toDate: day(raw.toDate),
  };
  return Object.fromEntries(Object.entries(kept).filter(([, value]) => value !== undefined));
}

/** The gaps view has its own fixed rule, so it offers no filter panel. */
const NO_FILTER_COLUMNS: ColumnConfig<FollowupResponse>[] = [];

/** A screenful of placeholders is enough. */
const SKELETON_ROWS = 8;

/** The card a coverage gap sits in — the same card a follow-up row has. */
const GAP_CARD = cn(SKELETON_CARD, 'flex items-center justify-between gap-4');

/** Start of an IST calendar day (yyyy-mm-dd). India has no DST, so +1 day is +24h. */
const istDayStart = (ymd: string, addDays = 0): string =>
  new Date(new Date(`${ymd}T00:00:00+05:30`).getTime() + addDays * 86_400_000).toISOString();

/**
 * Schedule action for a coverage gap. Its own component so gating hooks can run
 * — the surrounding list maps over gaps inline.
 */
function GatedScheduleButton({
  gap,
  onSchedule,
}: {
  gap: FollowupGap;
  onSchedule: (gap: FollowupGap) => void;
}): React.JSX.Element {
  const { allowed, onGatedClick } = useGatedAction(
    'followups.manage',
    () => onSchedule(gap),
    'Schedule follow-up',
  );
  return (
    <Button
      size="small"
      variant="outlined"
      onClick={onGatedClick}
      aria-disabled={!allowed}
      sx={allowed ? undefined : { opacity: 0.5 }}
    >
      Schedule
    </Button>
  );
}

export function FollowupsPage(): JSX.Element {
  const { user } = useAuth();
  /**
   * The whole view lives in the address bar — the window (`scope`), the owner,
   * the search, the panel filters and the page — so opening a lead and pressing
   * Back returns to the list as it was, and a link opens it the same way.
   * `?scope=overdue&owner=all` is how the customers list links its company-wide
   * "follow-ups overdue" count to the rows behind it.
   */
  const [scope, setScope] = useUrlChoice<FollowupScope>('scope', 'today', acceptScope);
  const [owner, setOwner] = useUrlChoice<FollowupOwner>('owner', 'me', acceptOwner);
  const urlState = useTableUrlState({ prefix: 'followups', defaultPageSize: PAGE_SIZE });
  const { setFilters, setPage } = urlState;
  // Panel filters (status, type, site temperature, from/to). Empty = open work.
  const filters = useMemo(() => sanitizeFilters(urlState.state.filters), [urlState.state.filters]);
  // As typed (the toolbar debounces it). Trimmed only where it is sent: trimming
  // it here would hand the box back a shorter value and eat the space mid-name.
  const searchText = urlState.state.search;
  const search = searchText.trim();
  const page = urlState.state.page;
  const pick = <T extends string>(key: string): T | undefined =>
    typeof filters[key] === 'string' && filters[key] ? (filters[key] as T) : undefined;
  const status = pick<FollowupStatus>('status') ?? FollowupStatus.PENDING;
  const type = pick<FollowupType>('type');
  const leadTemperature = pick<LeadTemperature>('leadTemperature');
  const fromDate = pick<string>('fromDate');
  const toDate = pick<string>('toDate');

  const assigneeId = owner === 'me' ? user?.id : owner === 'all' ? undefined : owner;

  const { data: summary } = useFollowupSummary(
    owner !== 'all',
    owner === 'me' ? undefined : assigneeId,
  );

  const { startOfToday, startOfTomorrow } = useMemo(() => dayBoundaries(), []);

  /**
   * Tabs are quick views over open work. A date range or a non-open status
   * replaces the tab's window, so no tab shows as active until it is clicked.
   */
  const tabWindowActive = status === FollowupStatus.PENDING && !fromDate && !toDate;

  /**
   * The scope decides the date window. Overdue is everything before midnight
   * today; today is the single calendar day; upcoming is everything after.
   */
  const dateFilters = useMemo(() => {
    if (!tabWindowActive) {
      return {
        from: fromDate ? istDayStart(fromDate) : undefined,
        // "To 10 Oct" includes all of 10 Oct.
        to: toDate ? istDayStart(toDate, 1) : undefined,
      };
    }
    if (scope === 'overdue') return { to: startOfToday.toISOString() };
    if (scope === 'today') {
      return { from: startOfToday.toISOString(), to: startOfTomorrow.toISOString() };
    }
    return { from: startOfTomorrow.toISOString() };
  }, [tabWindowActive, fromDate, toDate, scope, startOfToday, startOfTomorrow]);

  const showingGaps = tabWindowActive && scope === 'gaps';

  const { data, isLoading, isFetching, isError, error, refetch } = useFollowups(
    {
      status,
      assignedToUserId: assigneeId,
      type,
      leadTemperature,
      search: search || undefined,
      ...dateFilters,
      page: page + 1,
      limit: PAGE_SIZE,
    },
    { enabled: !showingGaps },
  );

  /** Any filter that narrows the list below what the tab counts measure. */
  const narrowed = !tabWindowActive || Boolean(search || type || leadTemperature);

  // `setFilters` and `setSearch` go back to the first page themselves.
  const changeFilters = (next: FilterState): void => setFilters(next);

  const { data: allGaps = [], isLoading: gapsLoading } = useFollowupGaps({
    enabled: showingGaps,
  });

  /**
   * Gaps respect the owner filter via their attributed user — the last
   * completed followup's assignee, else whoever created the record. Without
   * this, "Me" would silently show everyone's unattended leads.
   */
  const gaps = useMemo(() => {
    const owned = assigneeId
      ? allGaps.filter((gap) => gap.attributedUserId === assigneeId)
      : allGaps;
    // The search box is on screen for this view too, so it narrows it: by name.
    const term = search.toLowerCase();
    return term ? owned.filter((gap) => gap.name.toLowerCase().includes(term)) : owned;
  }, [allGaps, assigneeId, search]);

  /**
   * Rendering ~900 rows at once janks the page for no benefit — nobody works a
   * list that long in one sitting. Capped, and the cap is stated rather than
   * silently truncating.
   */
  const GAP_RENDER_LIMIT = 50;
  const visibleGaps = gaps.slice(0, GAP_RENDER_LIMIT);

  const rows = useMemo(() => data?.data ?? [], [data?.data]);
  const total = data?.meta?.total;

  // ── Row actions ──────────────────────────────────────────────────────────
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [completing, setCompleting] = useState<FollowupResponse | null>(null);
  const [rescheduling, setRescheduling] = useState<FollowupResponse | null>(null);
  const [reassigning, setReassigning] = useState<FollowupResponse[]>([]);
  const [schedulingGap, setSchedulingGap] = useState<FollowupGap | null>(null);

  const cancelMutation = useCancelFollowup();

  /**
   * Pending siblings on the SAME lead unit as the followup being completed.
   *
   * This list is scoped to one date window, so it can undercount siblings that
   * fall outside it. The server re-checks before enforcing, so the worst case is
   * a dialog that offers an optional next followup the API then insists on —
   * never a lead going dark.
   */
  const pendingSiblings = useMemo(() => {
    if (!completing) return 0;
    const unitId = completing.propertyId ?? null;
    return rows.filter(
      (row) =>
        row.status === FollowupStatus.PENDING &&
        row.id !== completing.id &&
        row.customerId === completing.customerId &&
        (row.propertyId ?? null) === unitId,
    ).length;
  }, [rows, completing]);

  // ── Ticked rows (bulk reassign). A different page or filter is a different
  // list, so the ticks do not carry over. ──
  const [tickedIds, setTickedIds] = useState<ReadonlySet<string>>(() => new Set());
  const viewKey = JSON.stringify([scope, owner, filters, search, page]);
  useEffect(() => {
    setTickedIds(new Set());
  }, [viewKey]);
  const handleTick = useCallback((followup: FollowupResponse, ticked: boolean) => {
    setTickedIds((current) => {
      const next = new Set(current);
      if (ticked) next.add(followup.id);
      else next.delete(followup.id);
      return next;
    });
  }, []);
  const tickedRows = rows.filter((row) => tickedIds.has(row.id));

  const handleViewDetails = useCallback(
    (followup: FollowupResponse) => setViewingId(followup.id),
    [],
  );
  const handleReassignOne = useCallback(
    (followup: FollowupResponse) => setReassigning([followup]),
    [],
  );
  const { mutate: cancelFollowup } = cancelMutation;
  const handleCancel = useCallback(
    (followup: FollowupResponse) =>
      cancelFollowup(followup.id, {
        onSuccess: () => showToast.success('Follow-up cancelled — the lead now needs a new one'),
        onError: (cancelError) => showToast.error(getErrorMessage(cancelError)),
      }),
    [cancelFollowup],
  );

  // Rows rise in once. Later changes swap in without replaying it.
  const entering = useListEntrance(rows.length);

  useKeepPageInRange({
    page,
    pageSize: PAGE_SIZE,
    total: showingGaps ? undefined : total,
    isFetching,
    onPageChange: setPage,
  });

  const countFor = (key: FollowupScope): number | undefined =>
    key === 'gaps'
      ? summary?.gaps
      : key === 'overdue'
        ? summary?.overdue
        : key === 'today'
          ? summary?.today
          : summary?.upcoming;

  const resultLabel = showingGaps
    ? `${formatNumber(gaps.length)} ${gaps.length === 1 ? 'lead' : 'leads'}`
    : total === undefined
      ? undefined
      : `${formatNumber(total)} ${total === 1 ? 'follow-up' : 'follow-ups'}`;

  return (
    <CalmListPage
      header={
        <>
          <ListTitle
            title="Follow-ups"
            sub="Every open lead should owe someone an action."
            actions={
              // A default view, not a permission — anyone may see everyone's.
              <FollowupOwnerSelect
                value={owner}
                currentUserId={user?.id}
                onChange={(next) => {
                  setOwner(next);
                  setPage(0, { replace: true });
                }}
              />
            }
          />

          {/* The four quick views of open work. A number is the count the view
              opens; while a search or filter narrows the list the counts no
              longer describe it, so they are left out rather than shown wrong. */}
          <SegmentCard label="Follow-ups by when they are due">
            {SCOPES.map((key) => (
              <Segment
                key={key}
                // No view is pressed while a date range or non-open status replaces its window.
                pressed={tabWindowActive && scope === key}
                onClick={() => {
                  setScope(key);
                  // A view is open work in its own window, so it drops whatever
                  // replaced that window; the gaps view takes no filter at all.
                  setFilters(
                    key === 'gaps'
                      ? {}
                      : { ...filters, status: undefined, fromDate: undefined, toDate: undefined },
                  );
                  setPage(0, { replace: true });
                }}
                count={narrowed ? null : countFor(key)}
                label={SCOPE_LABELS[key]}
                warn={key === 'overdue' && (summary?.overdue ?? 0) > 0}
              />
            ))}
          </SegmentCard>
        </>
      }
      toolbar={
        <ListToolbar
          search={searchText}
          onSearchChange={urlState.setSearch}
          // The gaps view is narrowed in the browser, by the lead's name only.
          searchPlaceholder={showingGaps ? 'Search name' : 'Search name, site, phone'}
          searchLabel="Search follow-ups"
          // The follow-ups API searches on any length.
          searchMinLength={1}
          filterColumns={showingGaps ? NO_FILTER_COLUMNS : FOLLOWUP_FILTER_COLUMNS}
          filters={filters}
          onFilterChange={changeFilters}
          resultLabel={resultLabel}
        />
      }
      error={
        isError && !showingGaps ? (
          <ListError
            title="Failed to load follow-ups"
            message={getErrorMessage(error)}
            onRetry={() => void refetch()}
          />
        ) : null
      }
      isFetching={showingGaps ? gapsLoading : isFetching}
      isLoading={showingGaps ? gapsLoading : isLoading}
      page={page}
      footer={
        showingGaps ? null : (
          <ListPager
            page={page}
            pageSize={PAGE_SIZE}
            totalRowCount={total ?? 0}
            onPageChange={setPage}
            noun={FOLLOWUP_NOUN}
            countUnknown={isError && !data}
          />
        )
      }
      overlays={
        <>
          {tickedRows.length > 0 ? (
            <SelectionBar
              label={`${tickedRows.length} follow-up${tickedRows.length === 1 ? '' : 's'} selected`}
              onClear={() => setTickedIds(new Set())}
            >
              {tickedRows.length < rows.length ? (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setTickedIds(new Set(rows.map((row) => row.id)))}
                >
                  Select all {rows.length}
                </Button>
              ) : null}
              <Button size="small" variant="contained" onClick={() => setReassigning(tickedRows)}>
                Reassign
              </Button>
            </SelectionBar>
          ) : null}

          <FollowupDetailHost
            followupId={viewingId}
            initialData={rows.find((row) => row.id === viewingId)}
            onClose={() => setViewingId(null)}
            siblingRows={rows}
          />

          <FollowupCompleteDialog
            open={Boolean(completing)}
            followup={completing}
            pendingSiblings={pendingSiblings}
            onClose={() => setCompleting(null)}
          />

          <FollowupRescheduleDialog followup={rescheduling} onClose={() => setRescheduling(null)} />

          <FollowupReassignDialog
            followups={reassigning}
            onClose={() => setReassigning([])}
            // Moved: the ticks have done their job. (Cancelled: they stay.)
            onReassigned={() => setTickedIds(new Set())}
          />

          {schedulingGap && (
            <FollowupDrawer
              open
              onClose={() => setSchedulingGap(null)}
              customerId={schedulingGap.customerId}
              propertyId={schedulingGap.propertyId ?? undefined}
              leadTemperature={schedulingGap.leadTemperature}
            />
          )}
        </>
      }
    >
      {showingGaps ? (
        <>
          <p className="mb-2.5 mt-0 px-1 text-[13px] text-foreground-secondary">
            Open leads with no follow-up scheduled. Records created by import or direct API call
            never pass the UI gates, so whatever slipped shows up here.
          </p>
          {gapsLoading ? (
            <ListSkeleton
              rows={SKELETON_ROWS}
              label="Loading leads"
              renderRow={() => (
                <div className={GAP_CARD}>
                  <span className="flex min-w-0 flex-1 flex-col gap-2">
                    <span className={cn(BONE, 'h-4 w-2/5')} />
                    <span className={cn(BONE, 'h-3 w-1/5')} />
                  </span>
                  <span className={cn(BONE, 'h-7 w-20')} />
                </div>
              )}
            />
          ) : gaps.length === 0 ? (
            <ListEmpty
              title={
                search
                  ? 'No lead matches'
                  : owner === 'me'
                    ? 'Nothing unattended is attributed to you.'
                    : owner === 'all'
                      ? 'Nothing is unattended.'
                      : 'Nothing unattended is attributed to this person.'
              }
            />
          ) : (
            <div className="flex flex-col gap-2">
              {visibleGaps.map((gap) => {
                const href = followupRecordHref(gap);
                return (
                  <div key={`${gap.kind}-${gap.propertyId ?? gap.customerId}`} className={GAP_CARD}>
                    <div className="min-w-0">
                      {href ? (
                        <Link
                          href={href}
                          prefetch={false}
                          title={gap.name}
                          className="block truncate text-[16px] font-semibold tracking-[-0.01em] text-foreground hover:text-primary-dark"
                        >
                          {gap.name}
                        </Link>
                      ) : (
                        <div className="truncate text-[16px] font-semibold tracking-[-0.01em]">
                          {gap.name}
                        </div>
                      )}
                      <div className="text-[13px] text-foreground-secondary">
                        {gap.kind === 'property' ? 'Site' : 'Customer lead'}
                      </div>
                    </div>
                    <GatedScheduleButton gap={gap} onSchedule={setSchedulingGap} />
                  </div>
                );
              })}
            </div>
          )}
          {gaps.length > GAP_RENDER_LIMIT ? (
            <p className="mb-0 mt-3 px-1 text-[12px] text-foreground-tertiary">
              Showing the first {GAP_RENDER_LIMIT} of {formatNumber(gaps.length)}. Work through
              these and the rest will follow.
            </p>
          ) : null}
        </>
      ) : isLoading ? (
        <div style={FOLLOWUP_ROWS_STYLE}>
          <ListSkeleton
            rows={SKELETON_ROWS}
            label="Loading follow-ups"
            renderRow={() => <FollowupRowSkeleton />}
          />
        </div>
      ) : rows.length === 0 ? (
        isError ? null : (
          <ListEmpty
            title={
              narrowed
                ? 'No follow-ups match these filters.'
                : scope === 'overdue'
                  ? 'Nothing overdue.'
                  : `No follow-ups ${SCOPE_LABELS[scope].toLowerCase()}.`
            }
          />
        )
      ) : (
        <div className="flex flex-col gap-2" style={FOLLOWUP_ROWS_STYLE}>
          {rows.map((followup, index) => (
            <FollowupRow
              key={followup.id}
              followup={followup}
              index={index}
              entering={entering}
              ticked={tickedIds.has(followup.id)}
              onTick={handleTick}
              onViewDetails={handleViewDetails}
              onComplete={setCompleting}
              onReschedule={setRescheduling}
              onReassign={handleReassignOne}
              onCancel={handleCancel}
            />
          ))}
        </div>
      )}
    </CalmListPage>
  );
}
