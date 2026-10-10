'use client';

import AddIcon from '@mui/icons-material/Add';
import { Button } from '@mui/material';
import { ProjectPriority, ProjectStatus } from '@tejas96/shared/types';
import { SIDE_TRACK_PHASES, STAGE_GROUP_KEYS, STAGE_GROUPS } from '@tejas96/shared/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import { type JSX, useCallback, useEffect, useMemo } from 'react';

import {
  PROJECT_PRIORITY_OPTIONS,
  PROJECT_STATUS_LABELS,
  PROJECT_TYPE_OPTIONS,
} from '../constants';
import { type ProjectFilters, type ProjectListItem, useEmployees, useProjects } from '../hooks';
import { ProjectRow, ProjectRowSkeleton, STATUS_TONE } from './list/project-row';

import {
  FilterAutocomplete,
  type ColumnConfig,
  type FilterState,
} from '@/components/shared/advanced-table';
import {
  CalmListPage,
  createSortIndex,
  ListEmpty,
  ListError,
  ListPager,
  ListSkeleton,
  ListTitle,
  ListToolbar,
  PrimaryAction,
  Segment,
  SegmentCard,
  type SortOption,
  useKeepPageInRange,
  useListEntrance,
} from '@/components/shared/calm-list';
import type { CrmQuickFilter, CrmTone } from '@/components/shared/crm-table';
import { MUIDateRangePicker } from '@/components/ui';
import { ROUTES } from '@/lib/config/routes';
import { type TableUrlFilterRecord, useTableUrlState } from '@/lib/hooks';
import { useAllActiveWorkflowSteps } from '@/lib/hooks/resources';
import { useGatedAction } from '@/lib/rbac';
import {
  formatBusinessDate,
  formatLocalDate,
  formatNumber,
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

const EMPTY_PROJECT_ROWS: ProjectListItem[] = [];

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
// Sort (what the table's column headers offered)
// ============================================================================

/**
 * The five sortable columns of the old table, both directions, and the created
 * date the list falls back to. The models are the same `{ field, direction }`
 * values the headers wrote, so a saved `projects_sort` URL still means what it
 * meant (`projectNumber` is the old "Customer" header: it sorts by project name).
 */
const SORT_OPTIONS: SortOption[] = [
  { label: 'Newest first', model: null },
  { label: 'Oldest first', model: { field: 'createdAt', direction: 'asc' } },
  { label: 'Name A–Z', model: { field: 'projectNumber', direction: 'asc' } },
  { label: 'Name Z–A', model: { field: 'projectNumber', direction: 'desc' } },
  { label: 'Progress: most first', model: { field: 'progressPercentage', direction: 'desc' } },
  { label: 'Progress: least first', model: { field: 'progressPercentage', direction: 'asc' } },
  { label: 'System: large to small', model: { field: 'systemSizeKw', direction: 'desc' } },
  { label: 'System: small to large', model: { field: 'systemSizeKw', direction: 'asc' } },
  { label: 'Contract: high to low', model: { field: 'estimatedCost', direction: 'desc' } },
  { label: 'Contract: low to high', model: { field: 'estimatedCost', direction: 'asc' } },
  { label: 'Due date: soonest first', model: { field: 'endDate', direction: 'asc' } },
  { label: 'Due date: latest first', model: { field: 'endDate', direction: 'desc' } },
];

/** No sort, or a field `SORT_FIELD_MAP` does not know, is the created date (`toApiSortField`). */
const sortIndex = createSortIndex(SORT_OPTIONS, 'createdAt');

const PROJECT_NOUN = { one: 'project', many: 'projects' };

/** A screenful; a longer page does not need a longer placeholder. */
const MAX_SKELETON_ROWS = 25;

/** The dot beside a quick view, by the tone its chip had. */
const TONE_DOT: Record<CrmTone, string> = {
  neutral: 'var(--ds-neutral-400)',
  accent: 'var(--ds-primary)',
  success: 'var(--ds-primary)',
  info: 'var(--ds-info-soft)',
  warning: 'var(--ds-warning)',
  danger: 'var(--ds-danger)',
};

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

  const rows = data?.data ?? EMPTY_PROJECT_ROWS;
  const { page, pageSize, search, sortModel } = urlState.state;

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
          filterWide: true,
          renderFilter: ({ value, onChange }) => (
            <DateRangeFilter value={value} onChange={onChange} />
          ),
        };
      }
      return col;
    });
  }, [creatorOptions, employeeOptions, workflowStepOptions]);

  // The status is always set (it has a default), so it is not what "filtered" means here.
  const hasOtherFilters =
    search.length > 0 ||
    Object.entries(filters).some(
      ([key, value]) => key !== 'status' && value !== '' && value != null,
    );

  // Said in the filter panel, so the effect of a filter shows without looking away.
  const total = data?.meta.total;
  const resultLabel =
    total === undefined
      ? undefined
      : `${formatNumber(total)} ${total === 1 ? 'project' : 'projects'}`;

  // Rows rise in once. Later changes swap in without replaying it.
  const entering = useListEntrance(rows.length);

  useKeepPageInRange({ page, pageSize, total, isFetching, onPageChange: urlState.setPage });

  const statusViews = quickFilters.filter((view) => !view.key.startsWith('health:'));
  const healthViews = quickFilters.filter((view) => view.key.startsWith('health:'));

  return (
    <CalmListPage
      header={
        <>
          <ListTitle
            title="Projects"
            sub="Every installation you are running, from survey to handover"
            actions={
              <PrimaryAction onClick={newProject.onGatedClick} allowed={newProject.allowed}>
                + New project
              </PrimaryAction>
            }
          />

          {/* Status and health share one row because they share one filter field
              (see `quickFilters`); the health views sit apart at the right. */}
          <SegmentCard label="Projects by status">
            {statusViews.map((view) => (
              <Segment
                key={view.key}
                pressed={activeStatusFilter === view.key}
                onClick={() => handleQuickFilterChange(view.key)}
                count={null}
                label={view.label}
                dot={view.dot ? TONE_DOT[view.tone ?? 'neutral'] : undefined}
              />
            ))}
            <span className="flex-1" />
            {healthViews.map((view) => (
              <Segment
                key={view.key}
                pressed={activeStatusFilter === view.key}
                onClick={() => handleQuickFilterChange(view.key)}
                count={null}
                label={view.label}
                dot={view.dot ? TONE_DOT[view.tone ?? 'neutral'] : undefined}
              />
            ))}
          </SegmentCard>
        </>
      }
      toolbar={
        <ListToolbar
          search={search}
          onSearchChange={urlState.setSearch}
          searchPlaceholder="Search project, customer, site"
          searchLabel="Search projects"
          filterColumns={filterColumns}
          filters={filters}
          onFilterChange={handleFilterChange}
          sortOptions={SORT_OPTIONS}
          sortActiveIndex={sortIndex}
          sortModel={sortModel}
          onSortChange={urlState.setSortModel}
          resultLabel={resultLabel}
        />
      }
      error={
        isError ? (
          <ListError
            title="Couldn’t load projects"
            message={getErrorMessage(error)}
            onRetry={() => void refetch()}
          />
        ) : null
      }
      isFetching={isFetching}
      isLoading={isLoading}
      page={page}
      footer={
        <ListPager
          page={page}
          pageSize={pageSize}
          totalRowCount={data?.meta.total ?? 0}
          onPageChange={urlState.setPage}
          onPageSizeChange={urlState.setPageSize}
          noun={PROJECT_NOUN}
          countUnknown={isError && !data}
        />
      }
    >
      {isLoading ? (
        <ListSkeleton
          rows={Math.min(pageSize, MAX_SKELETON_ROWS)}
          label="Loading projects"
          renderRow={() => <ProjectRowSkeleton />}
        />
      ) : rows.length === 0 ? (
        isError ? null : hasOtherFilters ? (
          <ListEmpty
            title="No projects match"
            hint="Try another name, or remove a filter."
            action={
              <Button size="small" variant="outlined" onClick={handleResetFilters} sx={{ mt: 0.5 }}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <ListEmpty
            title={
              activeStatusFilter === ALL_STATUSES
                ? 'No projects yet'
                : `No ${statusFilterLabel(activeStatusFilter).toLowerCase()} projects right now`
            }
            action={
              <Button
                size="small"
                variant="contained"
                startIcon={<AddIcon />}
                // The same gate the header button uses.
                sx={{ mt: 0.5, opacity: newProject.allowed ? 1 : 0.5 }}
                onClick={newProject.onGatedClick}
                aria-disabled={!newProject.allowed}
              >
                New project
              </Button>
            }
          />
        )
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((project, index) => (
            <ProjectRow key={project.id} project={project} index={index} entering={entering} />
          ))}
        </div>
      )}
    </CalmListPage>
  );
}
