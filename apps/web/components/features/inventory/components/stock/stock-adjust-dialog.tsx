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
import {
  type InventoryStock,
  useAdjustInventoryStock,
} from '@/lib/hooks/resources/inventory-stock';

/**
 * Stock adjustment dialog.
 *
 * Calls the existing `POST /inventory-stock/adjust` endpoint that takes
 * an absolute `newQuantity` (not a delta) plus a free-text `reason`.
 * Both fields are mandatory server-side; we validate that locally to
 * avoid a round-trip for empty payloads.
 *
 * Why a separate dialog file: the list page already has 4+ pieces of
 * orchestration state and adding a Dialog inline would push the file
 * over the 500-line cap. Dialog state lives here; parent only hands us
 * the row to operate on.
 */

export interface StockAdjustDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stock: InventoryStock | null;
}

export function StockAdjustDialog({
  open,
  onOpenChange,
  stock,
}: StockAdjustDialogProps): React.JSX.Element {
  const adjust = useAdjustInventoryStock();
  const [newQuantity, setNewQuantity] = useState<string>('0');
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && stock) {
      setNewQuantity(String(stock.availableQuantity ?? 0));
      setReason('');
      setError(null);
    }
  }, [open, stock]);

  const productLabel = stock?.product?.name ?? stock?.productId ?? '—';
  const warehouseLabel = stock?.warehouse?.name ?? stock?.warehouseId ?? '—';
  const unit = stock?.product?.unit ?? '';

  const parsedQty = Number(newQuantity);
  const delta = stock ? parsedQty - Number(stock.availableQuantity) : 0;

  const handleSubmit = async (): Promise<void> => {
    if (!stock) return;
    setError(null);
    if (!Number.isFinite(parsedQty) || parsedQty < 0) {
      setError('Enter a non-negative quantity.');
      return;
    }
    if (reason.trim().length === 0) {
      setError('A reason is required so the audit log captures why this changed.');
      return;
    }
    if (parsedQty === Number(stock.availableQuantity)) {
      setError('New quantity is identical to the current quantity.');
      return;
    }

    setSubmitting(true);
    try {
      await adjust.execute({
        warehouseId: stock.warehouseId,
        productId: stock.productId,
        newQuantity: parsedQty,
        reason: reason.trim(),
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
        <MUIDialogTitle>Adjust stock</MUIDialogTitle>
        <MUITypography variant="body" className="text-foreground-secondary">
          {productLabel} · {warehouseLabel}
        </MUITypography>
      </MUIDialogHeader>
      <MUIDialogBody dividers>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2 rounded-lg border border-border-light p-3 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wide text-foreground-tertiary">
                Available
              </div>
              <div className="font-medium tabular-nums">
                {stock?.availableQuantity ?? 0} {unit}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-foreground-tertiary">
                Reserved
              </div>
              <div className="tabular-nums">
                {stock?.reservedQuantity ?? 0} {unit}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-foreground-tertiary">
                Min level
              </div>
              <div className="tabular-nums">
                {stock?.minimumStockLevel ?? '—'} {unit}
              </div>
            </div>
          </div>

          <MUIInput
            fieldLabel={`New quantity${unit ? ` (${unit})` : ''}`}
            type="number"
            inputProps={{ min: 0, step: 'any' }}
            value={newQuantity}
            onChange={(e) => setNewQuantity(e.target.value)}
            disabled={submitting}
            required
          />

          {Number.isFinite(parsedQty) && delta !== 0 ? (
            <MUITypography variant="body" className={delta > 0 ? 'text-success' : 'text-warning'}>
              {delta > 0 ? `+${delta}` : delta} {unit} change vs current
            </MUITypography>
          ) : null}

          <MUIInput
            fieldLabel="Reason"
            placeholder="e.g. stocktake correction, damaged units, found extras"
            multiline
            minRows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={submitting}
            required
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
          Adjust stock
        </Button>
      </MUIDialogFooter>
    </MUIDialog>
  );
}

StockAdjustDialog.displayName = 'StockAdjustDialog';
