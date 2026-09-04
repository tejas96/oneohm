'use client';

import { Alert, Button, CircularProgress } from '@mui/material';
import { useEffect, useState, type JSX } from 'react';
import { useForm } from 'react-hook-form';

import {
  MUIDialog,
  MUIDialogBody,
  MUIDialogDescription,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
  MUIInput,
} from '@/components/ui';
import { ProductPicker } from '@/components/features/inventory';
import {
  useChangeBomQuantity,
  useRemoveBomItem,
  useReplaceBomItem,
  type BomItem,
} from '@/lib/hooks/resources';
import { formatCurrency, formatNumber } from '@/lib/utils';

/** Which of the three edits this dialog is currently performing. */
export type BomLineEditMode = 'quantity' | 'replace' | 'remove';

export interface BomLineEditDialogProps {
  projectId: string;
  /** The line being edited. `null` closes the dialog. */
  item: BomItem | null;
  mode: BomLineEditMode;
  onClose: () => void;
}

const TITLE: Record<BomLineEditMode, string> = {
  quantity: 'Change quantity',
  replace: 'Replace item',
  remove: 'Remove line',
};

const DESCRIPTION: Record<BomLineEditMode, string> = {
  quantity: 'Adjust how much of this product the project needs. The old quantity is kept in the change log.',
  replace: 'Swap this product for a different one at the same quantity. The line it replaces stays in the change log.',
  remove: 'Drop this line from the bill. It stays visible at quantity zero so what was dropped is still readable against the quote.',
};

const ACTION_LABEL: Record<BomLineEditMode, string> = {
  quantity: 'Save quantity',
  replace: 'Replace item',
  remove: 'Remove line',
};

/**
 * One dialog for all three line edits, chosen by `mode`.
 *
 * Deliberately one component rather than three: the three edits differ only in
 * their single input, and three separate files drift apart in wording, spacing
 * and button placement the moment anyone touches one of them.
 *
 * The reason box is required in every mode because the server requires it —
 * it is what fills the "why" column of the change log, and a BOM edit with no
 * stated reason is exactly the ambiguity this whole tab exists to remove.
 *
 * Each mode sends ONE change. The server's PATCH takes a quantity or a
 * replacement product, never both, so this dialog never offers both at once —
 * a combined edit would need two calls, could half-fail, and would write two
 * change-log rows for what the operator thought was one action.
 */
export function BomLineEditDialog({
  projectId,
  item,
  mode,
  onClose,
}: BomLineEditDialogProps): JSX.Element {
  const changeQuantity = useChangeBomQuantity(projectId);
  const replaceItem = useReplaceBomItem(projectId);
  const removeItem = useRemoveBomItem(projectId);

  const [reason, setReason] = useState('');
  const [quantity, setQuantity] = useState('');
  // ProductPicker is react-hook-form-driven, matching allocation-create-dialog.
  // Only 'replace' reads it; the form is created unconditionally because hooks
  // cannot be called conditionally.
  const form = useForm<{ productId: string }>({ defaultValues: { productId: '' } });

  const open = item !== null;

  // Re-seed every time the dialog opens rather than once on mount — reopening
  // on a different row, or after an edit landed, must not leave the previous
  // row's numbers sitting in the fields.
  useEffect(() => {
    if (!open || !item) return;
    setReason('');
    setQuantity(String(item.quantity));
    form.reset({ productId: '' });
  }, [open, item, form]);

  const isPending =
    changeQuantity.isPending || replaceItem.isPending || removeItem.isPending;

  const nextQuantity = Number(quantity);
  const quantityIsNumber = quantity.trim() !== '' && Number.isFinite(nextQuantity);
  const productId = form.watch('productId');

  const reasonGiven = reason.trim().length > 0;
  // Zero is NOT a quantity the server accepts: PatchBomItemDto carries
  // @Min(0.001) precisely so that emptying a line goes through DELETE, and the
  // change log records `remove` rather than a quantity change to nothing —
  // those read very differently to whoever audits the log later. Submitting 0
  // came back as a raw "quantity must not be less than 0.001", so it is caught
  // here and the operator is pointed at the action that does work.
  const wantsZero = quantityIsNumber && nextQuantity === 0;
  const valid =
    reasonGiven &&
    (mode === 'remove' ||
      (mode === 'quantity' && quantityIsNumber && nextQuantity > 0 && nextQuantity !== item?.quantity) ||
      (mode === 'replace' && productId !== '' && productId !== item?.productId));

  const submit = async (): Promise<void> => {
    if (!valid || !item) return;
    try {
      if (mode === 'quantity') {
        await changeQuantity.execute({
          itemId: item.id,
          quantity: nextQuantity,
          reason: reason.trim(),
        });
      } else if (mode === 'replace') {
        await replaceItem.execute({
          itemId: item.id,
          replaceWithProductId: productId,
          reason: reason.trim(),
        });
      } else {
        await removeItem.execute({ itemId: item.id, reason: reason.trim() });
      }
    } catch {
      // The mutation's onError already toasts. Keep the dialog and the typed
      // reason so the operator can retry instead of writing it out again.
      return;
    }
    onClose();
  };

  // Only the quantity mode can show what the edit costs before it is sent: the
  // delta and the unit price are both already on the row. Replace and remove
  // are priced by the server (a new product's price is resolved there), so
  // they report their impact in the success toast instead of guessing here.
  const deltaPaise =
    item && mode === 'quantity' && quantityIsNumber
      ? Math.round((nextQuantity - item.quantity) * item.unitPricePaise)
      : 0;

  return (
    <MUIDialog open={open} onOpenChange={(next) => !next && onClose()} size="lg">
      <MUIDialogHeader>
        <MUIDialogTitle>{TITLE[mode]}</MUIDialogTitle>
        <MUIDialogDescription>{DESCRIPTION[mode]}</MUIDialogDescription>
      </MUIDialogHeader>

      <MUIDialogBody>
        <div className="flex flex-col gap-4">
          {item ? (
            <div className="rounded-2xl bg-surface-alt px-3.5 py-2.5">
              <p className="text-[12.5px] font-medium text-foreground">{item.productName}</p>
              <p className="mt-0.5 text-[11.5px] text-foreground-tertiary">
                {item.quotedQuantity != null
                  ? `Quoted ${formatNumber(item.quotedQuantity)} ${item.unit} · `
                  : 'Added on site · '}
                Now {formatNumber(item.quantity)} {item.unit} at{' '}
                {formatCurrency(item.unitPricePaise / 100)} each
              </p>
            </div>
          ) : null}

          {mode === 'quantity' ? (
            <MUIInput
              fieldLabel={`New quantity (${item?.unit ?? ''})`}
              required
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              autoFocus
              error={
                wantsZero
                  ? 'To take this line off the bill, use Remove line from the row menu — that records it as a removal rather than a change to zero.'
                  : undefined
              }
            />
          ) : null}

          {mode === 'replace' ? (
            <ProductPicker
              control={form.control}
              name="productId"
              label="Replace with"
              required
            />
          ) : null}

          <MUIInput
            fieldLabel="Why is this changing?"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. shading survey ruled out two roof bays"
            multiline
            minRows={2}
            autoFocus={mode !== 'quantity'}
            inputProps={{ maxLength: 255 }}
          />

          {deltaPaise !== 0 ? (
            <Alert severity={deltaPaise > 0 ? 'warning' : 'success'} variant="outlined">
              <span className="text-sm">
                This {deltaPaise > 0 ? 'adds' : 'removes'}{' '}
                <span className="font-medium tabular-nums">
                  {formatCurrency(Math.abs(deltaPaise) / 100)}
                </span>{' '}
                {deltaPaise > 0 ? 'to' : 'from'} the project&apos;s material cost.
              </span>
            </Alert>
          ) : null}

          <p className="text-xs text-muted-foreground">
            This changes the material plan, not what the customer owes. Bill the customer
            separately once you are happy with the whole change.
          </p>
        </div>
      </MUIDialogBody>

      <MUIDialogFooter>
        <Button onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color={mode === 'remove' ? 'error' : 'primary'}
          onClick={() => void submit()}
          disabled={!valid || isPending}
          startIcon={isPending ? <CircularProgress size={16} /> : undefined}
        >
          {ACTION_LABEL[mode]}
        </Button>
      </MUIDialogFooter>
    </MUIDialog>
  );
}
