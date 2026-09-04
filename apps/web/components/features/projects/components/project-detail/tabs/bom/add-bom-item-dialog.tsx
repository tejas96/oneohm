'use client';

import { Button, CircularProgress } from '@mui/material';
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
import { useAddBomItem } from '@/lib/hooks/resources';

export interface AddBomItemDialogProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
}

/**
 * Add a product the quote never carried.
 *
 * The line is tagged `site` by the server — `source` is not accepted over the
 * wire, so anything added here is a site addition by definition, and shows as
 * one against the quoted baseline.
 *
 * No cost preview: the unit price is resolved server-side from the product's
 * price list (which falls back by project type), so any figure guessed here
 * could disagree with the one actually written. The success toast reports the
 * real impact instead.
 */
export function AddBomItemDialog({
  projectId,
  open,
  onClose,
}: AddBomItemDialogProps): JSX.Element {
  const addItem = useAddBomItem(projectId);

  const [reason, setReason] = useState('');
  const [quantity, setQuantity] = useState('');
  const form = useForm<{ productId: string }>({ defaultValues: { productId: '' } });

  useEffect(() => {
    if (!open) return;
    setReason('');
    setQuantity('');
    form.reset({ productId: '' });
  }, [open, form]);

  const productId = form.watch('productId');
  const parsedQuantity = Number(quantity);
  const quantityValid = quantity.trim() !== '' && Number.isFinite(parsedQuantity) && parsedQuantity > 0;
  const valid = productId !== '' && quantityValid && reason.trim().length > 0;

  const submit = async (): Promise<void> => {
    if (!valid) return;
    try {
      await addItem.execute({
        productId,
        quantity: parsedQuantity,
        reason: reason.trim(),
      });
    } catch {
      // onError already toasts; keep the dialog and the typed reason so the
      // operator can retry rather than re-entering everything.
      return;
    }
    onClose();
  };

  return (
    <MUIDialog open={open} onOpenChange={(next) => !next && onClose()} size="lg">
      <MUIDialogHeader>
        <MUIDialogTitle>Add material</MUIDialogTitle>
        <MUIDialogDescription>
          Adds a product the quote did not carry. It is recorded as a site addition, priced from
          the product&apos;s current price list.
        </MUIDialogDescription>
      </MUIDialogHeader>

      <MUIDialogBody>
        <div className="flex flex-col gap-4">
          <ProductPicker control={form.control} name="productId" label="Product" required />

          <MUIInput
            fieldLabel="Quantity"
            required
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0"
          />

          <MUIInput
            fieldLabel="Why is this needed?"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. open farmland site — lightning protection required"
            multiline
            minRows={2}
            inputProps={{ maxLength: 255 }}
          />

          <p className="text-xs text-muted-foreground">
            This changes the material plan, not what the customer owes. Bill the customer
            separately once you are happy with the whole change.
          </p>
        </div>
      </MUIDialogBody>

      <MUIDialogFooter>
        <Button onClick={onClose} disabled={addItem.isPending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => void submit()}
          disabled={!valid || addItem.isPending}
          startIcon={addItem.isPending ? <CircularProgress size={16} /> : undefined}
        >
          Add material
        </Button>
      </MUIDialogFooter>
    </MUIDialog>
  );
}
