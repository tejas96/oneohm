'use client';

import { useParams } from 'next/navigation';

import { ErrorState } from '@/components/shared/feedback';
import { MUIStatusChip } from '@/components/ui/mui-status-chip';
import { MUITypography } from '@/components/ui/mui-typography';
import { Skeleton } from '@/components/ui/skeleton';
import { useInventoryStockDetail } from '@/lib/hooks/resources/inventory-stock';

export function InventoryStockDetailPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { data: stock, isLoading, isError } = useInventoryStockDetail(id);

  if (isError) {
    return <ErrorState title="Failed to load stock" description="Unable to load stock details." />;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!stock) return <ErrorState title="Not found" description="Stock record not found." />;

  const isLow = Number(stock.availableQuantity) <= Number(stock.minimumStockLevel ?? 0);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <MUITypography variant="drawerTitle">
            {stock.product?.name ?? stock.productId}
          </MUITypography>
          <MUITypography variant="body" className="text-foreground-secondary mt-1">
            {stock.warehouse?.name} · {stock.product?.code}
          </MUITypography>
        </div>
        <MUIStatusChip
          label={isLow ? 'Low Stock' : 'In Stock'}
          color={isLow ? 'warning' : 'success'}
        />
      </div>

      {/* Quantity cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Available',
            value: stock.availableQuantity,
            color: isLow ? 'text-warning' : 'text-success',
          },
          { label: 'Reserved', value: stock.reservedQuantity, color: 'text-foreground' },
          { label: 'In Transit', value: stock.inTransitQuantity, color: 'text-info' },
          {
            label: 'Min Level',
            value: stock.minimumStockLevel ?? '—',
            color: 'text-foreground-secondary',
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-surface border border-border rounded-xl p-4">
            <p className={`text-2xl font-semibold ${color}`}>{value}</p>
            <p className="text-xs text-foreground-secondary mt-1">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
