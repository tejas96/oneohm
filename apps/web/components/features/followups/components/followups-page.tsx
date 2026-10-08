'use client';

import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { FollowupStatus, type FollowupType, type LeadTemperature } from '@tejas96/shared/types';
import Link from 'next/link';
import { useMemo, useState, type JSX } from 'react';

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
import { FollowupList } from './followup-list';
import {
  FOLLOWUP_FILTER_COLUMNS,
  FollowupOwnerSelect,
  type FollowupOwner,
} from './followup-owner-select';
import { FollowupReassignDialog } from './followup-reassign-dialog';
import { FollowupRescheduleDialog } from './followup-reschedule-dialog';
import { followupRecordHref } from '../lib/followup-href';

import type { FilterState } from '@/components/shared/advanced-table';
import { FilterTabs } from '@/components/shared/filters';
import { showToast } from '@/components/ui';
import { useGatedAction } from '@/lib/rbac';
import { getErrorMessage } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

const SCOPES: FollowupScope[] = ['overdue', 'today', 'upcoming', 'gaps'];

const PAGE_SIZE = 50;

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
  const [scope, setScope] = useState<FollowupScope>('today');
  const [owner, setOwner] = useState<FollowupOwner>('me');
  // Panel filters (status, type, site temperature, from/to). Empty = open work.
  const [filters, setFilters] = useState<FilterState>({});
  // Already debounced by the table, which owns the search input.
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
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

  const { data, isLoading } = useFollowups(
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

  const changeFilters = (next: FilterState): void => {
    setFilters(next);
    setPage(0);
  };

  const { data: allGaps = [], isLoading: gapsLoading } = useFollowupGaps({
    enabled: showingGaps,
  });

  /**
   * Gaps respect the owner filter via their attributed user — the last
   * completed followup's assignee, else whoever created the record. Without
   * this, "Me" would silently show everyone's unattended leads.
   */
  const gaps = useMemo(
    () => (assigneeId ? allGaps.filter((gap) => gap.attributedUserId === assigneeId) : allGaps),
    [allGaps, assigneeId],
  );

  /**
   * Rendering ~900 rows at once janks the page for no benefit — nobody works a
   * list that long in one sitting. Capped, and the cap is stated rather than
   * silently truncating.
   */
  const GAP_RENDER_LIMIT = 50;
  const visibleGaps = gaps.slice(0, GAP_RENDER_LIMIT);

  const rows = data?.data ?? [];

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

  const tabs = SCOPES.map((key) => ({
    id: key,
    label: SCOPE_LABELS[key],
    count: narrowed
      ? undefined
      : key === 'gaps'
        ? summary?.gaps
        : key === 'overdue'
          ? summary?.overdue
          : key === 'today'
            ? summary?.today
            : summary?.upcoming,
  }));

  return (
    <Box className="p-4 md:p-6">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Follow-ups
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Every open lead should owe someone an action.
          </Typography>
        </Box>

        {/* A default view, not a permission — anyone may see everyone's. */}
        <FollowupOwnerSelect
          value={owner}
          currentUserId={user?.id}
          onChange={(next) => {
            setOwner(next);
            setPage(0);
          }}
        />
      </Stack>

      <Box mb={2}>
        <FilterTabs
          tabs={tabs}
          // No tab is active while a date range or non-open status replaces its window.
          value={tabWindowActive ? scope : ('' as FollowupScope)}
          onChange={(value) => {
            setScope(value);
            // A tab is a view of open work, so it drops whatever replaced its window.
            setFilters({ ...filters, status: undefined, fromDate: undefined, toDate: undefined });
            setPage(0);
          }}
          variant="underline"
        />
      </Box>

      {showingGaps ? (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Open leads with no follow-up scheduled. Records created by import or direct API call
            never pass the UI gates, so whatever slipped shows up here.
          </Typography>
          {!gapsLoading && gaps.length === 0 ? (
            <Typography variant="body2">
              {owner === 'me'
                ? 'Nothing unattended is attributed to you.'
                : owner === 'all'
                  ? 'Nothing is unattended.'
                  : 'Nothing unattended is attributed to this person.'}
            </Typography>
          ) : (
            <Stack divider={<Box sx={{ borderBottom: 1, borderColor: 'divider' }} />}>
              {visibleGaps.map((gap) => {
                const href = followupRecordHref(gap);
                return (
                  <Stack
                    key={`${gap.kind}-${gap.propertyId ?? gap.customerId}`}
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ py: 1 }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      {href ? (
                        <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
                          <Typography variant="body2" fontWeight={600} noWrap>
                            {gap.name}
                          </Typography>
                        </Link>
                      ) : (
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {gap.name}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        {gap.kind === 'property' ? 'Site' : 'Customer lead'}
                      </Typography>
                    </Box>
                    <GatedScheduleButton gap={gap} onSchedule={setSchedulingGap} />
                  </Stack>
                );
              })}
            </Stack>
          )}
          {gaps.length > GAP_RENDER_LIMIT && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', pt: 2 }}>
              Showing the first {GAP_RENDER_LIMIT} of {gaps.length}. Work through these and the rest
              will follow.
            </Typography>
          )}
        </Paper>
      ) : (
        <FollowupList
          rows={rows}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          initialSearch={search}
          onSearchChange={(next) => {
            setSearch(next.trim());
            setPage(0);
          }}
          filterColumns={FOLLOWUP_FILTER_COLUMNS}
          filterModel={filters}
          onFilterChange={changeFilters}
          loading={isLoading}
          totalRowCount={data?.meta?.total}
          onViewDetails={(followup) => setViewingId(followup.id)}
          onComplete={setCompleting}
          onReschedule={setRescheduling}
          onReassign={setReassigning}
          onCancel={(followup) =>
            cancelMutation.mutate(followup.id, {
              onSuccess: () =>
                showToast.success('Follow-up cancelled — the lead now needs a new one'),
              onError: (error) => showToast.error(getErrorMessage(error)),
            })
          }
          emptyMessage={
            narrowed
              ? 'No follow-ups match these filters.'
              : scope === 'overdue'
                ? 'Nothing overdue.'
                : `No follow-ups ${SCOPE_LABELS[scope].toLowerCase()}.`
          }
        />
      )}

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

      <FollowupReassignDialog followups={reassigning} onClose={() => setReassigning([])} />

      {schedulingGap && (
        <FollowupDrawer
          open
          onClose={() => setSchedulingGap(null)}
          customerId={schedulingGap.customerId}
          propertyId={schedulingGap.propertyId ?? undefined}
          leadTemperature={schedulingGap.leadTemperature}
        />
      )}
    </Box>
  );
}
