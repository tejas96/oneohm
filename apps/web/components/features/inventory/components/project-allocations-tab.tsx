'use client';

import { Boxes, Eye, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { AllocationCreateDialog } from './allocation-create-dialog';
import { ALLOCATION_STATUS_LABEL } from '../constants';

import {
  EmptyPane,
  ErrorPane,
  Mono,
  Overline,
  TonePill,
  type Tone,
} from '@/components/features/projects/components/project-detail/primitives';
import { AdvancedTable, type ColumnConfig } from '@/components/shared/advanced-table';
import type { TableSortModel } from '@/components/shared/advanced-table/types';
import { ROUTES } from '@/lib/config/routes';
import { useStockAllocations, type StockAllocation } from '@/lib/hooks/resources/stock-allocations';
import { formatNumber } from '@/lib/utils';

export interface ProjectAllocationsTabProps {
  projectId: string;
  isActive: boolean;
}

type Row = StockAllocation & Record<string, unknown>;

const EMPTY_ROWS: Row[] = [];

/**
 * Allocation state, mapped onto the page's tone system rather than MUI's
 * palette, so a reserved allocation reads the same green as a reserved BOM line
 * one tab across.
 */
const STATUS_TONE: Record<string, Tone> = {
  allocated: 'accent',
  reserved: 'accent',
  partially_dispatched: 'warning',
  dispatched: 'success',
  completed: 'success',
  cancelled: 'neutral',
  returned: 'neutral',
};

/**
 * Stock reserved out of a warehouse for this project.
 *
 * The table itself is the shared `AdvancedTable`, which already carries the
 * design system's card surface and elevation — wrapping it in another card
 * would stack two shadows. So this owns only the heading above it.
 */
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

  const allocationDetailPath = useCallback(
    (allocationId: string) => ROUTES.INVENTORY.ALLOCATION_DETAIL.replace('[id]', allocationId),
    [],
  );

  const columns: ColumnConfig<Row>[] = [
    {
      field: 'product.name',
      headerName: 'Product',
      flex: 2,
      renderCell: ({ row }) => (
        <div className="flex min-w-0 flex-col gap-0.5 py-1">
          <span className="truncate text-[12.5px] font-medium text-foreground">
            {row.product?.name ?? '—'}
          </span>
          {row.product?.code ? (
            <Mono className="truncate text-[11px] text-foreground-tertiary">
              {row.product.code}
            </Mono>
          ) : null}
        </div>
      ),
    },
    {
      field: 'warehouse.name',
      headerName: 'Warehouse',
      flex: 1,
      renderCell: ({ row }) => (
        <span className="truncate text-[12.5px] text-foreground-secondary">
          {row.warehouse?.name ?? '—'}
        </span>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 1,
      renderCell: ({ row }) => (
        <TonePill
          label={ALLOCATION_STATUS_LABEL[row.status as string] ?? String(row.status)}
          tone={STATUS_TONE[row.status as string] ?? 'neutral'}
          dot
        />
      ),
    },
    {
      field: 'allocatedQuantity',
      headerName: 'Reserved',
      flex: 0.8,
      renderCell: ({ row }) => (
        <Mono className="text-[12.5px] font-medium text-foreground">
          {formatNumber(row.allocatedQuantity)}
        </Mono>
      ),
    },
    {
      field: 'dispatchedQuantity',
      headerName: 'Dispatched',
      flex: 0.8,
      renderCell: ({ row }) => (
        <Mono className="text-[12.5px] text-foreground-secondary">
          {formatNumber(row.dispatchedQuantity)}
        </Mono>
      ),
    },
    {
      field: 'returnedQuantity',
      headerName: 'Returned',
      flex: 0.8,
      renderCell: ({ row }) => (
        <Mono className="text-[12.5px] text-foreground-secondary">
          {formatNumber(row.returnedQuantity)}
        </Mono>
      ),
    },
    {
      field: 'actions',
      headerName: '',
      flex: 0.5,
      sortable: false,
      renderCell: ({ row }) => (
        <button
          type="button"
          aria-label={`Open allocation for ${row.product?.name ?? 'this product'}`}
          onClick={(e) => {
            e.stopPropagation();
            void router.push(allocationDetailPath(row.id));
          }}
          className="flex size-7 items-center justify-center rounded-full text-foreground-tertiary transition-colors duration-fast hover:bg-background-tertiary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
        >
          <Eye className="size-4" strokeWidth={1.75} />
        </button>
      ),
    },
  ];

  const renderEmptyState = useCallback(
    () => (
      <EmptyPane
        size="page"
        icon={<Boxes className="size-4" strokeWidth={2} />}
        title="Nothing reserved yet"
        description="Reserve stock from the Materials tab, or create an allocation here to hold specific units for this project."
      />
    ),
    [],
  );

  if (!isActive) return <></>;

  const header = (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 px-1 pb-3">
      <Overline>Stock allocations</Overline>
      {!isLoading ? (
        <span className="text-[11.5px] text-foreground-tertiary">
          <Mono>{formatNumber(pagination.total)}</Mono>{' '}
          {pagination.total === 1 ? 'allocation' : 'allocations'}
        </span>
      ) : null}
      <button
        type="button"
        onClick={() => setCreateOpen(true)}
        className="ml-auto inline-flex h-8 shrink-0 items-center gap-1.5 rounded-pill bg-primary px-3.5 text-[12.5px] font-medium text-white transition-[filter,transform] duration-fast hover:brightness-105 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Plus className="size-3.5" strokeWidth={2.5} aria-hidden />
        New allocation
      </button>
    </div>
  );

  if (isError) {
    return (
      <section>
        {header}
        <div className="rounded-3xl bg-surface px-[22px] py-4 shadow-e2">
          <ErrorPane
            label="Allocations"
            onRetry={() => {
              void refetch();
            }}
            height={180}
          />
        </div>
      </section>
    );
  }

  return (
    <section>
      {header}

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
    </section>
  );
}
