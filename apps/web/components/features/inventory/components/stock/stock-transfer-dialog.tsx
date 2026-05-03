'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  Button,
  MUIDialog,
  MUIDialogBody,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
  MUIInput,
  MUISelect,
} from '@/components/ui';
import { MUITypography } from '@/components/ui/mui-typography';
import {
  type InventoryStock,
  useTransferInventoryStock,
} from '@/lib/hooks/resources/inventory-stock';
import { useWarehouses } from '@/lib/hooks/resources/warehouses';

/**
 * Stock transfer dialog — moves a quantity of one product from the
 * source warehouse (the row the user clicked from) to a destination
 * warehouse picked from a list of active warehouses.
 *
 * The backend (POST /inventory-stock/transfer) atomically decrements
 * the source row's available quantity, increments (or creates) the
 * destination row, and writes a paired transaction (Transfer Out /
 * Transfer In). All we have to do client-side is collect the inputs
 * and let the FDAL hook invalidate the stock + transaction caches.
 */

export interface StockTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stock: InventoryStock | null;
}

export function StockTransferDialog({
  open,
  onOpenChange,
  stock,
}: StockTransferDialogProps): React.JSX.Element {
  const transfer = useTransferInventoryStock();
  // Pull active warehouses for the destination picker. Cap at 100 to
  // keep the select reasonable; orgs with more should use a typeahead
  // (out of scope for v1).
  const warehousesQuery = useWarehouses({
    defaultPageSize: 100,
    syncToUrl: false,
    defaultFilters: { status: 'active' },
  });

  const [toWarehouseId, setToWarehouseId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && stock) {
      setToWarehouseId('');
      setQuantity('1');
      setNotes('');
      setError(null);
    }
  }, [open, stock]);

  const productLabel = stock?.product?.name ?? stock?.productId ?? '—';
  const sourceLabel = stock?.warehouse?.name ?? stock?.warehouseId ?? '—';
  const unit = stock?.product?.unit ?? '';
  const available = Number(stock?.availableQuantity ?? 0);

  const warehouseOptions = useMemo(
    () =>
      (warehousesQuery.items ?? [])
        .filter((w) => w.id !== stock?.warehouseId)
        .map((w) => ({ value: w.id, label: `${w.name} (${w.code})` })),
    [warehousesQuery.items, stock?.warehouseId],
  );

  const parsedQty = Number(quantity);

  const handleSubmit = async (): Promise<void> => {
    if (!stock) return;
    setError(null);

    if (!toWarehouseId) {
      setError('Pick a destination warehouse.');
      return;
    }
    if (toWarehouseId === stock.warehouseId) {
      setError('Destination must differ from the source warehouse.');
      return;
    }
    if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
      setError('Quantity must be greater than zero.');
      return;
    }
    if (parsedQty > available) {
      setError(
        `Only ${available} ${unit} available at ${sourceLabel}. Reduce the quantity or pick another source.`,
      );
      return;
    }

    setSubmitting(true);
    try {
      await transfer.execute({
        fromWarehouseId: stock.warehouseId,
        toWarehouseId,
        productId: stock.productId,
        quantity: parsedQty,
        notes: notes.trim() || undefined,
      });
      onOpenChange(false);
    } catch {
      // Toast handled by the FDAL hook.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MUIDialog open={open} onOpenChange={onOpenChange} size="default">
      <MUIDialogHeader>
        <MUIDialogTitle>Transfer stock</MUIDialogTitle>
        <MUITypography variant="body" className="text-foreground-secondary">
          {productLabel} · from {sourceLabel}
        </MUITypography>
      </MUIDialogHeader>
      <MUIDialogBody dividers>
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-border-light p-3 text-sm">
            <div className="text-xs uppercase tracking-wide text-foreground-tertiary">
              Available at source
            </div>
            <div className="font-medium tabular-nums">
              {available} {unit}
            </div>
          </div>

          <MUISelect
            fieldLabel="Destination warehouse"
            required
            disabled={submitting || warehousesQuery.isLoading}
            options={warehouseOptions}
            value={toWarehouseId}
            onChange={(e) => setToWarehouseId(String(e.target.value))}
            placeholder={
              warehousesQuery.isLoading
                ? 'Loading warehouses…'
                : warehouseOptions.length === 0
                  ? 'No other warehouses available'
                  : 'Select warehouse'
            }
          />

          <MUIInput
            fieldLabel={`Quantity${unit ? ` (${unit})` : ''}`}
            type="number"
            inputProps={{ min: 0.001, step: 'any', max: available }}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            disabled={submitting}
            required
          />

          <MUIInput
            fieldLabel="Notes"
            placeholder="Optional context for the transaction log"
            multiline
            minRows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={submitting}
          />

          {error ? (
            <MUITypography variant="body" className="text-error">
              {error}
            </MUITypography>
          ) : null}
        </div>
      </MUIDialogBody>
      <MUIDialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="default" onClick={() => void handleSubmit()} disabled={submitting}>
          Transfer
        </Button>
      </MUIDialogFooter>
    </MUIDialog>
  );
}

StockTransferDialog.displayName = 'StockTransferDialog';
