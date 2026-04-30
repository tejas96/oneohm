'use client';

import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Button, IconButton } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { AllocationCreateDialog } from './allocation-create-dialog';
import { ALLOCATION_STATUS_COLOR, ALLOCATION_STATUS_LABEL } from '../constants';

import { AdvancedTable, type ColumnConfig } from '@/components/shared/advanced-table';
import type { TableSortModel } from '@/components/shared/advanced-table/types';
import { EmptyState, ErrorState } from '@/components/shared/feedback';
import { MUIStatusChip } from '@/components/ui/mui-status-chip';
import { MUITypography } from '@/components/ui/mui-typography';
import { ROUTES } from '@/lib/config/routes';
import { useStockAllocations, type StockAllocation } from '@/lib/hooks/resources/stock-allocations';

export interface ProjectAllocationsTabProps {
  projectId: string;
  isActive: boolean;
}

type Row = StockAllocation & Record<string, unknown>;

const EMPTY_ROWS: Row[] = [];

export function ProjectAllocationsTab({
  projectId,
  isActive,
}: ProjectAllocationsTabProps): React.JSX.Element {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  const { items, pagination, sorting, isLoading, isFetching, isError, setFilters, refetch } =
    useStockAllocations(
      {
        syncToUrl: false,
        defaultFilters: { projectId },
      },
      { enabled: isActive },
    );

  useEffect(() => {
    if (isActive) {
      setFilters({ projectId });
    }
  }, [isActive, projectId, setFilters]);

  const rows: Row[] = (items ?? EMPTY_ROWS) as Row[];

  const sortModel: TableSortModel | null = sorting.sortBy
    ? { field: sorting.sortBy, direction: sorting.sortOrder === 'ASC' ? 'asc' : 'desc' }
    : null;

  const allocationDetailPath = useCallback((allocationId: string) => {
    return ROUTES.INVENTORY.ALLOCATION_DETAIL.replace('[id]', allocationId);
  }, []);

  const columns: ColumnConfig<Row>[] = [
    {
      field: 'product.name',
      headerName: 'Product',
      flex: 2,
      renderCell: ({ row }) => (
        <div className="flex flex-col gap-0.5 py-1">
          <span className="text-sm font-medium text-foreground">{row.product?.name ?? '—'}</span>
          <span className="text-xs text-foreground-secondary">{row.product?.code ?? ''}</span>
        </div>
      ),
    },
    {
      field: 'warehouse.name',
      headerName: 'Warehouse',
      flex: 1,
      renderCell: ({ row }) => (
        <span className="text-sm text-foreground-secondary">{row.warehouse?.name ?? '—'}</span>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 1,
      renderCell: ({ row }) => (
        <MUIStatusChip
          label={ALLOCATION_STATUS_LABEL[row.status as string] ?? row.status}
          color={ALLOCATION_STATUS_COLOR[row.status as string] ?? 'default'}
        />
      ),
    },
    {
      field: 'allocatedQuantity',
      headerName: 'Allocated',
      flex: 0.8,
      renderCell: ({ row }) => (
        <span className="text-sm font-medium text-foreground">{row.allocatedQuantity}</span>
      ),
    },
    {
      field: 'dispatchedQuantity',
      headerName: 'Dispatched',
      flex: 0.8,
      renderCell: ({ row }) => (
        <span className="text-sm text-foreground-secondary">{row.dispatchedQuantity}</span>
      ),
    },
    {
      field: 'returnedQuantity',
      headerName: 'Returned',
      flex: 0.8,
      renderCell: ({ row }) => (
        <span className="text-sm text-foreground-secondary">{row.returnedQuantity}</span>
      ),
    },
    {
      field: 'actions',
      headerName: '',
      flex: 0.5,
      sortable: false,
      renderCell: ({ row }) => (
        <IconButton
          aria-label="View allocation"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            void router.push(allocationDetailPath(row.id));
          }}
        >
          <VisibilityIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  const renderEmptyState = useCallback(
    () => (
      <EmptyState
        title="No allocations for this project"
        description="Create an allocation to reserve stock for this project."
      />
    ),
    [],
  );

  if (!isActive) {
    return <></>;
  }

  if (isError) {
    return (
      <div className="flex flex-col gap-4 py-4">
        <ErrorState title="Failed to load allocations" description="Please try again." />
        <Button variant="outlined" size="small" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MUITypography variant="sectionTitle">Stock allocations</MUITypography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddOutlinedIcon />}
          onClick={() => setCreateOpen(true)}
        >
          Create allocation
        </Button>
      </div>

      <AdvancedTable<Row>
        columns={columns}
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
        onRowClick={(row) => {
          void router.push(allocationDetailPath(row.id));
        }}
        enablePagination
        itemLabel="allocations"
        renderEmptyState={renderEmptyState}
      />

      <AllocationCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultProjectId={projectId}
      />
    </div>
  );
}
