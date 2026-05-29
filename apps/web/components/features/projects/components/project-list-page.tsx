'use client';

import AddIcon from '@mui/icons-material/Add';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import FormatListBulletedOutlinedIcon from '@mui/icons-material/FormatListBulletedOutlined';
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  Autocomplete,
  Box,
  Button,
  IconButton,
  LinearProgress,
  Link as MuiLink,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from '@mui/material';
import { ProjectPriority, ProjectStatus } from '@oneohm-epc/shared/types';
import NextLink from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type JSX, type MouseEvent, useCallback, useMemo, useState } from 'react';

import {
  PROJECT_PRIORITY_LABELS,
  PROJECT_PRIORITY_OPTIONS,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_OPTIONS,
  PROJECT_TYPE_LABELS,
  PROJECT_TYPE_OPTIONS,
} from '../constants';
import { type ProjectFilters, type ProjectListItem, useEmployees, useProjects } from '../hooks';
import { ProjectCard } from './project-card';
import { TeamAvatarGroup } from './team-avatar-group';

import {
  AdvancedTable,
  type BulkAction,
  type ColumnConfig,
} from '@/components/shared/advanced-table';
import { MUIAvatar } from '@/components/ui/mui-avatar';
import { MUIStatusChip } from '@/components/ui/mui-status-chip';
import { MUITypography } from '@/components/ui/mui-typography';
import { SystemSizeDisplay } from '@/components/ui/system-size-display';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { type TableUrlFilterRecord, useTableUrlState } from '@/lib/hooks';
import { useAllActiveWorkflowSteps } from '@/lib/hooks/resources';
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

const BULK_ACTIONS: BulkAction<ProjectRow>[] = [];

const SORT_FIELD_MAP: Record<string, string> = {
  projectNumber: 'name',
  systemSizeKw: 'systemSizeKw',
  estimatedCost: 'estimatedCost',
  progressPercentage: 'progressPercentage',
  endDate: 'endDate',
  status: 'status',
  createdAt: 'createdAt',
};

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

function toProjectFilters(filters: TableUrlFilterRecord): Partial<ProjectFilters> {
  const raw = filters as Record<string, unknown>;
  const result: Partial<ProjectFilters> = {};

  const status = raw.status;
  if (status && typeof status === 'string' && status !== 'all') {
    result.status = status as ProjectStatus;
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

  // endDate column date filter → backend fromDate/toDate (project.endDate range)
  const endDateRaw = toLocalDateString(raw.endDate);
  if (endDateRaw) {
    const { fromIso, toIso } = localDateToUtcDayRange(endDateRaw);
    result.fromDate = fromIso;
    result.toDate = toIso;
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
// Column definitions (module-level — no dynamic captures)
// ============================================================================

const COLUMNS: ColumnConfig<ProjectRow>[] = [
  {
    field: 'projectNumber',
    headerName: 'Project',
    sortable: true,
    width: 210,
    cellSx: { verticalAlign: 'top', py: 1 },
    renderCell: ({ row }): JSX.Element => {
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
          <Stack direction="row" spacing={0.5} alignItems="center">
            <MUIStatusChip
              label={PROJECT_STATUS_LABELS[project.status] ?? toTitleLabel(project.status)}
              colorSeed={project.status}
            />
            <MUIStatusChip
              label={PROJECT_PRIORITY_LABELS[project.priority] ?? toTitleLabel(project.priority)}
              colorSeed={project.priority}
            />
          </Stack>
        </Box>
      );
    },
  },
  {
    field: 'customer',
    headerName: 'Customer',
    flex: 2,
    cellSx: { whiteSpace: 'normal', verticalAlign: 'top', py: 1 },
    renderCell: ({ row }): JSX.Element => {
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
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
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
    headerName: 'System Size',
    sortable: true,
    filterable: true,
    filterType: 'range',
    width: 165,
    renderCell: ({ row }): JSX.Element => {
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
    headerName: 'Value',
    sortable: true,
    width: 160,
    cellSx: { verticalAlign: 'top', py: 1 },
    renderCell: ({ row }): JSX.Element => {
      const project = row as ProjectListItem;
      const estimated = project.estimatedCost ?? null;
      const actual = project.actualCost ?? null;
      if (estimated === null && actual === null) {
        return <MUITypography variant="placeholder">-</MUITypography>;
      }
      const quoteHref = buildRoute(ROUTES.QUOTES.DETAIL, { id: project.quoteId });
      return (
        <Box>
          {estimated != null && (
            <MuiLink
              component={NextLink}
              href={quoteHref}
              underline="hover"
              onClick={(e: MouseEvent) => e.stopPropagation()}
              sx={{ display: 'block', fontWeight: 500, fontSize: '0.875rem', whiteSpace: 'nowrap' }}
            >
              {formatCurrency(estimated)}
            </MuiLink>
          )}
          {actual != null && (
            <Box sx={{ mt: estimated != null ? 0.5 : 0 }}>
              <MUITypography variant="timestamp" sx={{ color: 'text.disabled' }}>
                Actual
              </MUITypography>
              <MuiLink
                component={NextLink}
                href={quoteHref}
                underline="hover"
                onClick={(e: MouseEvent) => e.stopPropagation()}
                sx={{
                  display: 'block',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  whiteSpace: 'nowrap',
                  color: actual > (estimated ?? 0) ? 'error.main' : 'success.main',
                  '&:hover': {
                    color: actual > (estimated ?? 0) ? 'error.dark' : 'success.dark',
                  },
                }}
              >
                {formatCurrency(actual)}
              </MuiLink>
            </Box>
          )}
        </Box>
      );
    },
  },
  {
    field: 'progressPercentage',
    headerName: 'Progress',
    sortable: true,
    width: 180,
    renderCell: ({ row }): JSX.Element => {
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
    headerName: 'Phase',
    width: 130,
    renderCell: ({ row }): JSX.Element => {
      const phase = (row as ProjectListItem).currentPhase;
      if (!phase) return <MUITypography variant="placeholder">-</MUITypography>;
      const label = phase;
      return (
        <Tooltip title={label} placement="top" enterDelay={400}>
          <span>
            <MUIStatusChip label={label} colorSeed={phase} />
          </span>
        </Tooltip>
      );
    },
  },
  {
    field: 'status',
    headerName: 'Status',
    sortable: true,
    filterable: true,
    filterType: 'select',
    filterOptions: PROJECT_STATUS_OPTIONS,
    defaultHidden: true,
    width: 130,
    renderCell: ({ row }): JSX.Element => {
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
    headerName: 'Priority',
    filterable: true,
    filterType: 'select',
    filterOptions: PROJECT_PRIORITY_OPTIONS,
    defaultHidden: true,
    width: 110,
    renderCell: ({ row }): JSX.Element => {
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
    headerName: 'Type',
    filterable: true,
    filterType: 'select',
    filterOptions: PROJECT_TYPE_OPTIONS,
    width: 140,
    renderCell: ({ row }): JSX.Element => {
      const pt = (row as ProjectListItem).projectType;
      return <MUIStatusChip label={PROJECT_TYPE_LABELS[pt] ?? toTitleLabel(pt)} colorSeed={pt} />;
    },
  },
  {
    field: 'endDate',
    headerName: 'Due Date',
    sortable: true,
    filterable: true,
    filterType: 'date',
    renderCell: ({ row }): JSX.Element => {
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
    headerName: 'Team',
    width: 140,
    filterable: true,
    renderCell: ({ row }): JSX.Element => (
      <TeamAvatarGroup members={(row as ProjectListItem).teamMembers} max={3} size="xs" />
    ),
  },
  {
    field: 'pendingWorkflowStepId',
    headerName: 'Pending Task',
    filterable: true,
    defaultHidden: true,
    width: 150,
    renderCell: (): JSX.Element => <></>,
  },
  {
    field: 'payment',
    headerName: 'Payment',
    width: 140,
    renderCell: ({ row }): JSX.Element => {
      const { totalExpected, totalPaid } = (row as ProjectListItem).paymentSummary;
      if (totalExpected === 0) return <MUITypography variant="placeholder">-</MUITypography>;
      if (totalPaid >= totalExpected) {
        return (
          <Tooltip
            title={`Total paid: ${formatCurrency(totalPaid)}`}
            placement="top"
            enterDelay={400}
          >
            <span>
              <MUITypography variant="body" sx={{ color: 'success.main', fontWeight: 500 }}>
                ✓ Paid
              </MUITypography>
            </span>
          </Tooltip>
        );
      }
      const pending = totalExpected - totalPaid;
      return (
        <Tooltip
          title={`Paid: ${formatCurrency(totalPaid)} / Total: ${formatCurrency(totalExpected)}`}
          placement="top"
          enterDelay={400}
        >
          <span>
            <MUITypography variant="body" noWrap sx={{ color: 'warning.main', fontWeight: 500 }}>
              {formatCurrency(pending)} pending
            </MUITypography>
          </span>
        </Tooltip>
      );
    },
  },
  {
    field: 'actions',
    headerName: '',
    hideable: false,
    width: 48,
    renderCell: ({ row }): JSX.Element => (
      <ProjectRowActionsMenu project={row as ProjectListItem} />
    ),
  },
];

// ============================================================================
// Page component
// ============================================================================

export function ProjectListPage(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();

  const statusParam = searchParams.get('status');

  // URL-synced table state — owned by this page (controlled AdvancedTable pattern)
  const urlState = useTableUrlState({
    prefix: 'projects',
    defaultPageSize: 10,
    initialFilters: {
      status: statusParam || 'active',
    },
  });

  // Fetch employees for the filter
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

  // Fetch active workflow steps for the task filter
  const { items: workflowSteps } = useAllActiveWorkflowSteps();
  const workflowStepOptions = useMemo(() => {
    return (
      workflowSteps?.map((step) => ({
        label: step.name,
        value: step.id,
      })) ?? []
    );
  }, [workflowSteps]);

  // View toggle — also URL-synced for shareable links
  const [currentView, setCurrentView] = useState<'card' | 'table'>(() => {
    const v = searchParams.get('projects_view');
    return v === 'card' ? 'card' : 'table';
  });

  const handleViewChange = useCallback((_: MouseEvent, v: 'card' | 'table' | null): void => {
    if (!v) return;
    setCurrentView(v);
    const params = new URLSearchParams(window.location.search);
    if (v === 'table') {
      params.delete('projects_view');
    } else {
      params.set('projects_view', v);
    }
    const qs = params.toString();
    history.replaceState(
      null,
      '',
      qs ? `${window.location.pathname}?${qs}` : window.location.pathname,
    );
  }, []);

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

  // Memoize columns to include dynamic filter options
  const columns = useMemo(() => {
    return COLUMNS.map((col) => {
      if (col.field === 'team') {
        return {
          ...col,
          renderFilter: ({
            value,
            onChange,
          }: {
            value: unknown;
            onChange: (v: unknown) => void;
          }) => {
            const selectedOption =
              employeeOptions.find((o) => String(o.value) === String(value)) || null;
            return (
              <Autocomplete
                size="small"
                fullWidth
                options={employeeOptions}
                value={selectedOption}
                disablePortal
                getOptionLabel={(option) =>
                  typeof option === 'string' ? option : option.label || ''
                }
                isOptionEqualToValue={(option, val) => option.value === val?.value}
                onChange={(_, val) => {
                  onChange(val?.value ?? '');
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search member..."
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1.5,
                      },
                    }}
                  />
                )}
              />
            );
          },
        };
      }
      if (col.field === 'pendingWorkflowStepId') {
        return {
          ...col,
          renderFilter: ({
            value,
            onChange,
          }: {
            value: unknown;
            onChange: (v: unknown) => void;
          }) => {
            const selectedOption =
              workflowStepOptions.find((o) => String(o.value) === String(value)) || null;
            return (
              <Autocomplete
                size="small"
                fullWidth
                options={workflowStepOptions}
                value={selectedOption}
                disablePortal
                getOptionLabel={(option) =>
                  typeof option === 'string' ? option : option.label || ''
                }
                isOptionEqualToValue={(option, val) => option.value === val?.value}
                onChange={(_, val) => {
                  onChange(val?.value ?? '');
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search workflow step..."
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1.5,
                      },
                    }}
                  />
                )}
              />
            );
          },
        };
      }
      return col;
    });
  }, [employeeOptions, workflowStepOptions]);

  const renderEmptyState = useCallback(
    (hasFilters: boolean): JSX.Element => (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <InboxOutlinedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
        <MUITypography variant="body" sx={{ color: 'text.secondary', display: 'block' }}>
          {hasFilters ? 'No projects match your filters.' : 'No projects yet.'}
        </MUITypography>
        {hasFilters && (
          <Button
            size="small"
            sx={{ mt: 1 }}
            onClick={() => {
              urlState.resetAll();
            }}
          >
            Clear Filters
          </Button>
        )}
        {!hasFilters && (
          <Button
            size="small"
            variant="contained"
            sx={{ mt: 1 }}
            onClick={() => {
              void router.push(ROUTES.PROJECTS.NEW);
            }}
          >
            New Project
          </Button>
        )}
      </Box>
    ),
    [router, urlState.resetAll],
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Page header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <MUITypography variant="drawerTitle" sx={{ fontWeight: 600 }}>
            All Projects
          </MUITypography>
          <MUITypography variant="body" sx={{ color: 'text.secondary', mt: 0.25 }}>
            Manage and track all your solar installation projects
          </MUITypography>
        </Box>
        <Stack direction="row" spacing={2} alignItems="center">
          <ToggleButtonGroup
            value={currentView}
            exclusive
            onChange={handleViewChange}
            size="small"
            sx={{ height: 30 }}
          >
            <ToggleButton value="table" aria-label="Table view">
              <FormatListBulletedOutlinedIcon fontSize="small" />
            </ToggleButton>
            <ToggleButton value="card" aria-label="Card view">
              <GridViewOutlinedIcon fontSize="small" />
            </ToggleButton>
          </ToggleButtonGroup>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            component={NextLink}
            href={ROUTES.PROJECTS.NEW}
          >
            New Project
          </Button>
        </Stack>
      </Box>

      {/* Error banner */}
      {isError && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            p: 1.5,
            bgcolor: 'rgba(220,38,38,0.06)',
            borderRadius: 1.5,
            border: '1px solid',
            borderColor: 'error.light',
          }}
        >
          <ErrorOutlineIcon sx={{ color: 'error.main', fontSize: 18, flexShrink: 0 }} />
          <MUITypography variant="body" sx={{ color: 'error.main', flex: 1 }}>
            {getErrorMessage(error)}
          </MUITypography>
          <Button size="small" color="error" onClick={() => void refetch()}>
            Retry
          </Button>
        </Box>
      )}

      {/* Table view */}
      {currentView === 'table' && (
        <AdvancedTable
          key="projects-table"
          rows={tableRows}
          columns={columns}
          rowIdField="id"
          loading={isLoading}
          refetching={isFetching && !isLoading}
          paginationMode="server"
          page={urlState.state.page}
          pageSize={urlState.state.pageSize}
          totalRowCount={data?.meta.total ?? 0}
          sortModel={urlState.state.sortModel}
          filterModel={urlState.state.filters}
          onPageChange={urlState.setPage}
          onPageSizeChange={urlState.setPageSize}
          onSearchChange={urlState.setSearch}
          onSortChange={urlState.setSortModel}
          onFilterChange={urlState.setFilters}
          bulkActions={BULK_ACTIONS}
          enableSearch
          enableFilters
          enablePagination
          enableColumnVisibility
          renderEmptyState={renderEmptyState}
        />
      )}

      {/* Card view */}
      {currentView === 'card' && (
        <>
          {isLoading && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: 2,
              }}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <Box
                  key={i}
                  sx={{
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1.5,
                    p: 2,
                    height: 220,
                  }}
                >
                  <LinearProgress sx={{ borderRadius: 1 }} />
                </Box>
              ))}
            </Box>
          )}
          {!isLoading && tableRows.length === 0 && (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <InboxOutlinedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
              <MUITypography variant="body" sx={{ color: 'text.secondary', display: 'block' }}>
                {Object.keys(urlState.state.filters).length > 0 || urlState.state.search
                  ? 'No projects match your filters.'
                  : 'No projects yet.'}
              </MUITypography>
              {Object.keys(urlState.state.filters).length > 0 || urlState.state.search ? (
                <Button
                  size="small"
                  sx={{ mt: 1 }}
                  onClick={() => {
                    urlState.resetAll();
                  }}
                >
                  Clear Filters
                </Button>
              ) : (
                <Button
                  size="small"
                  variant="contained"
                  sx={{ mt: 1 }}
                  onClick={() => {
                    void router.push(ROUTES.PROJECTS.NEW);
                  }}
                >
                  New Project
                </Button>
              )}
            </Box>
          )}
          {!isLoading && tableRows.length > 0 && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: 2,
              }}
            >
              {tableRows.map((p) => (
                <ProjectCard key={p.id} project={p as ProjectListItem} />
              ))}
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
