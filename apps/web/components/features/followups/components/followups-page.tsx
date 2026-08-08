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
  useReassignFollowupsBulk,
  useRescheduleFollowup,
  type FollowupGap,
  type FollowupResponse,
} from '../hooks';
import { FollowupCompleteDialog } from './followup-complete-dialog';
import { FollowupDrawer } from './followup-drawer';
import { FollowupList } from './followup-list';

import { useEmployees } from '@/components/features/employees';
import { FilterTabs } from '@/components/shared/filters';
import {
  MUIDialog,
  MUIDialogBody,
  MUIDialogDescription,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
  showToast,
} from '@/components/ui';
import { MUIDatePicker } from '@/components/ui/mui-date-picker';
import { MUIUserAssigneeSelector } from '@/components/ui/mui-user-assignee-selector';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { getErrorMessage } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

const SCOPES: FollowupScope[] = ['overdue', 'today', 'upcoming', 'gaps'];

export function FollowupsPage(): JSX.Element {
  const { user } = useAuth();
  const [scope, setScope] = useState<FollowupScope>('today');
  const [mine, setMine] = useState(true);

  const { data: summary } = useFollowupSummary(mine);
  const { data: employees = [] } = useEmployees();

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
  const [completing, setCompleting] = useState<FollowupResponse | null>(null);
  const [rescheduling, setRescheduling] = useState<FollowupResponse | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date | null>(null);
  const [reassigning, setReassigning] = useState<FollowupResponse[]>([]);
  const [reassignTo, setReassignTo] = useState<string | null>(null);
  const [schedulingGap, setSchedulingGap] = useState<FollowupGap | null>(null);

  const rescheduleMutation = useRescheduleFollowup();
  const reassignMutation = useReassignFollowupsBulk();
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
              {visibleGaps.map((gap) => (
                <Stack
                  key={`${gap.kind}-${gap.propertyId ?? gap.customerId}`}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ py: 1 }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Link
                      href={
                        gap.propertyId
                          ? buildRoute(ROUTES.PROPERTIES.DETAIL, { id: gap.propertyId })
                          : buildRoute(ROUTES.CUSTOMERS.DETAIL, { id: gap.customerId })
                      }
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {gap.name}
                      </Typography>
                    </Link>
                    <Typography variant="caption" color="text.secondary">
                      {gap.kind === 'property' ? 'Site' : 'Customer lead'}
                    </Typography>
                  </Box>
                  <Button size="small" variant="outlined" onClick={() => setSchedulingGap(gap)}>
                    Schedule
                  </Button>
                </Stack>
              ))}
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
          onComplete={setCompleting}
          onReschedule={(followup) => {
            setRescheduling(followup);
            setRescheduleDate(new Date(followup.scheduledAt));
          }}
          onReassign={(followups) => {
            setReassigning(followups);
            setReassignTo(null);
          }}
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

      <FollowupCompleteDialog
        open={Boolean(completing)}
        followup={completing}
        pendingSiblings={pendingSiblings}
        onClose={() => setCompleting(null)}
      />

      <MUIDialog
        open={Boolean(rescheduling)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setRescheduling(null);
        }}
        size="sm"
      >
        <MUIDialogHeader>
          <MUIDialogTitle>Reschedule follow-up</MUIDialogTitle>
          <MUIDialogDescription>
            Moves the date without completing it — no outcome recorded.
          </MUIDialogDescription>
        </MUIDialogHeader>
        <MUIDialogBody>
          <MUIDatePicker
            fieldLabel="New date"
            required
            value={rescheduleDate}
            onChange={setRescheduleDate}
            fullWidth
          />
        </MUIDialogBody>
        <MUIDialogFooter>
          <Button variant="outlined" onClick={() => setRescheduling(null)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!rescheduleDate || rescheduleMutation.isPending}
            onClick={() => {
              if (!rescheduling || !rescheduleDate) return;
              rescheduleMutation.mutate(
                { id: rescheduling.id, scheduledAt: rescheduleDate.toISOString() },
                {
                  onSuccess: () => {
                    showToast.success('Follow-up moved');
                    setRescheduling(null);
                  },
                  onError: (error) => showToast.error(getErrorMessage(error)),
                },
              );
            }}
          >
            Move
          </Button>
        </MUIDialogFooter>
      </MUIDialog>

      <MUIDialog
        open={reassigning.length > 0}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setReassigning([]);
        }}
        size="sm"
      >
        <MUIDialogHeader>
          <MUIDialogTitle>
            {`Reassign ${reassigning.length} follow-up${reassigning.length === 1 ? '' : 's'}`}
          </MUIDialogTitle>
          <MUIDialogDescription>
            Ownership of a lead is whoever holds its next follow-up, so this moves the lead too.
          </MUIDialogDescription>
        </MUIDialogHeader>
        <MUIDialogBody>
          <MUIUserAssigneeSelector
            fieldLabel="New owner"
            required
            value={reassignTo}
            onChange={setReassignTo}
            employees={employees}
            disablePortal
          />
        </MUIDialogBody>
        <MUIDialogFooter>
          <Button variant="outlined" onClick={() => setReassigning([])}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!reassignTo || reassignMutation.isPending}
            onClick={() => {
              if (!reassignTo) return;
              reassignMutation.mutate(
                { ids: reassigning.map((f) => f.id), assignedToUserId: reassignTo },
                {
                  onSuccess: (result) => {
                    showToast.success(`Moved ${result.updated} follow-up(s)`);
                    setReassigning([]);
                  },
                  onError: (error) => showToast.error(getErrorMessage(error)),
                },
              );
            }}
          >
            Reassign
          </Button>
        </MUIDialogFooter>
      </MUIDialog>

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
