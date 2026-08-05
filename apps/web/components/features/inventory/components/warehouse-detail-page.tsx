'use client';

import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import {
  WarehouseAllocationsTab,
  WarehouseStockTab,
  WarehouseTransactionsTab,
} from './warehouse-detail-tabs';
import { WarehouseFormDialog } from './warehouse-form-dialog';
import { WarehouseDetailHeader } from './warehouses/warehouse-detail-header';
import { WarehouseDetailKpi } from './warehouses/warehouse-detail-kpi';

import { ErrorState } from '@/components/shared/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWarehouse } from '@/lib/hooks/resources';
import { useRegisteredResourceAccess } from '@/lib/hooks/core';

/**
 * Warehouse detail page (Part: rebuild-warehouse-pages).
 *
 * Layout:
 *   1. Sticky header (back, name, type/status chips, address, edit btn).
 *   2. WarehouseDetailKpi tile row (SKU rows, available units, low stock,
 *      inventory value). Pulls from /inventory-stock/stats/by-warehouse
 *      and a 100-row sample of /inventory-stock?warehouseId.
 *   3. Tabs (Stock / Transactions / Allocations) — existing tabs are
 *      retained because the stock list, transactions, and allocations
 *      tabs already render `AdvancedTable`s with the right shape.
 */
export function WarehouseDetailPage(): React.JSX.Element {
  const params = useParams();
  const [editOpen, setEditOpen] = useState(false);
  const warehouseAccess = useRegisteredResourceAccess('warehouses');
  const canEdit = warehouseAccess.canUpdate;

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
        <Skeleton className="h-24 w-full rounded-lg" />
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
      <div className="flex flex-col gap-4 p-6">
        <WarehouseDetailHeader
          warehouse={warehouse}
          canEdit={canEdit}
          onEdit={() => setEditOpen(true)}
        />

        <WarehouseDetailKpi warehouseId={id} />

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
