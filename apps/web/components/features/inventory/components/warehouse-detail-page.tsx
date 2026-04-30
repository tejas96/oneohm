'use client';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import { Button, Chip, IconButton, Tooltip } from '@mui/material';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { WAREHOUSE_STATUS_COLOR, WAREHOUSE_STATUS_LABEL, WAREHOUSE_TYPE_LABEL } from '../constants';
import {
  WarehouseAllocationsTab,
  WarehouseStockTab,
  WarehouseTransactionsTab,
} from './warehouse-detail-tabs';
import { WarehouseFormDialog } from './warehouse-form-dialog';

import { ErrorState } from '@/components/shared/feedback';
import { MUIStatusChip } from '@/components/ui/mui-status-chip';
import { MUITypography } from '@/components/ui/mui-typography';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ROUTES } from '@/lib/config/routes';
import { useWarehouse } from '@/lib/hooks/resources';

export function WarehouseDetailPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);

  const id = useMemo(() => {
    const raw = params?.id;
    if (typeof raw === 'string') return raw;
    if (Array.isArray(raw)) return raw[0] ?? '';
    return '';
  }, [params]);

  const { data: warehouse, isLoading, isError, error, refetch } = useWarehouse(id);

  if (!id) {
    return (
      <div className="p-6">
        <ErrorState title="Missing warehouse" description="No warehouse id was provided." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <ErrorState
          title="Failed to load warehouse"
          description={error?.message ?? 'Please try again.'}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  if (!warehouse) {
    return (
      <div className="p-6">
        <ErrorState title="Not found" description="This warehouse could not be found." />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Tooltip title="Back to warehouses">
              <IconButton
                aria-label="Back to warehouses"
                onClick={() => router.push(ROUTES.INVENTORY.WAREHOUSES)}
                size="small"
              >
                <ArrowBackIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <MUITypography variant="drawerTitle">{warehouse.name}</MUITypography>
                <Chip
                  size="small"
                  variant="outlined"
                  className="text-foreground-secondary"
                  label={WAREHOUSE_TYPE_LABEL[warehouse.warehouseType] ?? warehouse.warehouseType}
                />
                <MUIStatusChip
                  label={WAREHOUSE_STATUS_LABEL[warehouse.status] ?? warehouse.status}
                  color={WAREHOUSE_STATUS_COLOR[warehouse.status] ?? 'default'}
                />
              </div>
              <MUITypography variant="body" className="text-foreground-secondary">
                {warehouse.code}
              </MUITypography>
              <div className="flex flex-col gap-1">
                <MUITypography variant="bodyPrimary">Address</MUITypography>
                <MUITypography variant="body" className="text-foreground-secondary">
                  {[
                    warehouse.address,
                    [warehouse.city, warehouse.state].filter(Boolean).join(', '),
                    warehouse.pincode,
                  ]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </MUITypography>
              </div>
              <div className="flex flex-col gap-1">
                <MUITypography variant="bodyPrimary">Manager / contact</MUITypography>
                <MUITypography variant="body" className="text-foreground-secondary">
                  {warehouse.contactPerson ?? '—'}
                </MUITypography>
              </div>
            </div>
          </div>
          <Button
            variant="outlined"
            size="small"
            startIcon={<EditIcon />}
            onClick={() => setEditOpen(true)}
          >
            Edit
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-background">
          <Tabs defaultValue="stock">
            <TabsList variant="underline" className="px-4 pt-2" aria-label="Warehouse detail tabs">
              <TabsTrigger value="stock" variant="underline">
                Stock
              </TabsTrigger>
              <TabsTrigger value="transactions" variant="underline">
                Transactions
              </TabsTrigger>
              <TabsTrigger value="allocations" variant="underline">
                Allocations
              </TabsTrigger>
            </TabsList>
            <TabsContent value="stock">
              <WarehouseStockTab warehouseId={id} />
            </TabsContent>
            <TabsContent value="transactions">
              <WarehouseTransactionsTab warehouseId={id} />
            </TabsContent>
            <TabsContent value="allocations">
              <WarehouseAllocationsTab warehouseId={id} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <WarehouseFormDialog open={editOpen} onOpenChange={setEditOpen} warehouse={warehouse} />
    </>
  );
}
