'use client';

import { ColumnDef } from '@tanstack/react-table';
import { AlertCircle, Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { type JSX, useMemo, useState } from 'react';

import { CreateProductPriceModal } from './create-product-price-modal';
import { EditProductPriceModal } from './edit-product-price-modal';

import { DataTable, EmptyState } from '@/components/shared';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Typography,
} from '@/components/ui';
import {
  useProductPriceMutations,
  useProductPrices,
  type ProductAdminItem,
  type ProductPrice,
} from '@/lib/hooks/resources';
import { formatCurrencyDecimal, formatDate, getErrorMessage } from '@/lib/utils';

interface ProductPricesDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductAdminItem | null;
}

export function ProductPricesDrawer({
  open,
  onOpenChange,
  product,
}: ProductPricesDrawerProps): JSX.Element {
  const productId = product?.id ?? '';
  const prices = useProductPrices(productId);
  const mutations = useProductPriceMutations(productId);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ProductPrice | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<ProductPrice | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const activeCount = prices.items.filter((price) => price.isActive).length;

  const columns: ColumnDef<ProductPrice>[] = useMemo(
    () => [
      {
        accessorKey: 'effectiveFrom',
        header: 'Effective',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="text-sm text-foreground">{formatDate(row.original.effectiveFrom)}</div>
            <div className="text-2xs text-foreground-tertiary">
              {row.original.effectiveTo ? formatDate(row.original.effectiveTo) : 'No end date'}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'unitPrice',
        header: 'Unit Price',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-foreground-secondary text-sm">
            {formatCurrencyDecimal(row.original.unitPrice)}
          </span>
        ),
      },
      {
        accessorKey: 'costMultiplier',
        header: 'Multiplier',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-foreground-secondary text-sm">{row.original.costMultiplier}</span>
        ),
      },
      {
        accessorKey: 'gstRate',
        header: 'GST',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-foreground-secondary text-sm">{row.original.gstRate}%</span>
        ),
      },
      {
        accessorKey: 'projectType',
        header: 'Project Type',
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant="secondary" size="xs" shape="rounded">
            {row.original.projectType ?? 'all'}
          </Badge>
        ),
      },
      {
        accessorKey: 'isActive',
        header: 'Status',
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? 'success' : 'secondary'} size="xs" shape="pill">
            {row.original.isActive ? 'Active' : 'Inactive'}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="size-8 p-0">
                <MoreHorizontal className="size-icon-sm" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditTarget(row.original)}>
                <Pencil className="mr-2 size-icon-sm" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-error"
                onClick={() => setDeactivateTarget(row.original)}
              >
                <Trash2 className="mr-2 size-icon-sm" /> Deactivate
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="p-4 pr-12 border-b border-border-light">
          <div className="flex items-start justify-between gap-3">
            <div>
              <SheetTitle>Pricing for {product?.name ?? 'Product'}</SheetTitle>
              <Typography variant="body" color="muted" className="mt-1">
                Manage all price rows for this product.
              </Typography>
            </div>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 size-icon-sm" />
              Add Price
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeCount === 0 && (
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm text-warning">
              No active price exists. Quotes using this product will fail until at least one price
              is active.
            </div>
          )}

          {prices.isLoading ? (
            <div className="bg-white rounded-lg border border-border-light p-10 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="size-8 animate-spin text-primary" />
                <p className="text-sm text-foreground-secondary">Loading prices...</p>
              </div>
            </div>
          ) : prices.isError ? (
            <div className="bg-white rounded-lg border border-error/30 p-6">
              <div className="flex items-center gap-3 text-error">
                <AlertCircle className="size-5 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">Failed to load prices</p>
                  <p className="text-sm text-foreground-secondary mt-1">
                    {getErrorMessage(prices.error)}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={prices.refetch}>
                  Retry
                </Button>
              </div>
            </div>
          ) : prices.items.length > 0 ? (
            <div className="bg-white rounded-lg border border-border-light overflow-hidden">
              <DataTable
                columns={columns}
                data={prices.items}
                enableSearch={false}
                enablePagination={false}
                isLoading={prices.isFetching}
              />
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-border-light p-6">
              <EmptyState
                title="No prices added"
                description="Add a price row to make this product available for quotes."
                action={{ label: 'Add Price', onClick: () => setCreateOpen(true) }}
              />
            </div>
          )}
        </div>

        <CreateProductPriceModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          productId={productId}
          productName={product?.name}
        />
        <EditProductPriceModal
          open={!!editTarget}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setEditTarget(null);
          }}
          productId={productId}
          target={editTarget}
        />
      </SheetContent>

      <Dialog
        open={!!deactivateTarget}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDeactivateTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Deactivate Price</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate this price row? It will no longer be used for
              quotes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isDeactivating}
              onClick={() => {
                if (!deactivateTarget) return;
                setIsDeactivating(true);
                void mutations.action('deactivate', deactivateTarget.id).finally(() => {
                  setIsDeactivating(false);
                  setDeactivateTarget(null);
                });
              }}
            >
              {isDeactivating ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Deactivating...
                </>
              ) : (
                'Deactivate'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
