'use client';

import AddIcon from '@mui/icons-material/Add';
import { Button } from '@mui/material';
import {
  ServiceTicketKind,
  ServiceTicketPriority,
  ServiceTicketStatus,
} from '@tejas96/shared/types';
import { type JSX, useCallback, useMemo, useState } from 'react';

import {
  SERVICE_TICKET_PRIORITY_LABELS,
  SERVICE_TICKET_SORT_FIELD_MAP,
  SERVICE_TICKET_STATUS_LABELS,
  SERVICE_TICKET_STATUS_TONE,
  TICKET_FILTER_KEYS,
} from '../constants';
import { ServiceTicketFormDialog } from './service-ticket-form-dialog';
import { ServiceTicketRow, ServiceTicketRowSkeleton } from './service-ticket-row';
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
import type { CrmTone } from '@/components/shared/crm-table';
import {
  MUIUserAssigneeSelector,
  type AssigneeOption,
} from '@/components/ui/mui-user-assignee-selector';
import { useTableUrlState } from '@/lib/hooks';
import { useGatedAction } from '@/lib/rbac';
import { cn, formatNumber, getErrorMessage } from '@/lib/utils';

const EMPTY_ROWS: ServiceTicket[] = [];

const STATUS_FILTER_KEY = TICKET_FILTER_KEYS.status;
const PRIORITY_FILTER_KEY = TICKET_FILTER_KEYS.priority;
const ASSIGNEE_FILTER_KEY = TICKET_FILTER_KEYS.assigneeId;
const OVERDUE_FILTER_KEY = TICKET_FILTER_KEYS.overdue;
const CREATED_BY_FILTER_KEY = TICKET_FILTER_KEYS.createdBy;
const KIND_FILTER_KEY = TICKET_FILTER_KEYS.kind;

const UNASSIGNED_FILTER_VALUE = 'unassigned';

const STATUS_ORDER: ServiceTicketStatus[] = [
  ServiceTicketStatus.OPEN,
  ServiceTicketStatus.IN_PROGRESS,
  ServiceTicketStatus.RESOLVED,
  ServiceTicketStatus.CLOSED,
];

/**
 * The six sortable columns of the old table, both directions. The models are
 * the same `{ field, direction }` values the headers wrote, so a saved
 * `tkt_sort` URL still means what it meant. Priority and status sort by their
 * stored word, which is what "A–Z" says.
 */
const SORT_OPTIONS: SortOption[] = [
  { label: 'Newest first', model: null },
  { label: 'Oldest first', model: { field: 'createdAt', direction: 'asc' } },
  { label: 'Due date: soonest first', model: { field: 'dueDate', direction: 'asc' } },
  { label: 'Due date: latest first', model: { field: 'dueDate', direction: 'desc' } },
  { label: 'Priority A–Z', model: { field: 'priority', direction: 'asc' } },
  { label: 'Priority Z–A', model: { field: 'priority', direction: 'desc' } },
  { label: 'Status A–Z', model: { field: 'status', direction: 'asc' } },
  { label: 'Status Z–A', model: { field: 'status', direction: 'desc' } },
  { label: 'Issue A–Z', model: { field: 'title', direction: 'asc' } },
  { label: 'Issue Z–A', model: { field: 'title', direction: 'desc' } },
  { label: 'Ticket number: low to high', model: { field: 'ticketNumber', direction: 'asc' } },
  { label: 'Ticket number: high to low', model: { field: 'ticketNumber', direction: 'desc' } },
];

/** No sort, or a field `SERVICE_TICKET_SORT_FIELD_MAP` does not know, is the raised date. */
const sortIndex = createSortIndex(SORT_OPTIONS, 'createdAt');

const TICKET_NOUN = { one: 'ticket', many: 'tickets' };

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

const KINDS: ReadonlyArray<{ value: ServiceTicketKind; label: string }> = [
  { value: ServiceTicketKind.ISSUE, label: 'Issues' },
  { value: ServiceTicketKind.MAINTENANCE, label: 'Routine maintenance' },
];

/**
 * Which of the two lists the page shows. `role="tablist"`: it selects between
 * two views of one page, which is what tabs mean.
 */
function TicketKindSwitch({
  value,
  onChange,
}: {
  value: ServiceTicketKind;
  onChange: (kind: ServiceTicketKind) => void;
}): JSX.Element {
  return (
    <div
      role="tablist"
      aria-label="Ticket type"
      className="inline-flex h-10 items-center gap-1 rounded-pill bg-background-tertiary p-1"
    >
      {KINDS.map((kind) => {
        const selected = kind.value === value;
        return (
          <button
            key={kind.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(kind.value)}
            className={cn(
              'h-8 whitespace-nowrap rounded-pill px-3.5 text-[13px] font-medium tracking-[-0.01em] transition-colors motion-reduce:transition-none',
              selected
                ? 'bg-surface text-foreground shadow-e1'
                : 'text-foreground-secondary hover:text-foreground',
            )}
          >
            {kind.label}
          </button>
        );
      })}
    </div>
  );
}

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

  // No value in the URL is the Issues tab, so every old link keeps working.
  const kind =
    urlState.state.filters[KIND_FILTER_KEY] === ServiceTicketKind.MAINTENANCE
      ? ServiceTicketKind.MAINTENANCE
      : ServiceTicketKind.ISSUE;

  const handleKindChange = useCallback(
    (next: ServiceTicketKind) => {
      const filters: FilterState = { ...urlState.state.filters };
      if (next === ServiceTicketKind.MAINTENANCE) filters[KIND_FILTER_KEY] = next;
      else delete filters[KIND_FILTER_KEY];
      urlState.setFilters(filters);
    },
    [urlState],
  );

  const { data: employees } = useEmployees();
  const { data: stats } = useServiceTicketStats(kind);

  const params = useMemo<ServiceTicketListParams>(
    () => ({
      kind,
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
      kind,
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

  const { data, isLoading, isFetching, isError, error, refetch } = useServiceTickets(params);

  const rows = data?.items ?? EMPTY_ROWS;
  const total = data?.meta.total;
  const { page, pageSize, search, sortModel } = urlState.state;

  // priorityFilter is a raw URL string, so compare against the enum's value.
  const urgentActive = priorityFilter === String(ServiceTicketPriority.URGENT);

  /** Urgent is a toggle: it drops the status, and a second click drops itself. */
  const handleUrgentToggle = useCallback((): void => {
    urlState.setFilters({
      ...urlState.state.filters,
      [STATUS_FILTER_KEY]: '',
      [PRIORITY_FILTER_KEY]: urgentActive ? '' : ServiceTicketPriority.URGENT,
    });
  }, [urgentActive, urlState]);

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

  const filterColumns = useMemo<ColumnConfig<ServiceTicket>[]>(() => {
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

  /**
   * The tab is the control for `kind`, so it must not also show up as a filter
   * chip or count toward the filter button's badge.
   */
  const tableFilterModel = useMemo<FilterState>(() => {
    const rest: FilterState = { ...urlState.state.filters };
    delete rest[KIND_FILTER_KEY];
    return rest;
  }, [urlState.state.filters]);

  const handleTableFilterChange = useCallback(
    (next: FilterState): void => {
      const filters: FilterState = { ...next };
      if (kind === ServiceTicketKind.MAINTENANCE) filters[KIND_FILTER_KEY] = kind;
      urlState.setFilters(filters);
    },
    [kind, urlState],
  );

  const statusCount = (status: ServiceTicketStatus): number | undefined => {
    if (!stats) return undefined;
    if (status === ServiceTicketStatus.OPEN) return stats.open;
    if (status === ServiceTicketStatus.IN_PROGRESS) return stats.inProgress;
    if (status === ServiceTicketStatus.RESOLVED) return stats.resolved;
    return stats.closed;
  };

  // The tab is not a filter (see `tableFilterModel`), so it is not what "filtered" means here.
  const narrowed =
    search.length > 0 || Object.values(tableFilterModel).some((v) => v !== '' && v != null);

  /** Back to the whole list of this tab: no search, no filters, the default order. */
  const handleClearAll = useCallback((): void => {
    urlState.resetAll();
    if (kind === ServiceTicketKind.MAINTENANCE) urlState.setFilters({ [KIND_FILTER_KEY]: kind });
  }, [kind, urlState]);

  // Said in the filter panel, so the effect of a filter shows without looking away.
  const resultLabel =
    total === undefined
      ? undefined
      : `${formatNumber(total)} ${total === 1 ? 'ticket' : 'tickets'}`;

  // Rows rise in once. Later changes swap in without replaying it.
  const entering = useListEntrance(rows.length);

  useKeepPageInRange({ page, pageSize, total, isFetching, onPageChange: urlState.setPage });

  return (
    <CalmListPage
      header={
        <>
          <ListTitle
            title="Service Tickets"
            sub="Complaints, AMC queries and issues raised after handover."
            actions={
              <>
                <TicketKindSwitch value={kind} onChange={handleKindChange} />
                {kind === ServiceTicketKind.ISSUE ? (
                  <PrimaryAction onClick={newTicket.onGatedClick} allowed={newTicket.allowed}>
                    + New ticket
                  </PrimaryAction>
                ) : null}
              </>
            }
          />

          {/* The quick views of this tab. A status and Urgent replace each other
              (urgent is a priority, so it writes the priority filter and drops
              the status); Unassigned and Overdue are switches on top. The
              numbers are the whole tab's, whatever the search and filters say —
              the frame you filter from. */}
          <SegmentCard label="Tickets by status">
            <Segment
              pressed={statusFilter === '' && !urgentActive}
              onClick={() => handleQuickFilterChange('')}
              count={null}
              label="All"
            />
            {STATUS_ORDER.map((status) => (
              <Segment
                key={status}
                // statusFilter is a raw URL string, so compare against the enum's value.
                pressed={statusFilter === String(status)}
                onClick={() => handleQuickFilterChange(status)}
                count={statusCount(status)}
                label={SERVICE_TICKET_STATUS_LABELS[status]}
                dot={TONE_DOT[SERVICE_TICKET_STATUS_TONE[status]]}
              />
            ))}
            <span className="flex-1" />
            {/* One group, so on a narrow screen the three wrap to the next line together. */}
            <div className="flex flex-wrap items-center gap-1">
              <Segment
                pressed={urgentActive}
                onClick={handleUrgentToggle}
                count={stats?.urgent}
                label="Urgent"
                warn={(stats?.urgent ?? 0) > 0}
              />
              <Segment
                pressed={activeSecondaryQuickFilter === 'unassigned'}
                onClick={() => handleSecondaryQuickFilterChange('unassigned')}
                count={stats?.unassigned}
                label="Unassigned"
              />
              <Segment
                pressed={activeSecondaryQuickFilter === 'overdue'}
                onClick={() => handleSecondaryQuickFilterChange('overdue')}
                count={stats?.overdue}
                label="Overdue"
                warn={(stats?.overdue ?? 0) > 0}
              />
            </div>
          </SegmentCard>
        </>
      }
      toolbar={
        <ListToolbar
          search={search}
          onSearchChange={urlState.setSearch}
          searchPlaceholder="Search ticket number or issue"
          searchLabel="Search tickets"
          // The tickets API searches on any length.
          searchMinLength={1}
          filterColumns={filterColumns}
          filters={tableFilterModel}
          onFilterChange={handleTableFilterChange}
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
            title="Couldn’t load tickets"
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
          totalRowCount={total ?? 0}
          onPageChange={urlState.setPage}
          onPageSizeChange={urlState.setPageSize}
          noun={TICKET_NOUN}
          countUnknown={isError && !data}
        />
      }
      overlays={<ServiceTicketFormDialog open={formOpen} onClose={() => setFormOpen(false)} />}
    >
      {isLoading ? (
        <ListSkeleton
          rows={Math.min(pageSize, MAX_SKELETON_ROWS)}
          label="Loading tickets"
          renderRow={() => <ServiceTicketRowSkeleton />}
        />
      ) : rows.length === 0 ? (
        isError ? null : narrowed ? (
          <ListEmpty
            title="No tickets match"
            hint="Try another ticket number or issue, or remove a filter."
            action={
              <Button size="small" variant="outlined" onClick={handleClearAll} sx={{ mt: 0.5 }}>
                Clear filters
              </Button>
            }
          />
        ) : kind === ServiceTicketKind.MAINTENANCE ? (
          <ListEmpty title="No routine checkups yet." />
        ) : (
          <ListEmpty
            title="No service tickets yet."
            action={
              <Button
                size="small"
                variant="contained"
                startIcon={<AddIcon />}
                // The same gate the header button uses.
                sx={{ mt: 0.5, opacity: newTicket.allowed ? 1 : 0.5 }}
                onClick={newTicket.onGatedClick}
                aria-disabled={!newTicket.allowed}
              >
                New ticket
              </Button>
            }
          />
        )
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((ticket, index) => (
            <ServiceTicketRow key={ticket.id} ticket={ticket} index={index} entering={entering} />
          ))}
        </div>
      )}
    </CalmListPage>
  );
}
