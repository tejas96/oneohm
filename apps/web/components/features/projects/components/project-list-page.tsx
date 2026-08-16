'use client';

import AddIcon from '@mui/icons-material/Add';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  Box,
  Button,
  IconButton,
  LinearProgress,
  Link as MuiLink,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { ProjectPriority, ProjectStatus } from '@tejas96/shared/types';
import NextLink from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type JSX, type MouseEvent, useCallback, useMemo, useState } from 'react';

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
import { MUIAvatar } from '@/components/ui/mui-avatar';
import { MUIStatusChip } from '@/components/ui/mui-status-chip';
import { MUITypography } from '@/components/ui/mui-typography';
import { SystemSizeDisplay } from '@/components/ui/system-size-display';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { type TableUrlFilterRecord, useTableUrlState } from '@/lib/hooks';
import { useAllActiveWorkflowSteps } from '@/lib/hooks/resources';
import { useGatedAction } from '@/lib/rbac';
import { color, crm } from '@/lib/theme/tokens';
import {
  formatCurrency,
  formatDate,
  formatRelativeDate,
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

function toProjectFilters(filters: TableUrlFilterRecord): Partial<ProjectFilters> {
  const raw = filters as Record<string, unknown>;
  const result: Partial<ProjectFilters> = {};

  const status = raw.status;
  if (status && typeof status === 'string' && status !== 'all') {
    // Composite health status values from the quick-filter chips (e.g. 'health:delayed')
    if (status.startsWith('health:')) {
      const healthValue = status.slice('health:'.length);
      result.status = ProjectStatus.ACTIVE;
      result.healthStatus = healthValue;
    } else {
      result.status = status as ProjectStatus;
    }
  }

  const priority = raw.priority;
  if (priority && typeof priority === 'string' && priority !== 'all') {
    result.priority = priority as ProjectPriority;
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
// Columns
// ============================================================================

/**
 * The cells are the ones this list has always had — only the wrapper changed.
 * `CrmColumn` takes the row directly where `ColumnConfig` took `{ row }`, and
 * sizing moved from a `width` number to a `crm['col-project-*']` track, so the
 * column-visibility menu can rebuild the grid template from exactly the tracks
 * that survive.
 */
const CRM_COLUMNS: CrmColumn<ProjectRow>[] = [
  {
    field: 'projectNumber',
    header: 'Project',
    track: crm['col-project-name'],
    sortable: true,
    stopPropagation: true,
    hideable: false,
    renderCell: (row): JSX.Element => {
      const project = row as ProjectListItem;

      return (
        <Box sx={{ minWidth: 0 }}>
          <MuiLink
            component={NextLink}
            href={buildRoute(ROUTES.PROJECTS.DETAIL, { id: project.id })}
            underline="hover"
            sx={{ display: 'block', fontWeight: 500, whiteSpace: 'nowrap', mb: 0.5 }}
          >
            {project.projectNumber}
          </MuiLink>
          {/* Wraps: status + priority + the ticket chip overflow 210px on one line. */}
          <Stack
            direction="row"
            spacing={0.5}
            rowGap={0.5}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
          >
            <MUIStatusChip
              label={PROJECT_STATUS_LABELS[project.status] ?? toTitleLabel(project.status)}
              colorSeed={project.status}
            />
            <MUIStatusChip
              label={PROJECT_PRIORITY_LABELS[project.priority] ?? toTitleLabel(project.priority)}
              colorSeed={project.priority}
            />
            {/* Same component the customers list renders — do not restyle here. */}
            <ActiveTicketsChip count={project.activeTicketCount} />
          </Stack>
        </Box>
      );
    },
  },
  {
    field: 'customer',
    header: 'Customer',
    track: crm['col-project-customer'],
    renderCell: (row): JSX.Element => {
      const project = row as ProjectListItem;
      const name = project.property.customerName ?? '';
      if (!name) return <MUITypography variant="placeholder">-</MUITypography>;
      const address = [project.property.address, project.property.city].filter(Boolean).join(', ');
      const tooltipText = address ? `${name}\n${address}` : name;
      return (
        <Tooltip
          title={<span style={{ whiteSpace: 'pre-line' }}>{tooltipText}</span>}
          placement="bottom-start"
          enterDelay={500}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, minWidth: 0 }}>
            <MUIAvatar name={name} size="sm" sx={{ mt: 0.25, flexShrink: 0 }} />
            <Box sx={{ minWidth: 0 }}>
              <MUITypography variant="bodyPrimary" noWrap sx={{ fontWeight: 500 }}>
                {name}
              </MUITypography>
              {address && (
                <MUITypography
                  variant="timestamp"
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
                  {address}
                </MUITypography>
              )}
            </Box>
          </Box>
        </Tooltip>
      );
    },
  },
  {
    field: 'systemSizeKw',
    header: 'System Size',
    track: crm['col-project-size'],
    sortable: true,
    renderCell: (row): JSX.Element => {
      const project = row as ProjectListItem;
      return (
        <SystemSizeDisplay
          actualKw={project.actualSystemSizeKw}
          requestedKw={project.systemSizeKw}
          layout="stacked"
        />
      );
    },
  },
  {
    field: 'estimatedCost',
    header: 'Contract',
    track: crm['col-project-contract'],
    sortable: true,
    stopPropagation: true,
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
     * The separate Payment column had the same disease one level down: it
     * derived what was due as `totalExpected - totalPaid` (against the payment
     * *schedule*) while this cell showed `outstanding` (against the *contract*).
     * Those two agree only when the schedule covers the whole contract, so a
     * project mid-way through change orders showed two different "due" figures
     * on one row. Collection now comes from `outstanding` only, and the
     * schedule figures moved into the tooltip where they can be read together.
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
        return <MUITypography variant="placeholder">-</MUITypography>;
      }

      // Only worth mentioning when the contract has actually moved off the quote.
      const changeOrders = quoted != null ? contract - quoted : 0;
      const hasChangeOrders = Math.abs(changeOrders) >= 0.01;
      const projectHref = buildRoute(ROUTES.PROJECTS.DETAIL, { id: project.id });

      return (
        <Tooltip
          title={
            <span style={{ whiteSpace: 'pre-line' }}>
              {[
                `Contract ${formatCurrency(contract)}`,
                `Paid ${formatCurrency(totalPaid)} of ${formatCurrency(totalExpected)} invoiced`,
                `Outstanding ${formatCurrency(outstanding)}`,
              ].join('\n')}
            </span>
          }
          placement="top"
          enterDelay={400}
        >
          <Box>
            <MuiLink
              component={NextLink}
              href={`${projectHref}?tab=finance`}
              underline="hover"
              onClick={(e: MouseEvent) => e.stopPropagation()}
              sx={{ display: 'block', fontWeight: 500, fontSize: '0.875rem', whiteSpace: 'nowrap' }}
            >
              {formatCurrency(contract)}
            </MuiLink>

            {hasChangeOrders && (
              <MUITypography
                variant="timestamp"
                sx={{ display: 'block', color: 'text.disabled', whiteSpace: 'nowrap' }}
              >
                {`quote ${formatCurrency(quoted ?? 0)} ${changeOrders > 0 ? '+' : '−'} ${formatCurrency(Math.abs(changeOrders))}`}
              </MUITypography>
            )}

            <MUITypography
              variant="timestamp"
              sx={{
                display: 'block',
                whiteSpace: 'nowrap',
                fontWeight: 600,
                color: outstanding > 0 ? 'warning.main' : 'success.main',
              }}
            >
              {outstanding > 0 ? `${formatCurrency(outstanding)} due` : 'Paid in full'}
            </MUITypography>
          </Box>
        </Tooltip>
      );
    },
  },
  {
    field: 'progressPercentage',
    header: 'Progress',
    track: crm['col-project-progress'],
    sortable: true,
    /**
     * The bar is the only cell that paints edge to edge, so the grid's 16px
     * gutter reads as nothing between it and the Phase chip next door — the two
     * looked joined. Ending the bar short of the track boundary restores the
     * gap without widening the column or touching the shared gutter.
     */
    cellSx: { pr: 2.5 },
    renderCell: (row): JSX.Element => {
      const project = row as ProjectListItem;
      const pct = Math.min(100, Math.max(0, project.progressPercentage));
      const completed = project.completedTasks ?? 0;
      const total = project.totalTasks ?? 0;
      return (
        <Box sx={{ minWidth: 0, width: '100%' }}>
          <LinearProgress
            variant="determinate"
            value={pct}
            sx={{ height: 6, borderRadius: 3, mb: 0.5 }}
          />
          <MUITypography variant="timestamp" sx={{ color: 'text.secondary' }}>
            {pct}% · {completed}/{total} tasks
          </MUITypography>
        </Box>
      );
    },
  },
  {
    field: 'currentPhase',
    header: 'Phase',
    track: crm['col-project-phase'],
    renderCell: (row): JSX.Element => {
      const phase = (row as ProjectListItem).currentPhase;
      if (!phase) return <MUITypography variant="placeholder">-</MUITypography>;
      return (
        <Tooltip title={phase} placement="top" enterDelay={400}>
          <span>
            <MUIStatusChip label={phase} colorSeed={phase} />
          </span>
        </Tooltip>
      );
    },
  },
  {
    field: 'status',
    header: 'Status',
    track: crm['col-project-status'],
    sortable: true,
    defaultHidden: true,
    renderCell: (row): JSX.Element => {
      const status = (row as ProjectListItem).status;
      return (
        <MUIStatusChip
          label={PROJECT_STATUS_LABELS[status] ?? toTitleLabel(status)}
          colorSeed={status}
        />
      );
    },
  },
  {
    field: 'priority',
    header: 'Priority',
    track: crm['col-project-priority'],
    defaultHidden: true,
    renderCell: (row): JSX.Element => {
      const priority = (row as ProjectListItem).priority;
      return (
        <MUIStatusChip
          label={PROJECT_PRIORITY_LABELS[priority] ?? toTitleLabel(priority)}
          colorSeed={priority}
        />
      );
    },
  },
  {
    field: 'projectType',
    header: 'Type',
    track: crm['col-project-type'],
    renderCell: (row): JSX.Element => {
      const pt = (row as ProjectListItem).projectType;
      return <MUIStatusChip label={PROJECT_TYPE_LABELS[pt] ?? toTitleLabel(pt)} colorSeed={pt} />;
    },
  },
  {
    field: 'startDate',
    header: 'Start Date',
    track: crm['col-project-start'],
    sortable: true,
    renderCell: (row): JSX.Element => {
      const project = row as ProjectListItem;
      if (!project.startDate) return <MUITypography variant="placeholder">-</MUITypography>;
      return (
        <Box sx={{ minWidth: 0 }}>
          <MUITypography variant="body" sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>
            {formatDate(project.startDate, 'short')}
          </MUITypography>
          <MUITypography variant="timestamp" sx={{ color: 'text.disabled', whiteSpace: 'nowrap' }}>
            {formatDate(project.startDate, 'long')}
          </MUITypography>
        </Box>
      );
    },
  },
  {
    field: 'endDate',
    header: 'Due Date',
    track: crm['col-project-due'],
    sortable: true,
    renderCell: (row): JSX.Element => {
      const project = row as ProjectListItem;
      if (project.status === ProjectStatus.ON_HOLD) {
        return (
          <MUITypography variant="body" sx={{ color: 'text.secondary' }}>
            On Hold
          </MUITypography>
        );
      }
      if (!project.endDate) return <MUITypography variant="placeholder">-</MUITypography>;
      const relative = formatRelativeDate(project.endDate);
      const isOverdue = relative.startsWith('Overdue');
      const displayText = isOverdue ? relative : formatDate(project.endDate, 'short');
      const fullDate = formatDate(project.endDate, 'long');
      return (
        <Box sx={{ minWidth: 0 }}>
          <MUITypography
            variant="body"
            sx={{
              whiteSpace: 'nowrap',
              color: isOverdue ? 'error.main' : 'text.secondary',
              fontWeight: isOverdue ? 500 : 400,
            }}
          >
            {displayText}
          </MUITypography>
          <MUITypography variant="timestamp" sx={{ color: 'text.disabled', whiteSpace: 'nowrap' }}>
            {fullDate}
          </MUITypography>
        </Box>
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

const FILTER_COLUMNS: ColumnConfig<ProjectRow>[] = [
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
];

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

  const activeStatusFilter =
    typeof urlState.state.filters.status === 'string' && urlState.state.filters.status
      ? urlState.state.filters.status
      : DEFAULT_STATUS_FILTER;

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
    ...toProjectFilters(urlState.state.filters),
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
      { key: HEALTH_DELAYED, label: 'Overdue', tone: 'danger' as CrmTone, dot: true },
      { key: HEALTH_AT_RISK, label: 'At risk', tone: 'warning' as CrmTone, dot: true },
    ],
    [],
  );

  const handleQuickFilterChange = useCallback(
    (key: string) => {
      urlState.setFilters(
        withDefaultStatus({ ...urlState.state.filters, status: key || DEFAULT_STATUS_FILTER }),
      );
    },
    [urlState],
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
        filterModel={urlState.state.filters}
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
