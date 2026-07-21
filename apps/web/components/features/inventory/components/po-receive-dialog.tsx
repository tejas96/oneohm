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
} from '@/components/ui';
import { MUITypography } from '@/components/ui/mui-typography';
import {
  type PurchaseOrder,
  type PurchaseOrderItem,
  usePurchaseOrderMutations,
} from '@/lib/hooks/resources/purchase-orders';
import { formatCurrency } from '@/lib/utils';

export interface PoReceiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  po: PurchaseOrder | null;
}

function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type QtyMap = Record<string, number>;

function buildInitialQuantities(items: PurchaseOrderItem[]): QtyMap {
  return items.reduce<QtyMap>((acc, item) => {
    const ordered = Number(item.orderedQuantity);
    const received = Number(item.receivedQuantity);
    const remaining = Math.max(0, ordered - received);
    acc[item.id] = remaining;
    return acc;
  }, {});
}

export function PoReceiveDialog({
  open,
  onOpenChange,
  po,
}: PoReceiveDialogProps): React.JSX.Element {
  const { action } = usePurchaseOrderMutations();
  const [receivingDate, setReceivingDate] = useState(() => toDateInputValue(new Date()));
  const [quantities, setQuantities] = useState<QtyMap>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const items = useMemo(() => po?.items ?? [], [po?.items]);

  useEffect(() => {
    if (open && po?.items?.length) {
      setQuantities(buildInitialQuantities(po.items));
      setReceivingDate(toDateInputValue(new Date()));
      setFormError(null);
    }
  }, [open, po]);

  const handleSubmit = async (): Promise<void> => {
    if (!po?.id) return;
    setFormError(null);

    const lines = items
      .map((item) => ({
        itemId: item.id,
        quantityReceived: Number(quantities[item.id] ?? 0),
      }))
      .filter((l) => l.quantityReceived > 0);

    if (lines.length === 0) {
      setFormError('Enter a quantity to receive for at least one line.');
      return;
    }

    for (const line of lines) {
      const item = items.find((i) => i.id === line.itemId);
      if (!item) continue;
      const max = Number(item.orderedQuantity) - Number(item.receivedQuantity);
      if (line.quantityReceived > max + 1e-9) {
        setFormError('Receiving quantity cannot exceed the remaining amount for a line.');
        return;
      }
    }

    if (!receivingDate) {
      setFormError('Receiving date is required.');
      return;
    }

    setSubmitting(true);
    try {
      await action('receive', po.id, { items: lines, receivingDate });
      onOpenChange(false);
    } catch {
      // Toast handled by action()
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MUIDialog open={open} onOpenChange={onOpenChange} size="lg">
      <MUIDialogHeader>
        <MUIDialogTitle>Receive items</MUIDialogTitle>
        <MUITypography variant="body" className="text-foreground-secondary">
          {po?.poNumber ?? '—'}
        </MUITypography>
      </MUIDialogHeader>
      <MUIDialogBody dividers>
        <div className="flex flex-col gap-4">
          <MUIInput
            fieldLabel="Receiving date"
            type="date"
            value={receivingDate}
            onChange={(e) => setReceivingDate(e.target.value)}
            required
            disabled={submitting}
            InputLabelProps={{ shrink: true }}
          />

          {formError ? (
            <MUITypography variant="body" className="text-error">
              {formError}
            </MUITypography>
          ) : null}

          <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto">
            {items.length === 0 ? (
              <MUITypography variant="body" className="text-foreground-secondary">
                No line items on this PO.
              </MUITypography>
            ) : (
              items.map((item) => {
                const ordered = Number(item.orderedQuantity);
                const already = Number(item.receivedQuantity);
                const remaining = Math.max(0, ordered - already);
                const label = item.product?.name ?? item.product?.code ?? item.productId;

                return (
                  <div key={item.id} className="flex flex-col gap-2 rounded-lg shadow-e2 p-3">
                    <MUITypography variant="bodyPrimary">{label}</MUITypography>
                    <div className="grid grid-cols-2 gap-2 text-sm text-foreground-secondary sm:grid-cols-4">
                      <span>Ordered: {ordered}</span>
                      <span>Received: {already}</span>
                      <span>Remaining: {remaining}</span>
                      <span>Unit: {formatCurrency(Number(item.unitPrice))}</span>
                    </div>
                    <MUIInput
                      fieldLabel="Qty receiving"
                      type="number"
                      inputProps={{ min: 0, step: 'any' }}
                      value={quantities[item.id] ?? 0}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setQuantities((prev) => ({
                          ...prev,
                          [item.id]: Number.isFinite(v) ? v : 0,
                        }));
                      }}
                      disabled={submitting || remaining <= 0}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </MUIDialogBody>
      <MUIDialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="default" onClick={() => void handleSubmit()} disabled={submitting}>
          Record receipt
        </Button>
      </MUIDialogFooter>
    </MUIDialog>
  );
}
