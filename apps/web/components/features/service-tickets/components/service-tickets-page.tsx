'use client';

import AddIcon from '@mui/icons-material/Add';
import { Box, Button, Link as MuiLink, Stack } from '@mui/material';
import { ServiceTicketPriority, ServiceTicketStatus } from '@tejas96/shared/types';
import NextLink from 'next/link';
import { type JSX, useCallback, useMemo, useState } from 'react';

import {
  isTicketOverdue,
  SERVICE_TICKET_PRIORITY_LABELS,
  SERVICE_TICKET_PRIORITY_TONE,
  SERVICE_TICKET_SORT_FIELD_MAP,
  SERVICE_TICKET_STATUS_LABELS,
  SERVICE_TICKET_STATUS_TONE,
  TICKET_FILTER_KEYS,
} from '../constants';
import { ServiceTicketFormDialog } from './service-ticket-form-dialog';
import { ServiceTicketStatTiles, type TicketTileKey } from './service-ticket-stat-tiles';
import {
  useServiceTickets,
  useServiceTicketStats,
  type ServiceTicket,
  type ServiceTicketListParams,
} from '../hooks/use-service-tickets';

import { useEmployees } from '@/components/features/employees';
import {
  FilterAutocomplete,
  type ColumnConfig,
  type FilterState,
} from '@/components/shared/advanced-table';
import {
  CrmStatusPill,
  CrmTable,
  type CrmColumn,
  type CrmQuickFilter,
} from '@/components/shared/crm-table';
import { MUIAvatar } from '@/components/ui/mui-avatar';
import { MUITypography } from '@/components/ui/mui-typography';
import {
  MUIUserAssigneeSelector,
  type AssigneeOption,
} from '@/components/ui/mui-user-assignee-selector';
import { ROUTES, buildRoute } from '@/lib/config/routes';
import { useTableUrlState } from '@/lib/hooks';
import { useGatedAction } from '@/lib/rbac';
import { color, crm } from '@/lib/theme/tokens';
import {
  formatBusinessDate,
  formatDate,
  formatDueDatePendingLabel,
  getDueDateMuiColor,
} from '@/lib/utils';

type TicketRow = ServiceTicket & Record<string, unknown>;

const EMPTY_ROWS: TicketRow[] = [];

const STATUS_FILTER_KEY = TICKET_FILTER_KEYS.status;
const PRIORITY_FILTER_KEY = TICKET_FILTER_KEYS.priority;
const ASSIGNEE_FILTER_KEY = TICKET_FILTER_KEYS.assigneeId;
const OVERDUE_FILTER_KEY = TICKET_FILTER_KEYS.overdue;
const CREATED_BY_FILTER_KEY = TICKET_FILTER_KEYS.createdBy;

const UNASSIGNED_FILTER_VALUE = 'unassigned';

const STATUS_ORDER: ServiceTicketStatus[] = [
  ServiceTicketStatus.OPEN,
  ServiceTicketStatus.IN_PROGRESS,
  ServiceTicketStatus.RESOLVED,
  ServiceTicketStatus.CLOSED,
];

function ticketDetailHref(id: string): string {
  return buildRoute(ROUTES.SERVICE.DETAIL, { id });
}

/**
 * CrmTable's grid has no column gap, so cells sit flush and a long value runs
 * straight into its neighbour — the project number was colliding with the
 * priority pill. Applied per column here rather than as a grid gap, which would
 * reflow the customers and discom tables too.
 */
const CELL_GUTTER = { pr: 2 } as const;

/** Truncate with an ellipsis instead of overflowing into the next column. */
const ellipsisSx = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} as const;

const COLUMNS: CrmColumn<TicketRow>[] = [
  {
    field: 'ticketNumber',
    header: 'Ticket',
    track: crm['col-ticket-number'],
    sortable: true,
    stopPropagation: true,
    cellSx: CELL_GUTTER,
    renderCell: (row) => (
      <MuiLink
        component={NextLink}
        href={ticketDetailHref(row.id)}
        underline="hover"
        title={row.ticketNumber}
        sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}
      >
        {row.ticketNumber}
      </MuiLink>
    ),
  },
  {
    field: 'title',
    header: 'Issue',
    track: crm['col-ticket-title'],
    sortable: true,
    cellSx: CELL_GUTTER,
    renderCell: (row) => (
      <MUITypography variant="bodyPrimary" noWrap title={row.title} sx={{ fontWeight: 500 }}>
        {row.title}
      </MUITypography>
    ),
  },
  {
    field: 'customerName',
    header: 'Customer',
    track: crm['col-ticket-customer'],
    cellSx: CELL_GUTTER,
    renderCell: (row) =>
      row.customerName ? (
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          title={row.customerName}
          sx={{ minWidth: 0 }}
        >
          <MUIAvatar name={row.customerName} size="sm" sx={{ flexShrink: 0 }} />
          <MUITypography variant="bodyPrimary" noWrap>
            {row.customerName}
          </MUITypography>
        </Stack>
      ) : (
        <MUITypography variant="placeholder">-</MUITypography>
      ),
  },
  {
    field: 'projectNumber',
    header: 'Project',
    track: crm['col-ticket-project'],
    stopPropagation: true,
    cellSx: CELL_GUTTER,
    renderCell: (row) => (
      <MuiLink
        component={NextLink}
        href={buildRoute(ROUTES.PROJECTS.DETAIL, { id: row.projectId })}
        underline="hover"
        // Project name is not in the list payload, so the number is the fullest
        // label available; the tooltip still helps when the column is narrowed.
        title={row.projectNumber}
        sx={{ display: 'block', ...ellipsisSx }}
      >
        {row.projectNumber}
      </MuiLink>
    ),
  },
  {
    field: 'priority',
    header: 'Priority',
    track: crm['col-ticket-priority'],
    sortable: true,
    cellSx: CELL_GUTTER,
    renderCell: (row) => (
      <CrmStatusPill
        label={SERVICE_TICKET_PRIORITY_LABELS[row.priority]}
        tone={SERVICE_TICKET_PRIORITY_TONE[row.priority]}
        dot
      />
    ),
  },
  {
    field: 'status',
    header: 'Status',
    track: crm['col-ticket-status'],
    sortable: true,
    cellSx: CELL_GUTTER,
    renderCell: (row) => (
      <CrmStatusPill
        label={SERVICE_TICKET_STATUS_LABELS[row.status]}
        tone={SERVICE_TICKET_STATUS_TONE[row.status]}
      />
    ),
  },
  {
    field: 'assigneeName',
    header: 'Assignee',
    track: crm['col-ticket-assignee'],
    cellSx: CELL_GUTTER,
    renderCell: (row) =>
      row.assigneeName ? (
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          title={row.assigneeName}
          sx={{ minWidth: 0 }}
        >
          <MUIAvatar name={row.assigneeName} size="sm" sx={{ flexShrink: 0 }} />
          <MUITypography variant="bodyPrimary" noWrap>
            {row.assigneeName}
          </MUITypography>
        </Stack>
      ) : (
        <MUITypography variant="placeholder">Unassigned</MUITypography>
      ),
  },
  {
    field: 'dueDate',
    header: 'Due',
    track: crm['col-ticket-due'],
    sortable: true,
    cellSx: CELL_GUTTER,
    renderCell: (row) =>
      row.dueDate ? (
        <Stack spacing={0.25}>
          <MUITypography
            variant="bodyPrimary"
            noWrap
            sx={{ color: getDueDateMuiColor(row.dueDate) }}
            title={isTicketOverdue(row) ? 'Overdue' : undefined}
          >
            {formatBusinessDate(row.dueDate)}
          </MUITypography>
          {isTicketOverdue(row) && (
            <MUITypography variant="finePrint" sx={{ color: 'error.main' }}>
              {formatDueDatePendingLabel(row.dueDate)}
            </MUITypography>
          )}
        </Stack>
      ) : (
        <MUITypography variant="placeholder">—</MUITypography>
      ),
  },
  {
    field: 'createdByName',
    header: 'Raised by',
    track: crm['col-ticket-raised-by'],
    cellSx: CELL_GUTTER,
    renderCell: (row) =>
      row.createdByName ? (
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          title={row.createdByName}
          sx={{ minWidth: 0 }}
        >
          <MUIAvatar name={row.createdByName} size="sm" sx={{ flexShrink: 0 }} />
          <MUITypography variant="bodyPrimary" noWrap>
            {row.createdByName}
          </MUITypography>
        </Stack>
      ) : (
        <MUITypography variant="placeholder">—</MUITypography>
      ),
  },
  {
    field: 'createdAt',
    header: 'Raised',
    track: crm['col-ticket-created'],
    sortable: true,
    renderCell: (row) => (
      <MUITypography variant="bodyPrimary" noWrap>
        {formatDate(row.createdAt)}
      </MUITypography>
    ),
  },
];

export function ServiceTicketsPage(): JSX.Element {
  const newTicket = useGatedAction('service.manage', () => setFormOpen(true), 'New ticket');
  const urlState = useTableUrlState({ prefix: 'tkt', defaultPageSize: 20 });
  const [formOpen, setFormOpen] = useState(false);

  const statusFilter = (urlState.state.filters[STATUS_FILTER_KEY] as string | undefined) ?? '';
  const priorityFilter = (urlState.state.filters[PRIORITY_FILTER_KEY] as string | undefined) ?? '';
  const assigneeFilter = (urlState.state.filters[ASSIGNEE_FILTER_KEY] as string | undefined) ?? '';
  const overdueFilter = (urlState.state.filters[OVERDUE_FILTER_KEY] as string | undefined) ?? '';
  const createdByFilter =
    (urlState.state.filters[CREATED_BY_FILTER_KEY] as string | undefined) ?? '';

  const { data: employees } = useEmployees();
  const { data: stats, isLoading: statsLoading } = useServiceTicketStats();

  const params = useMemo<ServiceTicketListParams>(
    () => ({
      page: urlState.state.page + 1,
      limit: urlState.state.pageSize,
      search: urlState.state.search || undefined,
      status: statusFilter ? (statusFilter as ServiceTicketStatus) : undefined,
      priority: priorityFilter ? (priorityFilter as ServiceTicketPriority) : undefined,
      assigneeId:
        assigneeFilter && assigneeFilter !== UNASSIGNED_FILTER_VALUE ? assigneeFilter : undefined,
      unassigned: assigneeFilter === UNASSIGNED_FILTER_VALUE ? true : undefined,
      overdue: overdueFilter === 'true' ? true : undefined,
      createdBy: createdByFilter || undefined,
      sortBy: SERVICE_TICKET_SORT_FIELD_MAP[urlState.state.sortModel?.field ?? ''] ?? 'createdAt',
      sortOrder: urlState.state.sortModel?.direction === 'asc' ? 'ASC' : 'DESC',
    }),
    [
      urlState.state.page,
      urlState.state.pageSize,
      urlState.state.search,
      urlState.state.sortModel,
      statusFilter,
      priorityFilter,
      assigneeFilter,
      overdueFilter,
      createdByFilter,
    ],
  );

  const { data, isLoading, isFetching } = useServiceTickets(params);

  const rows = useMemo<TicketRow[]>(
    () => (data?.items ?? []).map((ticket) => ticket as TicketRow),
    [data?.items],
  );

  /**
   * Which tile reads as selected. Urgent wins when the priority filter is set,
   * because that is the only filter the urgent tile writes.
   */
  const activeTileKey = useMemo<TicketTileKey | null>(() => {
    // priorityFilter is a raw URL string, so compare against the enum's value.
    if (priorityFilter === String(ServiceTicketPriority.URGENT)) return 'urgent';
    if (statusFilter) return statusFilter as TicketTileKey;
    return null;
  }, [statusFilter, priorityFilter]);

  /**
   * Tiles and chips write to the SAME filter fields, so selecting "Open" from
   * either control leaves both in the same visible state.
   */
  const handleTileSelect = useCallback(
    (key: TicketTileKey): void => {
      const isAlreadyActive = activeTileKey === key;

      if (key === 'urgent') {
        urlState.setFilters({
          ...urlState.state.filters,
          [STATUS_FILTER_KEY]: '',
          [PRIORITY_FILTER_KEY]: isAlreadyActive ? '' : ServiceTicketPriority.URGENT,
        });
        return;
      }

      urlState.setFilters({
        ...urlState.state.filters,
        [STATUS_FILTER_KEY]: isAlreadyActive ? '' : key,
        [PRIORITY_FILTER_KEY]: '',
      });
    },
    [activeTileKey, urlState],
  );

  const handleQuickFilterChange = useCallback(
    (key: string): void => {
      urlState.setFilters({
        ...urlState.state.filters,
        [STATUS_FILTER_KEY]: key,
        [PRIORITY_FILTER_KEY]: '',
      });
    },
    [urlState],
  );

  const activeSecondaryQuickFilter = useMemo(() => {
    if (assigneeFilter === UNASSIGNED_FILTER_VALUE) return 'unassigned';
    if (overdueFilter === 'true') return 'overdue';
    return '';
  }, [assigneeFilter, overdueFilter]);

  const handleSecondaryQuickFilterChange = useCallback(
    (key: string): void => {
      const next: FilterState = { ...urlState.state.filters };

      if (key === 'unassigned') {
        const isActive = assigneeFilter === UNASSIGNED_FILTER_VALUE;
        next[ASSIGNEE_FILTER_KEY] = isActive ? '' : UNASSIGNED_FILTER_VALUE;
        if (!isActive) next[OVERDUE_FILTER_KEY] = '';
      } else if (key === 'overdue') {
        const isActive = overdueFilter === 'true';
        next[OVERDUE_FILTER_KEY] = isActive ? '' : 'true';
        if (!isActive) next[ASSIGNEE_FILTER_KEY] = '';
      } else {
        next[ASSIGNEE_FILTER_KEY] = '';
        next[OVERDUE_FILTER_KEY] = '';
      }

      urlState.setFilters(next);
    },
    [assigneeFilter, overdueFilter, urlState],
  );

  const assigneeSelectorOptions = useMemo<AssigneeOption[]>(() => {
    const employeeOptions = (employees ?? [])
      .map((employee) => ({
        id: employee.id,
        displayName:
          [employee.user?.firstName, employee.user?.lastName].filter(Boolean).join(' ').trim() ||
          employee.user?.email ||
          'Unnamed employee',
        secondaryText: [employee.designation, employee.department].filter(Boolean).join(' · '),
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    return [{ id: UNASSIGNED_FILTER_VALUE, displayName: 'Unassigned' }, ...employeeOptions];
  }, [employees]);

  const assigneeFilterOptions = useMemo(
    () =>
      assigneeSelectorOptions.map((option) => ({
        label: option.secondaryText
          ? `${option.displayName} — ${option.secondaryText}`
          : option.displayName,
        value: option.id,
      })),
    [assigneeSelectorOptions],
  );

  const creatorOptions = useMemo(() => {
    const list = (employees ?? [])
      .map((employee) => {
        const label =
          [employee.user?.firstName, employee.user?.lastName].filter(Boolean).join(' ').trim() ||
          employee.user?.email ||
          'Unknown';
        return { label, value: employee.userId };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
    return list;
  }, [employees]);

  const filterColumns = useMemo<ColumnConfig<TicketRow>[]>(() => {
    const statusOptions = STATUS_ORDER.map((status) => ({
      label: SERVICE_TICKET_STATUS_LABELS[status],
      value: status,
    }));
    const priorityOptions = Object.values(ServiceTicketPriority).map((priority) => ({
      label: SERVICE_TICKET_PRIORITY_LABELS[priority],
      value: priority,
    }));

    return [
      {
        field: STATUS_FILTER_KEY,
        headerName: 'Status',
        filterable: false,
        filterType: 'select',
        filterOptions: statusOptions,
      },
      {
        field: PRIORITY_FILTER_KEY,
        headerName: 'Priority',
        filterable: false,
        filterType: 'select',
        filterOptions: priorityOptions,
      },
      {
        field: OVERDUE_FILTER_KEY,
        headerName: 'Overdue',
        filterable: false,
        filterType: 'select',
        filterOptions: [{ label: 'Overdue', value: 'true' }],
      },
      {
        field: ASSIGNEE_FILTER_KEY,
        headerName: 'Assigned To',
        filterable: true,
        filterOptions: assigneeFilterOptions,
        renderFilter: ({ value, onChange }) => (
          <MUIUserAssigneeSelector
            value={typeof value === 'string' && value.length > 0 ? value : null}
            onChange={(id) => onChange(id ?? '')}
            options={assigneeSelectorOptions}
            allowUnassign
            placeholder="All assignees"
            searchPlaceholder="Search assignee…"
            popoverZIndex={1600}
          />
        ),
      },
      {
        field: CREATED_BY_FILTER_KEY,
        headerName: 'Raised by',
        filterable: true,
        filterOptions: creatorOptions,
        renderFilter: ({ value, onChange }) => (
          <FilterAutocomplete
            options={creatorOptions}
            value={value}
            onChange={onChange}
            placeholder="Search creator…"
          />
        ),
      },
    ];
  }, [assigneeFilterOptions, assigneeSelectorOptions, creatorOptions]);

  const secondaryQuickFilters = useMemo<CrmQuickFilter[]>(
    () => [
      {
        key: 'unassigned',
        label: 'Unassigned',
        count: stats?.unassigned,
        tone: 'warning',
        dot: true,
      },
      {
        key: 'overdue',
        label: 'Overdue',
        count: stats?.overdue,
        tone: 'danger',
        dot: true,
      },
    ],
    [stats],
  );

  const quickFilters = useMemo<CrmQuickFilter[]>(() => {
    const countFor = (status: ServiceTicketStatus): number | undefined => {
      if (!stats) return undefined;
      if (status === ServiceTicketStatus.OPEN) return stats.open;
      if (status === ServiceTicketStatus.IN_PROGRESS) return stats.inProgress;
      if (status === ServiceTicketStatus.RESOLVED) return stats.resolved;
      return stats.closed;
    };

    return [
      { key: '', label: 'All' },
      ...STATUS_ORDER.map((status) => ({
        key: status,
        label: SERVICE_TICKET_STATUS_LABELS[status],
        count: countFor(status),
        tone: SERVICE_TICKET_STATUS_TONE[status],
        dot: true,
      })),
    ];
  }, [stats]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        p: 2,
        height: '100%',
        minHeight: 0,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
        <Box>
          <Box
            component="h1"
            sx={{
              m: 0,
              mb: '3px',
              fontSize: crm['text-page-title'],
              fontWeight: 700,
              letterSpacing: crm['text-page-title-track'],
            }}
          >
            Service Tickets
          </Box>
          <Box
            component="p"
            sx={{ m: 0, fontSize: crm['text-row-title'], color: color['text-secondary'] }}
          >
            Complaints, AMC queries and issues raised after handover.
          </Box>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={newTicket.onGatedClick}
          aria-disabled={!newTicket.allowed}
          sx={{ flexShrink: 0 }}
        >
          New Ticket
        </Button>
      </Stack>

      <ServiceTicketStatTiles
        stats={stats}
        loading={statsLoading}
        activeKey={activeTileKey}
        onSelect={handleTileSelect}
      />

      <CrmTable<TicketRow>
        columns={COLUMNS}
        rows={rows.length ? rows : EMPTY_ROWS}
        getRowId={(row) => row.id}
        loading={isLoading}
        refetching={isFetching && !isLoading}
        initialSearch={urlState.state.search}
        onSearchChange={urlState.setSearch}
        searchPlaceholder="Search ticket number or issue"
        quickFilters={quickFilters}
        activeQuickFilter={statusFilter}
        onQuickFilterChange={handleQuickFilterChange}
        secondaryQuickFilters={secondaryQuickFilters}
        activeSecondaryQuickFilter={activeSecondaryQuickFilter}
        onSecondaryQuickFilterChange={handleSecondaryQuickFilterChange}
        filterColumns={filterColumns}
        filterModel={urlState.state.filters}
        onFilterChange={urlState.setFilters}
        sortModel={urlState.state.sortModel}
        onSortChange={urlState.setSortModel}
        page={urlState.state.page}
        pageSize={urlState.state.pageSize}
        totalRowCount={data?.meta.total ?? 0}
        onPageChange={urlState.setPage}
        onPageSizeChange={urlState.setPageSize}
        itemLabel="tickets"
        emptyMessage="No service tickets yet."
        gridMinWidth={crm['grid-min-width-ticket']}
        pageSizeOptions={[10, 20, 25, 50, 100]}
      />

      <ServiceTicketFormDialog open={formOpen} onClose={() => setFormOpen(false)} />
    </Box>
  );
}
