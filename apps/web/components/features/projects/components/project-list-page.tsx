'use client';

import AddIcon from '@mui/icons-material/Add';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  Box,
  Button,
  IconButton,
  Link as MuiLink,
  ListItemIcon,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from '@mui/material';
import { ProjectPriority, ProjectStatus } from '@tejas96/shared/types';
import {
  indiaToday,
  SIDE_TRACK_PHASES,
  STAGE_GROUP_KEYS,
  STAGE_GROUPS,
} from '@tejas96/shared/utils';
import NextLink from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type JSX, type MouseEvent, useCallback, useEffect, useMemo, useState } from 'react';

import {
  PROJECT_PRIORITY_LABELS,
  PROJECT_PRIORITY_OPTIONS,
  PROJECT_STATUS_LABELS,
  PROJECT_TYPE_LABELS,
  PROJECT_TYPE_OPTIONS,
} from '../constants';
import { type ProjectFilters, type ProjectListItem, useEmployees, useProjects } from '../hooks';
import { TeamAvatarGroup } from './team-avatar-group';

import { ActiveTicketsChip } from '@/components/features/service-tickets';
import {
  FilterAutocomplete,
  type ColumnConfig,
  type FilterState,
} from '@/components/shared/advanced-table';
import {
  CrmTable,
  type CrmColumn,
  type CrmQuickFilter,
  type CrmTone,
} from '@/components/shared/crm-table';
import { MUIDateRangePicker } from '@/components/ui';
import { MUIAvatar } from '@/components/ui/mui-avatar';
import { MUITypography } from '@/components/ui/mui-typography';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { type TableUrlFilterRecord, useTableUrlState } from '@/lib/hooks';
import { useAllActiveWorkflowSteps } from '@/lib/hooks/resources';
import { useGatedAction } from '@/lib/rbac';
import { color, crm } from '@/lib/theme/tokens';
import {
  formatBusinessDate,
  formatCurrency,
  formatLocalDate,
  formatSystemSize,
  getErrorMessage,
  toTitleLabel,
} from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

type ProjectRow = ProjectListItem & Record<string, unknown>;

// ============================================================================
// Module-level stable references
// ============================================================================

const EMPTY_PROJECT_ROWS: ProjectRow[] = [];

/**
 * The list is a worklist, not an archive: it opens on the projects someone can
 * actually act on. "All" is available as a chip, but only by asking for it —
 * `withDefaultStatus` makes sure an *absent* status resolves to Active, so no
 * landing or clear-path can leave the grid unscoped by accident.
 */
const DEFAULT_STATUS_FILTER = ProjectStatus.ACTIVE as string;

/** Sentinel for the "All" chip. `toProjectFilters` drops it, so no status is sent. */
const ALL_STATUSES = 'all';

const SORT_FIELD_MAP: Record<string, string> = {
  projectNumber: 'name',
  systemSizeKw: 'systemSizeKw',
  estimatedCost: 'estimatedCost',
  progressPercentage: 'progressPercentage',
  startDate: 'startDate',
  endDate: 'endDate',
  status: 'status',
  createdAt: 'createdAt',
};

const STATUS_TONE: Record<string, CrmTone> = {
  [ProjectStatus.PLANNING]: 'info',
  [ProjectStatus.ACTIVE]: 'success',
  [ProjectStatus.ON_HOLD]: 'warning',
  [ProjectStatus.COMPLETED]: 'neutral',
  [ProjectStatus.CANCELLED]: 'neutral',
};

/** Health values ride in the same `status` filter field — see `toProjectFilters`. */
const HEALTH_DELAYED = 'health:delayed';
const HEALTH_AT_RISK = 'health:at_risk';
/**
 * Projects whose bill of materials costs more than the customer is paying for
 * material — the quote plus every change order raised since. The excess is
 * margin already committed and never charged.
 *
 * Deliberately not "spend over contract", the same question asked of the
 * ledger: only a handful of projects carry any recorded expense, so that chip
 * would sit at zero on almost every project and teach people to ignore it. The
 * BOM is seeded for every converted project and moves whenever the site edits
 * it, so this asks a question the data can answer.
 */
const HEALTH_UNBILLED_OVERRUN = 'health:unbilled_overrun';
/**
 * Completed, and still owing. Neither half is a problem alone — a finished
 * project is ordinary, and a balance on a running one is just work in progress.
 * Together they are a job nobody is working on any more with money nobody is
 * chasing, and the usual way a project lands here is not a decision at all:
 * ticking the last task auto-completes it regardless of the balance.
 */
const HEALTH_COMPLETED_UNPAID = 'health:completed_unpaid';

// ============================================================================
// Adapter functions (module-level — no closures, no re-creation per render)
// ============================================================================

function toApiSortField(model: { field: string; direction: string } | null): string {
  if (!model) return 'createdAt';
  return SORT_FIELD_MAP[model.field] ?? 'createdAt';
}

function toApiSortOrder(model: { field: string; direction: string } | null): 'ASC' | 'DESC' {
  return model?.direction === 'asc' ? 'ASC' : 'DESC';
}

function toLocalDateString(raw: unknown): string | undefined {
  if (!raw || typeof raw !== 'string') return undefined;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(raw);
  return m?.[1];
}

function localDateToUtcDayRange(local: string): { fromIso: string; toIso: string } {
  const parts = local.split('-').map(Number);
  const y = parts[0] ?? 2000;
  const mo = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const from = new Date(y, mo - 1, d, 0, 0, 0, 0);
  const to = new Date(y, mo - 1, d, 23, 59, 59, 999);
  return { fromIso: from.toISOString(), toIso: to.toISOString() };
}

/**
 * Every path that writes filters runs through here, so clearing a filter — from
 * the popover, the chip row's reset, or the empty state — falls back to the
 * default status rather than silently widening the query to every project.
 */
function withDefaultStatus(filters: TableUrlFilterRecord): TableUrlFilterRecord {
  const status = filters.status;
  // `ALL_STATUSES` is an explicit choice and passes through; only an absent or
  // empty status falls back to the default.
  if (typeof status === 'string' && status !== '') return filters;
  return { ...filters, status: DEFAULT_STATUS_FILTER };
}

/** The phases the dashboard drills into: every main-line phase, no side tracks. One list for the Phase filter's options and the URL allowlist. */
const MAIN_LINE_PHASES: readonly string[] = STAGE_GROUPS.flatMap((g) => g.phases).filter(
  (p) => !SIDE_TRACK_PHASES.includes(p),
);

/** A real calendar day as `YYYY-MM-DD` — `2026-02-31` has the shape but is not one. */
function isRealDay(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y = 0, m = 0, d = 0] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function toProjectFilters(filters: TableUrlFilterRecord): Partial<ProjectFilters> {
  const raw = filters as Record<string, unknown>;
  const result: Partial<ProjectFilters> = {};

  const status = raw.status;
  if (status && typeof status === 'string' && status !== 'all') {
    // Composite health status values from the quick-filter chips (e.g. 'health:delayed')
    if (status.startsWith('health:')) {
      const healthValue = status.slice('health:'.length);
      /*
       * Overdue and At risk are only meaningful on a running project — a
       * finished one cannot be late — so those pin the status to active.
       *
       * Unbilled extras must not. A COMPLETED project carrying material that
       * was never charged is the worst version of that problem, because there
       * is no longer any work left during which to raise the change order.
       * Pinning to active would hide precisely the rows worth finding.
       */
      // 'completed_unpaid' sets its own status on the server, and pinning
      // active here would make it match nothing at all.
      if (healthValue !== 'unbilled_overrun' && healthValue !== 'completed_unpaid') {
        result.status = ProjectStatus.ACTIVE;
      }
      result.healthStatus = healthValue;
    } else {
      result.status = status as ProjectStatus;
    }
  }

  const priority = raw.priority;
  if (priority && typeof priority === 'string' && priority !== 'all') {
    result.priority = priority as ProjectPriority;
  }

  const projectType = raw.projectType;
  if (projectType && typeof projectType === 'string' && projectType !== 'all') {
    result.projectType = projectType;
  }

  const sizeRange = raw.systemSizeKw as { min?: string; max?: string } | undefined;
  if (
    sizeRange?.min !== undefined &&
    sizeRange.min !== '' &&
    !Number.isNaN(Number(sizeRange.min))
  ) {
    result.systemSizeMin = Number(sizeRange.min);
  }
  if (
    sizeRange?.max !== undefined &&
    sizeRange.max !== '' &&
    !Number.isNaN(Number(sizeRange.max))
  ) {
    result.systemSizeMax = Number(sizeRange.max);
  }

  // team filter -> backend memberId
  const memberId = raw.team;
  if (memberId && typeof memberId === 'string' && memberId !== 'all') {
    result.memberId = memberId;
  }

  // pending task filter -> backend pendingWorkflowStepId
  const pendingWorkflowStepId = raw.pendingWorkflowStepId;
  if (
    pendingWorkflowStepId &&
    typeof pendingWorkflowStepId === 'string' &&
    pendingWorkflowStepId !== 'all'
  ) {
    result.pendingWorkflowStepId = pendingWorkflowStepId;
  }

  const startDateRaw = toLocalDateString(raw.startDate);
  if (startDateRaw) {
    const { fromIso, toIso } = localDateToUtcDayRange(startDateRaw);
    result.startDateFrom = fromIso;
    result.startDateTo = toIso;
  }

  const endDateRaw = toLocalDateString(raw.endDate);
  if (endDateRaw) {
    const { fromIso, toIso } = localDateToUtcDayRange(endDateRaw);
    result.endDateFrom = fromIso;
    result.endDateTo = toIso;
  }

  const address = raw.address;
  if (address && typeof address === 'string') {
    result.address = address;
  }

  // Only the two explicit strings are meaningful; anything else means "don't filter".
  const hasActiveTickets = raw.hasActiveTickets;
  if (hasActiveTickets === 'true') result.hasActiveTickets = true;
  else if (hasActiveTickets === 'false') result.hasActiveTickets = false;

  const createdBy = raw.createdBy;
  if (createdBy && typeof createdBy === 'string' && createdBy !== 'all') {
    result.createdBy = createdBy;
  }

  // Dashboard drill-downs. Unknown values are dropped, like every filter above.
  const pick = <T extends string>(value: unknown, allowed: readonly T[]): T | undefined =>
    typeof value === 'string' && (allowed as readonly string[]).includes(value)
      ? (value as T)
      : undefined;
  result.financing = pick(raw.financing, ['cash', 'loan'] as const);
  result.progress = pick(raw.progress, ['live', 'not_started', 'in_progress'] as const);
  result.stage = pick(raw.stage, [...STAGE_GROUP_KEYS, 'none'] as const);
  result.phase = pick(raw.phase, MAIN_LINE_PHASES);
  result.attention = pick(raw.attention, ['late_steps', 'old_steps', 'unstaged_steps'] as const);

  const day = (value: unknown): string | undefined => (isRealDay(value) ? value : undefined);
  const range = (value: unknown): { from?: string; to?: string } => {
    const r = (value ?? {}) as { from?: unknown; to?: unknown };
    return { from: day(r.from), to: day(r.to) };
  };
  const onboarded = range(raw.onboarded);
  result.onboardedFrom = onboarded.from;
  result.onboardedTo = onboarded.to;
  const meterInstalled = range(raw.meterInstalled);
  result.meterInstalledFrom = meterInstalled.from;
  result.meterInstalledTo = meterInstalled.to;
  const meterDue = range(raw.meterDue);
  result.meterDueFrom = meterDue.from;
  result.meterDueTo = meterDue.to;

  return result;
}

// ============================================================================
// Sub-components (module-level — must not be defined inside the page component)
// ============================================================================

function ProjectRowActionsMenu({ project }: { project: ProjectListItem }): JSX.Element {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  return (
    <>
      <IconButton
        size="small"
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-label="Project actions"
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          component={NextLink}
          href={buildRoute(ROUTES.PROJECTS.DETAIL, { id: project.id })}
          onClick={() => setAnchor(null)}
        >
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          View Details
        </MenuItem>
      </Menu>
    </>
  );
}

// ============================================================================
// Row building blocks
// ============================================================================

/**
 * Every cell is two lines on one rhythm — a 20px fact over a 16px note — so
 * the eye can run along a row, or down a column, without re-finding the
 * baseline in each cell.
 */
const LINE_1_BASE = 'block truncate text-base leading-5';
const LINE_2_BASE = 'block truncate text-xs leading-4';
const LINE_1 = `${LINE_1_BASE} text-foreground`;
const LINE_2 = `${LINE_2_BASE} text-foreground-tertiary`;
/** Line one with nothing to report: a dash or "Not planned", never as dark as a real value. */
const LINE_1_EMPTY = `${LINE_1_BASE} text-foreground-muted`;
/** Holds the second line open when a cell has nothing to say there, so line one never drops to the middle. */
const EMPTY_LINE_2 = (
  <span className={LINE_2} aria-hidden="true">
    &nbsp;
  </span>
);

/** The grid has no column gap, so each cell keeps its own right gutter. */
const CELL_GUTTER = { pr: 2, minWidth: 0 } as const;

const PILL_PALETTE: Record<CrmTone, { ink: string; bg: string }> = {
  neutral: { ink: color.neutral, bg: color['neutral-bg'] },
  accent: { ink: color['accent-ink'], bg: color['accent-subtle'] },
  success: { ink: color.success, bg: color['success-bg'] },
  info: { ink: color.info, bg: color['info-bg'] },
  warning: { ink: color.warning, bg: color['warning-bg'] },
  danger: { ink: color.danger, bg: color['danger-bg'] },
};

/** Only a priority that asks for something gets a colour; the usual ones stay grey. */
const PRIORITY_TONE: Record<string, CrmTone> = {
  [ProjectPriority.LOW]: 'neutral',
  [ProjectPriority.NORMAL]: 'neutral',
  [ProjectPriority.HIGH]: 'warning',
  [ProjectPriority.URGENT]: 'danger',
};

/** Status and priority beside the name: present on every row, never louder than it. */
function QuietPill({ label, tone }: { label: string; tone: CrmTone }): JSX.Element {
  const palette = PILL_PALETTE[tone];
  return (
    <span
      className="inline-flex h-[18px] shrink-0 items-center rounded-pill px-1.5 text-2xs font-medium leading-none whitespace-nowrap"
      style={{ color: palette.ink, backgroundColor: palette.bg }}
    >
      {label}
    </span>
  );
}

const RING_SIZE = 36;
const RING_STROKE = 3;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/** Progress as a ring: the same fact the old bar carried, in a third of the width. */
function ProgressRing({ percent }: { percent: number }): JSX.Element {
  // Starts empty and fills on the first frame, so the arc draws itself once.
  const [drawn, setDrawn] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setDrawn(percent));
    return () => cancelAnimationFrame(frame);
  }, [percent]);

  const centre = RING_SIZE / 2;
  return (
    <svg
      role="img"
      aria-label={`${percent}% complete`}
      width={RING_SIZE}
      height={RING_SIZE}
      viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
      className="shrink-0"
    >
      <circle
        cx={centre}
        cy={centre}
        r={RING_RADIUS}
        fill="none"
        stroke="var(--ds-neutral-300)"
        strokeWidth={RING_STROKE}
      />
      <circle
        cx={centre}
        cy={centre}
        r={RING_RADIUS}
        fill="none"
        stroke="var(--ds-primary)"
        strokeWidth={RING_STROKE}
        strokeLinecap="round"
        strokeDasharray={RING_LENGTH}
        strokeDashoffset={RING_LENGTH * (1 - drawn / 100)}
        transform={`rotate(-90 ${centre} ${centre})`}
        className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
      />
      <text
        x={centre}
        y={centre}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-foreground-secondary font-semibold tabular-nums"
        fontSize={10}
      >
        {percent}
        <tspan fontSize={7}>%</tspan>
      </text>
    </svg>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `2026-09-14` → "14 Sep"; the year is added only when it is not this one. */
function shortDay(day: string | undefined, today: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(day ?? '');
  if (!match) return '-';
  const [, year = '', month = '', date = ''] = match;
  const label = `${Number(date)} ${MONTHS[Number(month) - 1] ?? ''}`;
  return year === today.slice(0, 4) ? label : `${label} ’${year.slice(2)}`;
}

/** Whole calendar days from one `YYYY-MM-DD` to another. */
function daysBetween(from: string, to: string): number {
  const utc = (day: string): number => {
    const [y = 0, m = 1, d = 1] = day.slice(0, 10).split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((utc(to) - utc(from)) / 86_400_000);
}

const plural = (count: number, noun: string): string => `${count} ${noun}${count === 1 ? '' : 's'}`;

// ============================================================================
// Columns
// ============================================================================

/**
 * Seven columns, each answering one question about the project: whose it is,
 * how far along, how big, what it is worth, when, and who is on it. Sizing is a
 * `crm['col-project-*']` track so the column-visibility menu can rebuild the
 * grid template from exactly the tracks that survive.
 */
const CRM_COLUMNS: CrmColumn<ProjectRow>[] = [
  {
    // Still `projectNumber`: the sort key (project name) and any bookmarked sort
    // in the URL hang off this field.
    field: 'projectNumber',
    header: 'Customer',
    track: crm['col-project-customer'],
    sortable: true,
    hideable: false,
    cellSx: { ...CELL_GUTTER, pl: 1 },
    renderCell: (row): JSX.Element => {
      const project = row as ProjectListItem;
      const name = project.property.customerName || project.name;
      const place = project.property.city || project.property.address;
      const address = [project.property.address, project.property.city].filter(Boolean).join(', ');
      const tickets = project.activeTicketCount;
      const ticketLabel = `${tickets} active ${tickets === 1 ? 'ticket' : 'tickets'}`;
      const status = project.status;
      const priority = project.priority;

      return (
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <MUIAvatar name={name} size="md" sx={{ flexShrink: 0 }} />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className={`${LINE_1} font-medium`} title={name}>
                {name}
              </span>
              <QuietPill
                label={PROJECT_STATUS_LABELS[status] ?? toTitleLabel(status)}
                tone={STATUS_TONE[status] ?? 'neutral'}
              />
              <QuietPill
                label={PROJECT_PRIORITY_LABELS[priority] ?? toTitleLabel(priority)}
                tone={PRIORITY_TONE[priority] ?? 'neutral'}
              />
              {tickets > 0 ? (
                <span
                  role="img"
                  aria-label={ticketLabel}
                  title={ticketLabel}
                  className="inline-flex shrink-0"
                  style={{ color: color.warning }}
                >
                  <BuildOutlinedIcon sx={{ fontSize: 14 }} />
                </span>
              ) : null}
            </div>
            <span
              className={LINE_2}
              title={[project.projectNumber, address].filter(Boolean).join(' · ')}
            >
              <span className="tabular-nums">{project.projectNumber}</span>
              {place ? ` · ${place}` : ''}
            </span>
          </div>
        </div>
      );
    },
  },
  {
    field: 'progressPercentage',
    header: 'Progress',
    track: crm['col-project-progress'],
    sortable: true,
    cellSx: CELL_GUTTER,
    renderCell: (row): JSX.Element => {
      const project = row as ProjectListItem;
      const percent = Math.round(Math.min(100, Math.max(0, project.progressPercentage)));
      const completed = project.completedTasks ?? 0;
      const total = project.totalTasks ?? 0;
      // Every step done: the Phase filter only matches live projects, so the cell
      // must not name a phase it cannot be filtered by. A cancelled project was
      // stopped, not finished, so it keeps its phase.
      const allDone =
        project.status !== ProjectStatus.CANCELLED && total > 0 && completed === total;
      const phase = allDone ? 'All phases done' : project.currentPhase;

      return (
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <ProgressRing percent={percent} />
          <div className="min-w-0 flex-1">
            <span className={phase ? LINE_1 : LINE_1_EMPTY} title={phase ?? undefined}>
              {phase ?? '-'}
            </span>
            <span className={`${LINE_2} tabular-nums`}>
              {total > 0 ? `${completed} of ${plural(total, 'step')}` : 'No steps yet'}
            </span>
          </div>
        </div>
      );
    },
  },
  {
    field: 'systemSizeKw',
    header: 'System',
    track: crm['col-project-size'],
    sortable: true,
    cellSx: CELL_GUTTER,
    renderCell: (row): JSX.Element => {
      const { systemSizeKw, projectType } = row as ProjectListItem;
      const type = PROJECT_TYPE_LABELS[projectType] ?? toTitleLabel(projectType);
      return (
        <div className="min-w-0 flex-1">
          <span className={`${LINE_1} tabular-nums`}>{formatSystemSize(systemSizeKw)} kW</span>
          <span className={LINE_2} title={type}>
            {type}
          </span>
        </div>
      );
    },
  },
  {
    field: 'estimatedCost',
    header: 'Contract',
    track: crm['col-project-contract'],
    sortable: true,
    align: 'right',
    stopPropagation: true,
    cellSx: { ...CELL_GUTTER, pr: 3 },
    /**
     * One number, one word, one source — for worth *and* for collection.
     *
     * This column read `estimatedCost` (`cv.finalPrice` — the quote) under the
     * heading "Value", while the project's Money tab read `v_project_balance`
     * under "Contract". A project with change orders therefore showed
     * ₹2,58,568 here and ₹2,98,568.04 there, both correct, with nothing on
     * either screen explaining the gap. It now reads the same ledger view the
     * Money tab does, and says so with the same word.
     *
     * Collection comes from `outstanding` only (against the *contract*), never
     * from `totalExpected - totalPaid` (against the payment *schedule*): those
     * agree only when the schedule covers the whole contract. The schedule
     * figures and the quote-to-contract gap live in the tooltip — the cell
     * itself carries each figure once.
     */
    renderCell: (row): JSX.Element => {
      const project = row as ProjectListItem;
      const {
        contractValue: contract,
        outstanding,
        totalPaid,
        totalExpected,
      } = project.paymentSummary;
      const quoted = project.estimatedCost ?? null;

      if (!contract) {
        return (
          <div className="min-w-0 text-right">
            <span className={LINE_1_EMPTY}>-</span>
            {EMPTY_LINE_2}
          </div>
        );
      }

      // Only worth mentioning when the contract has actually moved off the quote.
      const changeOrders = quoted != null ? contract - quoted : 0;
      const hasChangeOrders = Math.abs(changeOrders) >= 0.01;
      const projectHref = buildRoute(ROUTES.PROJECTS.DETAIL, { id: project.id });
      // "Paid in full" only when money actually came in and none is left owing —
      // a zero balance with nothing collected is not a paid project.
      const paidInFull = outstanding <= 0 && totalPaid > 0;

      return (
        <Tooltip
          title={
            <span style={{ whiteSpace: 'pre-line' }}>
              {[
                `Paid ${formatCurrency(totalPaid)} of ${formatCurrency(totalExpected)} invoiced`,
                hasChangeOrders
                  ? `Quote ${formatCurrency(quoted ?? 0)} ${changeOrders > 0 ? '+' : '−'} ${formatCurrency(Math.abs(changeOrders))} change orders`
                  : null,
              ]
                .filter(Boolean)
                .join('\n')}
            </span>
          }
          placement="top"
          enterDelay={400}
        >
          <div className="min-w-0 text-right">
            <MuiLink
              component={NextLink}
              href={`${projectHref}?tab=finance`}
              underline="hover"
              color="inherit"
              onClick={(e: MouseEvent) => e.stopPropagation()}
              className={`${LINE_1} font-medium tabular-nums`}
            >
              {formatCurrency(contract)}
            </MuiLink>
            {outstanding > 0 ? (
              <span className={`${LINE_2_BASE} tabular-nums`} style={{ color: color.warning }}>
                {formatCurrency(outstanding)} due
              </span>
            ) : paidInFull ? (
              <span className={LINE_2_BASE} style={{ color: color.success }}>
                paid in full
              </span>
            ) : (
              EMPTY_LINE_2
            )}
          </div>
        </Tooltip>
      );
    },
  },
  {
    // One column for both dates; the header sorts by the due date, the one people
    // chase. `startDate` stays in `SORT_FIELD_MAP` for links that already carry it.
    field: 'endDate',
    header: 'Dates',
    track: crm['col-project-dates'],
    sortable: true,
    cellSx: CELL_GUTTER,
    renderCell: (row): JSX.Element => {
      const { startDate, endDate, status } = row as ProjectListItem;
      if (!startDate && !endDate) {
        return (
          <div className="min-w-0 flex-1">
            <span className={LINE_1_EMPTY}>Not planned</span>
            {EMPTY_LINE_2}
          </div>
        );
      }
      const today = indiaToday();
      const range = `${shortDay(startDate, today)} → ${shortDay(endDate, today)}`;
      const open = status !== ProjectStatus.COMPLETED && status !== ProjectStatus.CANCELLED;
      const daysLeft = endDate && open ? daysBetween(today, endDate) : null;

      return (
        <div className="min-w-0 flex-1">
          <span className={`${LINE_1} tabular-nums`} title={range}>
            {range}
          </span>
          {daysLeft == null ? (
            EMPTY_LINE_2
          ) : daysLeft < 0 ? (
            <span className={`${LINE_2_BASE} tabular-nums text-error`}>
              due {plural(-daysLeft, 'day')} ago
            </span>
          ) : (
            <span className={`${LINE_2} tabular-nums`}>
              {daysLeft === 0 ? 'due today' : `${plural(daysLeft, 'day')} left`}
            </span>
          )}
        </div>
      );
    },
  },
  {
    field: 'team',
    header: 'Team',
    track: crm['col-project-team'],
    stopPropagation: true,
    renderCell: (row): JSX.Element => (
      <TeamAvatarGroup members={(row as ProjectListItem).teamMembers} max={3} size="xs" />
    ),
  },
  {
    field: 'createdBy',
    header: 'Created By',
    track: crm['col-project-creator'],
    defaultHidden: true,
    renderCell: (row): JSX.Element => {
      const name = (row as ProjectListItem).creatorName;
      return <MUITypography variant="body">{name || '-'}</MUITypography>;
    },
  },
  {
    field: 'pendingWorkflowStepId',
    header: 'Pending Task',
    track: crm['col-project-pending-task'],
    defaultHidden: true,
    renderCell: (): JSX.Element => <></>,
  },
  {
    field: 'hasActiveTickets',
    header: 'Service Tickets',
    track: crm['col-project-tickets'],
    defaultHidden: true,
    renderCell: (row): JSX.Element => (
      <ActiveTicketsChip count={(row as ProjectListItem).activeTicketCount} />
    ),
  },
  {
    field: 'address',
    header: 'Property Address',
    track: crm['col-project-address'],
    defaultHidden: true,
    renderCell: (row): JSX.Element => {
      const project = row as ProjectListItem;
      const addr = [
        project.property.address,
        project.property.city,
        project.property.state,
        project.property.pincode,
      ]
        .filter(Boolean)
        .join(', ');
      return (
        <MUITypography
          variant="body"
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            whiteSpace: 'normal',
            wordBreak: 'break-word',
            lineHeight: 1.4,
          }}
        >
          {addr || '-'}
        </MUITypography>
      );
    },
  },
  {
    field: 'actions',
    header: '',
    track: crm['col-project-actions'],
    align: 'right',
    hideable: false,
    stopPropagation: true,
    renderCell: (row): JSX.Element => <ProjectRowActionsMenu project={row as ProjectListItem} />,
  },
];

/** Chip text for a { from, to } day range: "1 Sep 2026 – 30 Sep 2026", "From …" or "Until …". */
function formatDayRange(value: unknown): string {
  const { from, to } = (value ?? {}) as { from?: string; to?: string };
  if (from && to) return `${formatBusinessDate(from)} – ${formatBusinessDate(to)}`;
  if (from) return `From ${formatBusinessDate(from)}`;
  if (to) return `Until ${formatBusinessDate(to)}`;
  return '';
}

/** Health views in the status chip row, by their `status` filter value. */
const HEALTH_LABELS = {
  [HEALTH_DELAYED]: 'Overdue',
  [HEALTH_AT_RISK]: 'At risk',
  [HEALTH_UNBILLED_OVERRUN]: 'Unbilled extras',
  [HEALTH_COMPLETED_UNPAID]: 'Completed, unpaid',
} as const;

/** The label the status quick-filter chips use for a `status` filter value. */
function statusFilterLabel(value: unknown): string {
  const key = String(value);
  if (key === ALL_STATUSES) return 'All';
  return (
    (HEALTH_LABELS as Record<string, string | undefined>)[key] ??
    PROJECT_STATUS_LABELS[key as ProjectStatus] ??
    toTitleLabel(key)
  );
}

const FILTER_COLUMNS: ColumnConfig<ProjectRow>[] = [
  // Not in the filter panel (the chip row above the table sets it); this column only
  // gives the active-filter chip a readable label.
  {
    field: 'status',
    headerName: 'Status',
    filterable: false,
    formatFilterValue: statusFilterLabel,
  },
  {
    field: 'priority',
    headerName: 'Priority',
    filterable: true,
    filterType: 'select',
    filterOptions: PROJECT_PRIORITY_OPTIONS,
  },
  {
    field: 'projectType',
    headerName: 'Type',
    filterable: true,
    filterType: 'select',
    filterOptions: PROJECT_TYPE_OPTIONS,
  },
  { field: 'startDate', headerName: 'Start date', filterable: true, filterType: 'date' },
  { field: 'endDate', headerName: 'Due date', filterable: true, filterType: 'date' },
  { field: 'systemSizeKw', headerName: 'System size', filterable: true, filterType: 'range' },
  { field: 'team', headerName: 'Team member', filterable: true, filterType: 'select' },
  { field: 'createdBy', headerName: 'Created by', filterable: true, filterType: 'select' },
  { field: 'pendingWorkflowStepId', headerName: 'Pending task', filterable: true },
  {
    field: 'hasActiveTickets',
    headerName: 'Service tickets',
    filterable: true,
    filterType: 'select',
    filterOptions: [
      { label: 'Has active tickets', value: 'true' },
      { label: 'No active tickets', value: 'false' },
    ],
  },
  {
    field: 'address',
    headerName: 'Property address',
    filterable: true,
    filterType: 'text',
    filterPlaceholder: 'Pincode / city / address',
    filterDebounceMs: 800,
  },
  {
    field: 'financing',
    headerName: 'Cash / loan',
    filterable: true,
    filterType: 'select',
    filterOptions: [
      { label: 'Cash', value: 'cash' },
      { label: 'Loan', value: 'loan' },
    ],
  },
  {
    field: 'progress',
    headerName: 'Progress',
    filterable: true,
    filterType: 'select',
    filterOptions: [
      { label: 'Live (open work)', value: 'live' },
      { label: 'Not started', value: 'not_started' },
      { label: 'In progress', value: 'in_progress' },
    ],
  },
  {
    field: 'stage',
    headerName: 'Stage',
    filterable: true,
    filterType: 'select',
    filterOptions: [
      ...STAGE_GROUPS.map((g) => ({ label: g.label, value: g.key })),
      { label: 'No stage yet', value: 'none' },
    ],
  },
  {
    field: 'phase',
    headerName: 'Phase',
    filterable: true,
    filterType: 'select',
    filterOptions: MAIN_LINE_PHASES.map((p) => ({ label: p, value: p })),
  },
  {
    field: 'attention',
    headerName: 'Needs attention',
    filterable: true,
    filterType: 'select',
    filterOptions: [
      { label: 'Late steps', value: 'late_steps' },
      { label: 'Old steps left open', value: 'old_steps' },
      { label: 'Steps without a stage', value: 'unstaged_steps' },
    ],
  },
  {
    field: 'onboarded',
    headerName: 'Onboarded between',
    filterable: true,
    formatFilterValue: formatDayRange,
  },
  {
    field: 'meterInstalled',
    headerName: 'Meter installed between',
    filterable: true,
    formatFilterValue: formatDayRange,
  },
  {
    field: 'meterDue',
    headerName: 'Meter due between',
    filterable: true,
    formatFilterValue: formatDayRange,
  },
];

const DAY_RANGE_KEYS: readonly string[] = ['onboarded', 'meterInstalled', 'meterDue'];

/** Status chip values the page understands: All, each status, each health view. */
const KNOWN_STATUS_VALUES: readonly string[] = [
  ALL_STATUSES,
  ...Object.values(ProjectStatus),
  HEALTH_DELAYED,
  HEALTH_AT_RISK,
  HEALTH_UNBILLED_OVERRUN,
  HEALTH_COMPLETED_UNPAID,
];

/**
 * The URL record with every value the list would ignore taken out, so a chip
 * never claims a filter that is not applied (`projects_filters={"phase":"Bogus"}`
 * must not show "Phase: Bogus"). Select filters keep only values that are one of
 * their options, day ranges keep only real days, and `status` only a chip the
 * page has. Returns the same object when nothing was dropped.
 */
function sanitizeUrlFilters(filters: TableUrlFilterRecord): TableUrlFilterRecord {
  const result: TableUrlFilterRecord = {};
  let changed = false;
  for (const [key, value] of Object.entries(filters)) {
    if (key === 'status') {
      if (typeof value === 'string' && KNOWN_STATUS_VALUES.includes(value)) result[key] = value;
      else changed = true;
      continue;
    }
    if (DAY_RANGE_KEYS.includes(key)) {
      const { from, to } = (typeof value === 'object' && value !== null ? value : {}) as {
        from?: unknown;
        to?: unknown;
      };
      const kept: { from?: string; to?: string } = {};
      if (isRealDay(from)) kept.from = from;
      if (isRealDay(to)) kept.to = to;
      if (kept.from !== undefined || kept.to !== undefined) result[key] = kept;
      // Anything but exactly the kept shape (a string, unknown keys, a bad end)
      // is junk the list ignores, so the URL is rewritten without it.
      if (JSON.stringify(kept) !== JSON.stringify(value)) changed = true;
      continue;
    }
    const column = FILTER_COLUMNS.find((c) => c.field === key);
    if (column?.filterType === 'select' && column.filterOptions) {
      if (
        typeof value === 'string' &&
        column.filterOptions.some((o) => String(o.value) === value)
      ) {
        result[key] = value;
      } else {
        changed = true;
      }
      continue;
    }
    result[key] = value;
  }
  return changed ? result : filters;
}

function DateRangeFilter({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
}): JSX.Element {
  const range = (value ?? {}) as { from?: string; to?: string };
  return (
    <MUIDateRangePicker
      fromDate={range.from ?? null}
      toDate={range.to ?? null}
      onFromChange={(d) => onChange({ ...range, from: formatLocalDate(d) || undefined })}
      onToChange={(d) => onChange({ ...range, to: formatLocalDate(d) || undefined })}
    />
  );
}

// ============================================================================
// Page component
// ============================================================================

export function ProjectListPage(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();

  // The action really navigates rather than being a no-op. The header button
  // renders as a NextLink when allowed and so never invokes it, but the
  // empty-state button below calls `onGatedClick` unconditionally — with a
  // no-op action that button would look enabled and do nothing.
  const newProject = useGatedAction(
    'projects.create',
    () => void router.push(ROUTES.PROJECTS.NEW),
    'New project',
  );

  const statusParam = searchParams.get('status');
  const healthStatusParam = searchParams.get('healthStatus');

  /**
   * Bridge bare sidebar links (`?status=active`, `?healthStatus=delayed`) into
   * table filter state, falling back to the default status so the grid never
   * opens unscoped.
   */
  const initialFilters = useMemo<TableUrlFilterRecord>(() => {
    if (healthStatusParam) return { status: `health:${healthStatusParam}` };
    if (statusParam) return { status: statusParam };
    return { status: DEFAULT_STATUS_FILTER };
  }, [healthStatusParam, statusParam]);

  const urlState = useTableUrlState({
    prefix: 'projects',
    defaultPageSize: 10,
    initialFilters,
  });

  // A link can carry filter values the list ignores, or no usable status; show
  // and send only what it applies (an absent or dropped status becomes the page
  // default, so the highlighted chip is the status that is sent), and rewrite the
  // URL to match (replace, no new history entry — `setFilters` uses
  // `replaceState`). Once rewritten the record is stable, so this runs once.
  const { setFilters: replaceUrlFilters } = urlState;
  const filters = useMemo(
    () => withDefaultStatus(sanitizeUrlFilters(urlState.state.filters)),
    [urlState.state.filters],
  );
  useEffect(() => {
    if (filters !== urlState.state.filters) replaceUrlFilters(filters);
  }, [filters, replaceUrlFilters, urlState.state.filters]);

  const activeStatusFilter =
    typeof filters.status === 'string' && filters.status ? filters.status : DEFAULT_STATUS_FILTER;

  // Fetch employees for the team / creator filters
  const { data: employeesData } = useEmployees({ limit: 100 });
  const employeeOptions = useMemo(() => {
    return (
      employeesData?.items.map((emp) => ({
        label:
          `${emp.user?.firstName ?? ''} ${emp.user?.lastName ?? ''}`.trim() ||
          emp.email ||
          'Unknown',
        value: emp.userId,
      })) ?? []
    );
  }, [employeesData?.items]);

  const creatorOptions = useMemo(
    () => [{ label: 'Current user (me)', value: 'me' }, ...employeeOptions],
    [employeeOptions],
  );

  const { items: workflowSteps } = useAllActiveWorkflowSteps();
  const workflowStepOptions = useMemo(() => {
    return workflowSteps?.map((step) => ({ label: step.name, value: step.id })) ?? [];
  }, [workflowSteps]);

  // API call — driven entirely by URL state
  const { data, isLoading, isFetching, isError, error, refetch } = useProjects({
    page: urlState.state.page + 1,
    limit: urlState.state.pageSize,
    search: urlState.state.search || undefined,
    sortBy: toApiSortField(urlState.state.sortModel),
    sortOrder: toApiSortOrder(urlState.state.sortModel),
    ...toProjectFilters(filters),
  });

  const tableRows = useMemo<ProjectRow[]>(
    () => (data?.data as ProjectRow[] | undefined) ?? EMPTY_PROJECT_ROWS,
    [data?.data],
  );

  const getRowId = useCallback((row: ProjectRow) => row.id, []);

  /**
   * Status and health share one chip row because they share one filter field:
   * `health:delayed` already means "active and delayed", so selecting a health
   * view and selecting a status are mutually exclusive by construction.
   *
   * No counts — there is no per-status roll-up endpoint for projects, and a
   * plausible-looking wrong number is worse than none.
   */
  const quickFilters = useMemo<CrmQuickFilter[]>(
    () => [
      { key: ALL_STATUSES, label: 'All', tone: 'neutral' as CrmTone, dot: false },
      ...Object.values(ProjectStatus).map((status) => ({
        key: status as string,
        label: PROJECT_STATUS_LABELS[status] ?? toTitleLabel(status),
        tone: STATUS_TONE[status] ?? 'neutral',
        dot: true,
      })),
      {
        key: HEALTH_DELAYED,
        label: HEALTH_LABELS[HEALTH_DELAYED],
        tone: 'danger' as CrmTone,
        dot: true,
      },
      {
        key: HEALTH_AT_RISK,
        label: HEALTH_LABELS[HEALTH_AT_RISK],
        tone: 'warning' as CrmTone,
        dot: true,
      },
      {
        key: HEALTH_UNBILLED_OVERRUN,
        label: HEALTH_LABELS[HEALTH_UNBILLED_OVERRUN],
        tone: 'danger' as CrmTone,
        dot: true,
      },
      {
        key: HEALTH_COMPLETED_UNPAID,
        label: HEALTH_LABELS[HEALTH_COMPLETED_UNPAID],
        tone: 'danger' as CrmTone,
        dot: true,
      },
    ],
    [],
  );

  const handleQuickFilterChange = useCallback(
    (key: string) => {
      urlState.setFilters(withDefaultStatus({ ...filters, status: key || DEFAULT_STATUS_FILTER }));
    },
    [urlState, filters],
  );

  const handleFilterChange = useCallback(
    (filters: FilterState) => {
      urlState.setFilters(withDefaultStatus(filters as TableUrlFilterRecord));
    },
    [urlState],
  );

  const handleResetFilters = useCallback(() => {
    urlState.resetAll();
    urlState.setFilters({ status: DEFAULT_STATUS_FILTER });
  }, [urlState]);

  const filterColumns = useMemo<ColumnConfig<ProjectRow>[]>(() => {
    return FILTER_COLUMNS.map((col) => {
      if (col.field === 'team') {
        return {
          ...col,
          renderFilter: ({ value, onChange }) => (
            <FilterAutocomplete
              options={employeeOptions}
              value={value}
              onChange={onChange}
              placeholder="Search member…"
            />
          ),
        };
      }
      if (col.field === 'createdBy') {
        return {
          ...col,
          filterOptions: creatorOptions,
          renderFilter: ({ value, onChange }) => (
            <FilterAutocomplete
              options={creatorOptions}
              value={value}
              onChange={onChange}
              placeholder="Search creator…"
            />
          ),
        };
      }
      if (col.field === 'pendingWorkflowStepId') {
        return {
          ...col,
          renderFilter: ({ value, onChange }) => (
            <FilterAutocomplete
              options={workflowStepOptions}
              value={value}
              onChange={onChange}
              placeholder="Search workflow step…"
            />
          ),
        };
      }
      if (col.field === 'onboarded' || col.field === 'meterInstalled' || col.field === 'meterDue') {
        return {
          ...col,
          renderFilter: ({ value, onChange }) => (
            <DateRangeFilter value={value} onChange={onChange} />
          ),
        };
      }
      return col;
    });
  }, [creatorOptions, employeeOptions, workflowStepOptions]);

  const renderEmptyState = useCallback(
    (hasFilters: boolean): JSX.Element => (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Box
          aria-hidden="true"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            mb: 1.5,
            borderRadius: '50%',
            color: color['text-tertiary'],
            bgcolor: color['canvas-sunken'],
          }}
        >
          <InboxOutlinedIcon sx={{ fontSize: 24 }} />
        </Box>
        <Typography sx={{ fontSize: '13px', color: color['text-secondary'] }}>
          {hasFilters
            ? 'No projects match these filters.'
            : activeStatusFilter === ALL_STATUSES
              ? 'No projects yet.'
              : `No ${toTitleLabel(activeStatusFilter).toLowerCase()} projects right now.`}
        </Typography>
        {hasFilters ? (
          <Button size="small" sx={{ mt: 1.5 }} onClick={handleResetFilters}>
            Clear filters
          </Button>
        ) : (
          <Button
            size="small"
            variant="contained"
            // The same gate the header button uses. This empty-state copy used
            // to push the route directly, so the page had one guarded entry and
            // one unguarded one for the identical action.
            sx={{ mt: 1.5, opacity: newProject.allowed ? 1 : 0.5 }}
            onClick={newProject.onGatedClick}
            aria-disabled={!newProject.allowed}
          >
            New project
          </Button>
        )}
      </Box>
    ),
    [activeStatusFilter, handleResetFilters, router],
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* ── Page header ── */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          px: 2.5,
          py: 2,
          borderRadius: 'var(--radius-card-functional)',
          bgcolor: color.surface,
          boxShadow: 'var(--shadow-e2)',
        }}
      >
        <Box
          aria-hidden="true"
          sx={{
            position: 'absolute',
            top: -140,
            right: -60,
            width: 320,
            height: 320,
            pointerEvents: 'none',
            background: 'var(--gradient-glow)',
            opacity: 0.7,
          }}
        />
        <Box sx={{ position: 'relative', minWidth: 0 }}>
          <Typography
            component="h1"
            sx={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 }}
          >
            Projects
          </Typography>
          <Typography sx={{ fontSize: '13px', color: color['text-secondary'], mt: 0.5 }}>
            Every installation you are running, from survey to handover
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          component={newProject.allowed ? NextLink : 'button'}
          href={newProject.allowed ? ROUTES.PROJECTS.NEW : undefined}
          onClick={newProject.allowed ? undefined : newProject.onGatedClick}
          aria-disabled={!newProject.allowed}
          sx={{ position: 'relative', flexShrink: 0 }}
        >
          New project
        </Button>
      </Box>

      {/* ── Error banner ── */}
      {isError && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 2,
            borderRadius: 'var(--radius-card-functional)',
            bgcolor: color['danger-bg'],
          }}
        >
          <ErrorOutlineIcon sx={{ color: color.danger, flexShrink: 0 }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ fontSize: crm['text-row-title'], fontWeight: 600, color: color.danger }}>
              Couldn&rsquo;t load projects
            </Box>
            <Box sx={{ fontSize: crm['text-row-sm'], color: color['text-secondary'] }}>
              {getErrorMessage(error)}
            </Box>
          </Box>
          <Button variant="outlined" color="error" size="small" onClick={() => void refetch()}>
            Retry
          </Button>
        </Box>
      )}

      {/* ── Table ── */}
      <CrmTable<ProjectRow>
        columns={CRM_COLUMNS}
        rows={tableRows}
        getRowId={getRowId}
        loading={isLoading}
        refetching={isFetching && !isLoading}
        initialSearch={urlState.state.search}
        onSearchChange={urlState.setSearch}
        searchPlaceholder="Search project, customer, site"
        quickFilters={quickFilters}
        activeQuickFilter={activeStatusFilter}
        onQuickFilterChange={handleQuickFilterChange}
        filterColumns={filterColumns}
        filterModel={filters}
        onFilterChange={handleFilterChange}
        sortModel={urlState.state.sortModel}
        onSortChange={urlState.setSortModel}
        page={urlState.state.page}
        pageSize={urlState.state.pageSize}
        totalRowCount={data?.meta.total ?? 0}
        onPageChange={urlState.setPage}
        onPageSizeChange={urlState.setPageSize}
        onRowClick={(row) => {
          void router.push(buildRoute(ROUTES.PROJECTS.DETAIL, { id: row.id }));
        }}
        renderEmptyState={renderEmptyState}
        gridMinWidth={crm['grid-min-width-project']}
        itemLabel="projects"
      />
    </Box>
  );
}
