'use client';

import AddIcon from '@mui/icons-material/Add';
import { Button } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import { DISPATCH_STATUS_LABEL, DISPATCH_STATUS_COLOR } from '../constants';
import { TableFilterSelect } from './shared/table-filter-select';

import { AdvancedTable, type ColumnConfig } from '@/components/shared/advanced-table';
import type { TableSortModel } from '@/components/shared/advanced-table/types';
import { EmptyState, ErrorState, NoSearchResults } from '@/components/shared/feedback';
import { MUIStatusChip } from '@/components/ui/mui-status-chip';
import { MUITypography } from '@/components/ui/mui-typography';
import { ROUTES } from '@/lib/config/routes';
import {
  useMaterialDispatches,
  type MaterialDispatchFilters,
  type MaterialDispatch,
} from '@/lib/hooks/resources/material-dispatches';

type DispatchRow = MaterialDispatch & Record<string, unknown>;

const EMPTY_ROWS: DispatchRow[] = [];

const COLUMNS: ColumnConfig<DispatchRow>[] = [
  {
    field: 'dispatchNumber',
    headerName: 'Dispatch #',
    flex: 1,
    sortable: true,
    renderCell: ({ row }) => (
      <span className="text-sm font-medium text-primary">{row.dispatchNumber}</span>
    ),
  },
  {
    field: 'project.name',
    headerName: 'Project',
    flex: 1,
    renderCell: ({ row }) => (
      <span className="text-sm text-foreground">{row.project?.name ?? '—'}</span>
    ),
  },
  {
    field: 'warehouse.name',
    headerName: 'From Warehouse',
    flex: 1,
    renderCell: ({ row }) => (
      <span className="text-sm text-foreground-secondary">{row.warehouse?.name ?? '—'}</span>
    ),
  },
  {
    field: 'dispatchDate',
    headerName: 'Dispatch Date',
    width: 140,
    sortable: true,
    renderCell: ({ row }) => (
      <span className="text-sm text-foreground-secondary">
        {row.dispatchDate ? new Date(row.dispatchDate as string).toLocaleDateString('en-IN') : '—'}
      </span>
    ),
  },
  {
    field: 'vehicleNumber',
    headerName: 'Vehicle',
    width: 130,
    renderCell: ({ row }) => (
      <span className="text-sm text-foreground-secondary">{row.vehicleNumber ?? '—'}</span>
    ),
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 130,
    renderCell: ({ row }) => (
      <MUIStatusChip
        label={DISPATCH_STATUS_LABEL[row.status as string] ?? row.status}
        color={DISPATCH_STATUS_COLOR[row.status as string] ?? 'default'}
      />
    ),
  },
];

export function InventoryDispatchesPage(): React.JSX.Element {
  const router = useRouter();

  const {
    items,
    pagination,
    search,
    setSearch,
    sorting,
    filters,
    setFilter,
    isLoading,
    isFetching,
    isError,
  } = useMaterialDispatches();

  const rows: DispatchRow[] = (items ?? EMPTY_ROWS) as DispatchRow[];

  const sortModel: TableSortModel | null = sorting.sortBy
    ? { field: sorting.sortBy, direction: sorting.sortOrder === 'ASC' ? 'asc' : 'desc' }
    : null;

  const renderEmptyState = useCallback(
    () =>
      search ? (
        <NoSearchResults searchTerm={search} onClear={() => setSearch('')} />
      ) : (
        <EmptyState
          title="No dispatches yet"
          description="Create a dispatch to send allocated stock to a project site."
          action={{
            label: 'Create Dispatch',
            onClick: () => router.push(ROUTES.INVENTORY.DISPATCH_NEW),
          }}
        />
      ),
    [search, setSearch, router],
  );

  const toolbarActions = useMemo(
    () => (
      <div className="flex items-center gap-2">
        <TableFilterSelect
          label="Status"
          value={(filters.status as string) || 'all'}
          options={Object.entries(DISPATCH_STATUS_LABEL).map(([value, label]) => ({
            value,
            label,
          }))}
          onChange={(value) => {
            setFilter(
              'status',
              (value === 'all' ? undefined : value) as MaterialDispatchFilters['status'],
            );
          }}
          allLabel="All statuses"
        />
      </div>
    ),
    [filters.status, setFilter],
  );

  if (isError) {
    return <ErrorState title="Failed to load dispatches" description="Please try again." />;
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <MUITypography variant="drawerTitle">Material Dispatches</MUITypography>
          <MUITypography variant="body" className="text-foreground-secondary mt-1">
            {pagination.total} dispatches
          </MUITypography>
        </div>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          size="small"
          onClick={() => router.push(ROUTES.INVENTORY.DISPATCH_NEW)}
        >
          Create Dispatch
        </Button>
      </div>

      <AdvancedTable<DispatchRow>
        columns={COLUMNS}
        rows={rows}
        rowIdField="id"
        paginationMode="server"
        loading={isLoading}
        refetching={isFetching && !isLoading}
        page={Math.max(pagination.page - 1, 0)}
        pageSize={pagination.pageSize}
        totalRowCount={pagination.total}
        sortModel={sortModel}
        onPageChange={(page) => {
          pagination.setPage(page + 1);
        }}
        onPageSizeChange={pagination.setPageSize}
        onSortChange={(model) => {
          if (model) sorting.setSorting(model.field, model.direction === 'asc' ? 'ASC' : 'DESC');
          else sorting.clearSort();
        }}
        onSearchChange={setSearch}
        onRowClick={(row) => {
          void router.push(`${ROUTES.INVENTORY.DISPATCHES}/${row.id}`);
        }}
        enableSearch
        enablePagination
        toolbarActions={toolbarActions}
        searchPlaceholder="Search by dispatch number or project..."
        itemLabel="dispatches"
        renderEmptyState={renderEmptyState}
      />
    </div>
  );
}
