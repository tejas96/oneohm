'use client';

import {
  Box,
  Button,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { FollowupStatus } from '@tejas96/shared/types';
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
import { FollowupReassignDialog } from './followup-reassign-dialog';
import { FollowupRescheduleDialog } from './followup-reschedule-dialog';
import { followupRecordHref } from '../lib/followup-href';

import { FilterTabs } from '@/components/shared/filters';
import { showToast } from '@/components/ui';
import { useGatedAction } from '@/lib/rbac';
import { getErrorMessage } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

const SCOPES: FollowupScope[] = ['overdue', 'today', 'upcoming', 'gaps'];

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
  const [mine, setMine] = useState(true);

  const { data: summary } = useFollowupSummary(mine);

  const { startOfToday, startOfTomorrow } = useMemo(() => dayBoundaries(), []);

  /**
   * The scope decides the date window. Overdue is everything before midnight
   * today; today is the single calendar day; upcoming is everything after.
   */
  const dateFilters = useMemo(() => {
    if (scope === 'overdue') return { to: startOfToday.toISOString() };
    if (scope === 'today') {
      return { from: startOfToday.toISOString(), to: startOfTomorrow.toISOString() };
    }
    return { from: startOfTomorrow.toISOString() };
  }, [scope, startOfToday, startOfTomorrow]);

  const { data, isLoading } = useFollowups(
    {
      status: FollowupStatus.PENDING,
      assignedToUserId: mine ? (user?.id ?? undefined) : undefined,
      ...dateFilters,
      limit: 100,
    },
    { enabled: scope !== 'gaps' },
  );

  const { data: allGaps = [], isLoading: gapsLoading } = useFollowupGaps({
    enabled: scope === 'gaps',
  });

  /**
   * Gaps respect the Mine/All toggle via their attributed user — the last
   * completed followup's assignee, else whoever created the record. Without
   * this, "Mine" would silently show everyone's unattended leads.
   */
  const gaps = useMemo(
    () => (mine ? allGaps.filter((gap) => gap.attributedUserId === user?.id) : allGaps),
    [allGaps, mine, user?.id],
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
    count:
      key === 'gaps'
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
        <ToggleButtonGroup
          size="small"
          exclusive
          value={mine ? 'mine' : 'all'}
          onChange={(_, value) => {
            if (value) setMine(value === 'mine');
          }}
        >
          <ToggleButton value="mine">Mine</ToggleButton>
          <ToggleButton value="all">All</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Box mb={2}>
        <FilterTabs
          tabs={tabs}
          value={scope}
          onChange={(value) => setScope(value)}
          variant="underline"
        />
      </Box>

      {scope === 'gaps' ? (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Open leads with no follow-up scheduled. Records created by import or direct API call
            never pass the UI gates, so whatever slipped shows up here.
          </Typography>
          {!gapsLoading && gaps.length === 0 ? (
            <Typography variant="body2">
              {mine ? 'Nothing unattended is attributed to you.' : 'Nothing is unattended.'}
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
            scope === 'overdue'
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
