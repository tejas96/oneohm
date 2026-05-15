'use client';

import { useEffect, useState } from 'react';

import {
  Button,
  MUIDialog,
  MUIDialogBody,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
  MUIInput,
} from '@/components/ui';
import { MUITypography } from '@/components/ui/mui-typography';
import { type InventoryStock, useUpdateStockSettings } from '@/lib/hooks/resources/inventory-stock';

/**
 * Stock settings dialog for updating thresholds.
 *
 * Allows editing minimum stock level, maximum stock level, and reorder quantity.
 * These are planning/alerting thresholds that don't affect actual inventory quantities.
 */

export interface StockSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stock: InventoryStock | null;
}

export function StockSettingsDialog({
  open,
  onOpenChange,
  stock,
}: StockSettingsDialogProps): React.JSX.Element {
  const updateSettings = useUpdateStockSettings();
  const [minimumStockLevel, setMinimumStockLevel] = useState<string>('');
  const [maximumStockLevel, setMaximumStockLevel] = useState<string>('');
  const [reorderQuantity, setReorderQuantity] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && stock) {
      setMinimumStockLevel(String(stock.minimumStockLevel ?? ''));
      setMaximumStockLevel(String(stock.maximumStockLevel ?? ''));
      setReorderQuantity(String(stock.reorderQuantity ?? ''));
      setError(null);
    }
  }, [open, stock]);

  const productLabel = stock?.product?.name ?? stock?.productId ?? '—';
  const warehouseLabel = stock?.warehouse?.name ?? stock?.warehouseId ?? '—';
  const unit = stock?.product?.unit ?? '';

  const parsedMin = minimumStockLevel ? Number(minimumStockLevel) : undefined;
  const parsedMax = maximumStockLevel ? Number(maximumStockLevel) : undefined;
  const parsedReorder = reorderQuantity ? Number(reorderQuantity) : undefined;

  const handleSubmit = async (): Promise<void> => {
    if (!stock) return;
    setError(null);

    if (parsedMin !== undefined && (!Number.isFinite(parsedMin) || parsedMin < 0)) {
      setError('Minimum stock level must be a non-negative number.');
      return;
    }
    if (parsedMax !== undefined && (!Number.isFinite(parsedMax) || parsedMax < 0)) {
      setError('Maximum stock level must be a non-negative number.');
      return;
    }
    if (parsedReorder !== undefined && (!Number.isFinite(parsedReorder) || parsedReorder < 0)) {
      setError('Reorder quantity must be a non-negative number.');
      return;
    }
    if (parsedMin !== undefined && parsedMax !== undefined && parsedMin > parsedMax) {
      setError('Minimum stock level cannot be greater than maximum.');
      return;
    }

    setSubmitting(true);
    try {
      await updateSettings.execute(stock.id, {
        minimumStockLevel: parsedMin,
        maximumStockLevel: parsedMax,
        reorderQuantity: parsedReorder,
      });
      onOpenChange(false);
    } catch {
      // Toast handled by the hook.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MUIDialog open={open} onOpenChange={onOpenChange} size="default">
      <MUIDialogHeader>
        <MUIDialogTitle>Stock settings</MUIDialogTitle>
        <MUITypography variant="body" className="text-foreground-secondary">
          {productLabel} · {warehouseLabel}
        </MUITypography>
      </MUIDialogHeader>
      <MUIDialogBody dividers>
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-border-light bg-background-secondary p-3 text-sm">
            <p className="text-foreground-secondary">
              Configure thresholds for low-stock alerts and reordering. These settings don't affect
              actual inventory quantities.
            </p>
          </div>

          <MUIInput
            fieldLabel={`Minimum stock level${unit ? ` (${unit})` : ''}`}
            type="number"
            inputProps={{ min: 0, step: 'any' }}
            value={minimumStockLevel}
            onChange={(e) => setMinimumStockLevel(e.target.value)}
            disabled={submitting}
            helperText="Alert when available quantity drops to or below this level"
          />

          <MUIInput
            fieldLabel={`Maximum stock level${unit ? ` (${unit})` : ''}`}
            type="number"
            inputProps={{ min: 0, step: 'any' }}
            value={maximumStockLevel}
            onChange={(e) => setMaximumStockLevel(e.target.value)}
            disabled={submitting}
            helperText="Optional upper limit for inventory planning"
          />

          <MUIInput
            fieldLabel={`Reorder quantity${unit ? ` (${unit})` : ''}`}
            type="number"
            inputProps={{ min: 0, step: 'any' }}
            value={reorderQuantity}
            onChange={(e) => setReorderQuantity(e.target.value)}
            disabled={submitting}
            helperText="Suggested quantity to reorder when stock is low"
          />

          {error ? (
            <div className="rounded-md bg-error-light p-3 text-sm text-error">{error}</div>
          ) : null}
        </div>
      </MUIDialogBody>
      <MUIDialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={() => void handleSubmit()} disabled={submitting}>
          {submitting ? 'Saving...' : 'Save settings'}
        </Button>
      </MUIDialogFooter>
    </MUIDialog>
  );
}
