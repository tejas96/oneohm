'use client';

import AddIcon from '@mui/icons-material/Add';
import { Box, Button, Link as MuiLink, Stack } from '@mui/material';
import { ServiceTicketPriority, ServiceTicketStatus } from '@tejas96/shared/types';
import NextLink from 'next/link';
import { type JSX, useCallback, useMemo, useState } from 'react';

import {
  SERVICE_TICKET_PRIORITY_LABELS,
  SERVICE_TICKET_PRIORITY_TONE,
  SERVICE_TICKET_SORT_FIELD_MAP,
  SERVICE_TICKET_STATUS_LABELS,
  SERVICE_TICKET_STATUS_TONE,
} from '../constants';
import { ServiceTicketFormDialog } from './service-ticket-form-dialog';
import { ServiceTicketStatTiles, type TicketTileKey } from './service-ticket-stat-tiles';
import {
  useServiceTickets,
  useServiceTicketStats,
  type ServiceTicket,
  type ServiceTicketListParams,
} from '../hooks/use-service-tickets';

import {
  CrmStatusPill,
  CrmTable,
  type CrmColumn,
  type CrmQuickFilter,
} from '@/components/shared/crm-table';
import { MUIAvatar } from '@/components/ui/mui-avatar';
import { MUITypography } from '@/components/ui/mui-typography';
import { ROUTES, buildRoute } from '@/lib/config/routes';
import { useTableUrlState } from '@/lib/hooks';
import { useGatedAction } from '@/lib/rbac';
import { color, crm } from '@/lib/theme/tokens';
import { formatDate } from '@/lib/utils';

type TicketRow = ServiceTicket & Record<string, unknown>;

const EMPTY_ROWS: TicketRow[] = [];

const STATUS_FILTER_KEY = 'status';
const PRIORITY_FILTER_KEY = 'priority';

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

  const { data: stats, isLoading: statsLoading } = useServiceTicketStats();

  const params = useMemo<ServiceTicketListParams>(
    () => ({
      page: urlState.state.page + 1,
      limit: urlState.state.pageSize,
      search: urlState.state.search || undefined,
      status: statusFilter ? (statusFilter as ServiceTicketStatus) : undefined,
      priority: priorityFilter ? (priorityFilter as ServiceTicketPriority) : undefined,
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
          [STATUS_FILTER_KEY]: '',
          [PRIORITY_FILTER_KEY]: isAlreadyActive ? '' : ServiceTicketPriority.URGENT,
        });
        return;
      }

      urlState.setFilters({
        [STATUS_FILTER_KEY]: isAlreadyActive ? '' : key,
        [PRIORITY_FILTER_KEY]: '',
      });
    },
    [activeTileKey, urlState],
  );

  const handleQuickFilterChange = useCallback(
    (key: string): void => {
      urlState.setFilters({ [STATUS_FILTER_KEY]: key, [PRIORITY_FILTER_KEY]: '' });
    },
    [urlState],
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
      />

      <ServiceTicketFormDialog open={formOpen} onClose={() => setFormOpen(false)} />
    </Box>
  );
}
