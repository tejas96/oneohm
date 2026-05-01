'use client';

import { Skeleton } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  PO_STATUS_COLOR,
  PO_STATUS_LABEL,
  PROJECT_VENDOR_STATUS_COLOR,
  PROJECT_VENDOR_STATUS_LABEL,
} from '../constants';
import { VendorDetailHeader } from './vendors/vendor-detail-header';
import { VendorDetailKpi } from './vendors/vendor-detail-kpi';
import { VendorFormDialog } from './vendor-form-dialog';

import { AdvancedTable, type ColumnConfig } from '@/components/shared/advanced-table';
import type { TableSortModel } from '@/components/shared/advanced-table/types';
import { EmptyState, ErrorState, NoSearchResults } from '@/components/shared/feedback';
import { MUIStatusChip } from '@/components/ui/mui-status-chip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiClient } from '@/lib/api/client';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { useOrgContext } from '@/lib/hooks/core';
import { usePurchaseOrders, type PurchaseOrder } from '@/lib/hooks/resources/purchase-orders';
import { useVendor } from '@/lib/hooks/resources/vendors';
import { useAuth } from '@/providers/auth-provider';
import { formatCurrency } from '@/lib/utils';

interface ProjectVendorAssignment {
  id: string;
  projectId: string;
  vendorId: string;
  vendorRole?: string;
  contractValue?: number;
  status: string;
  contractStartDate?: string;
  contractEndDate?: string;
  notes?: string;
  /** Backend join — present when the assignment endpoint resolves the
   * project relation. Field added to ProjectVendorResponseDto. */
  project?: { id: string; name?: string; code?: string };
}

interface ProjectVendorListResponse {
  data: ProjectVendorAssignment[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

type PORow = PurchaseOrder & Record<string, unknown>;
type AssignRow = ProjectVendorAssignment & Record<string, unknown>;

const EMPTY_PO: PORow[] = [];
const EMPTY_ASSIGN: AssignRow[] = [];

const PO_COLUMNS: ColumnConfig<PORow>[] = [
  {
    field: 'poNumber',
    headerName: 'PO',
    flex: 1,
    sortable: true,
    renderCell: ({ row }) => (
      <span className="text-sm font-medium text-primary">{row.poNumber}</span>
    ),
  },
  {
    field: 'poDate',
    headerName: 'Date',
    width: 120,
    sortable: true,
    renderCell: ({ row }) => (
      <span className="text-sm text-foreground-secondary">
        {row.poDate ? new Date(row.poDate as string).toLocaleDateString('en-IN') : '—'}
      </span>
    ),
  },
  {
    field: 'totalAmount',
    headerName: 'Total',
    width: 120,
    sortable: true,
    renderCell: ({ row }) => (
      <span className="text-sm text-foreground">{formatCurrency(Number(row.totalAmount))}</span>
    ),
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 150,
    renderCell: ({ row }) => (
      <MUIStatusChip
        label={PO_STATUS_LABEL[row.status as string] ?? row.status}
        color={PO_STATUS_COLOR[row.status as string] ?? 'default'}
      />
    ),
  },
];

const ASSIGN_COLUMNS: ColumnConfig<AssignRow>[] = [
  {
    field: 'project',
    headerName: 'Project',
    flex: 1,
    sortable: false,
    renderCell: ({ row }) => {
      const name = row.project?.name?.trim();
      const code = row.project?.code?.trim();
      return (
        <div className="flex flex-col gap-0.5 py-1">
          <span className="text-sm font-medium text-primary">
            {name || code || row.projectId.slice(0, 8) + '…'}
          </span>
          {name && code ? (
            <span className="text-xs text-foreground-tertiary">{code}</span>
          ) : null}
        </div>
      );
    },
  },
  {
    field: 'vendorRole',
    headerName: 'Role',
    flex: 1,
    renderCell: ({ row }) => (
      <span className="text-sm text-foreground">{row.vendorRole ?? '—'}</span>
    ),
  },
  {
    field: 'contractValue',
    headerName: 'Contract value',
    width: 140,
    renderCell: ({ row }) => (
      <span className="text-sm text-foreground">
        {row.contractValue != null ? formatCurrency(Number(row.contractValue)) : '—'}
      </span>
    ),
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 130,
    renderCell: ({ row }) => (
      <MUIStatusChip
        label={PROJECT_VENDOR_STATUS_LABEL[row.status] ?? row.status}
        color={PROJECT_VENDOR_STATUS_COLOR[row.status] ?? 'default'}
      />
    ),
  },
];

export function VendorDetailPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const { orgHeaders, isReady } = useOrgContext();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('inventory:write');
  const [tab, setTab] = useState('pos');
  const [editOpen, setEditOpen] = useState(false);
  const [assignPage, setAssignPage] = useState(1);

  const id = useMemo(() => {
    const raw = params?.id;
    if (typeof raw === 'string') return raw;
    if (Array.isArray(raw)) return raw[0] ?? '';
    return '';
  }, [params]);

  const { data: vendor, isLoading, isError, refetch } = useVendor(id);

  const {
    items: poItems,
    pagination: poPagination,
    sorting: poSorting,
    search: poSearch,
    setSearch: setPoSearch,
    setFilters: setPoFilters,
    isLoading: poLoading,
    isFetching: poFetching,
    isError: poError,
  } = usePurchaseOrders({ syncToUrl: false });

  useEffect(() => {
    if (!id) return;
    setPoFilters({ vendorId: id, page: 1 });
    setAssignPage(1);
  }, [id, setPoFilters]);

  const assignPageSize = 20;
  const assignQuery = useQuery({
    queryKey: ['project-vendors', 'vendor', id, assignPage, assignPageSize],
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<ProjectVendorListResponse>(
        `/project-vendors/vendor/${id}`,
        { params: { page: assignPage, limit: assignPageSize }, headers: orgHeaders, signal },
      );
      return data;
    },
    enabled: !!id && isReady && tab === 'projects',
  });

  const poRows: PORow[] = (poItems ?? EMPTY_PO) as PORow[];
  const assignRows: AssignRow[] = (assignQuery.data?.data ?? EMPTY_ASSIGN) as AssignRow[];

  const poSortModel: TableSortModel | null = poSorting.sortBy
    ? { field: poSorting.sortBy, direction: poSorting.sortOrder === 'ASC' ? 'asc' : 'desc' }
    : null;

  const renderPoEmpty = useCallback(
    () =>
      poSearch ? (
        <NoSearchResults searchTerm={poSearch} onClear={() => setPoSearch('')} />
      ) : (
        <EmptyState title="No purchase orders" description="This vendor has no POs yet." />
      ),
    [poSearch, setPoSearch],
  );

  const renderAssignEmpty = useCallback(
    () => (
      <EmptyState
        title="No project assignments"
        description="This vendor is not linked to projects."
      />
    ),
    [],
  );

  if (!id) {
    return <ErrorState title="Invalid vendor" description="Please go back and try again." />;
  }

  if (isError) {
    return <ErrorState title="Vendor not found" description="Please go back and try again." />;
  }

  if (isLoading || !vendor) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton variant="rounded" height={48} className="max-w-lg" />
        <Skeleton variant="rounded" height={200} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <VendorDetailHeader
        vendor={vendor}
        canEdit={canEdit}
        onEdit={() => setEditOpen(true)}
      />

      <VendorDetailKpi vendorId={id} />

      <VendorFormDialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) void refetch();
        }}
        vendor={vendor}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <div className="rounded-lg border border-border bg-background">
          <TabsList variant="underline" className="px-4 pt-2" aria-label="Vendor detail tabs">
            <TabsTrigger value="pos" variant="underline">
              Purchase orders
            </TabsTrigger>
            <TabsTrigger value="projects" variant="underline">
              Projects
            </TabsTrigger>
          </TabsList>
          <TabsContent value="pos" className="p-4">
            {poError ? (
              <ErrorState title="Failed to load POs" description="Please try again." />
            ) : (
              <AdvancedTable<PORow>
                columns={PO_COLUMNS}
                rows={poRows}
                rowIdField="id"
                paginationMode="server"
                loading={poLoading}
                refetching={poFetching && !poLoading}
                page={poPagination.page}
                pageSize={poPagination.pageSize}
                totalRowCount={poPagination.total}
                sortModel={poSortModel}
                onPageChange={poPagination.setPage}
                onPageSizeChange={poPagination.setPageSize}
                onSortChange={(model) => {
                  if (model)
                    poSorting.setSorting(model.field, model.direction === 'asc' ? 'ASC' : 'DESC');
                  else poSorting.clearSort();
                }}
                onSearchChange={setPoSearch}
                onRowClick={(row) => {
                  void router.push(`${ROUTES.INVENTORY.PURCHASE_ORDERS}/${row.id}`);
                }}
                enableSearch
                enablePagination
                searchPlaceholder="Search POs…"
                itemLabel="orders"
                renderEmptyState={renderPoEmpty}
              />
            )}
          </TabsContent>
          <TabsContent value="projects" className="p-4">
            {assignQuery.isError ? (
              <ErrorState title="Failed to load assignments" description="Please try again." />
            ) : (
              <AdvancedTable<AssignRow>
                columns={ASSIGN_COLUMNS}
                rows={assignRows}
                rowIdField="id"
                paginationMode="server"
                loading={assignQuery.isLoading}
                refetching={assignQuery.isFetching && !assignQuery.isLoading}
                page={assignPage}
                pageSize={assignPageSize}
                totalRowCount={assignQuery.data?.meta.total ?? 0}
                onPageChange={(p) => {
                  setAssignPage(p);
                }}
                onRowClick={(row) => {
                  void router.push(buildRoute(ROUTES.PROJECTS.DETAIL, { id: row.projectId }));
                }}
                enableSearch={false}
                enablePagination
                itemLabel="assignments"
                renderEmptyState={renderAssignEmpty}
              />
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
