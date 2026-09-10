'use client';

import React, { useCallback, useState } from 'react';

import { useVoidQuote } from '../hooks/use-quotes';

import { Button } from '@/components/ui/button';
import {
  MUIDialog,
  MUIDialogBody,
  MUIDialogDescription,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
} from '@/components/ui/mui-dialog';
import { showToast } from '@/components/ui/sonner';
import { Textarea } from '@/components/ui/textarea';

/** Mirrors `VoidQuoteDto`'s `@Length(5, 500)` on the API. */
const REASON_MIN = 5;
const REASON_MAX = 500;

interface VoidQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: string;
  quoteNumber: string;
  customerName?: string;
  /** Runs after a successful void, e.g. to leave a page that no longer applies. */
  onVoided?: () => void;
}

/**
 * Confirm dialog for withdrawing a quote the customer already has.
 *
 * Shared by the quote list row and the quote detail header so the reason box,
 * its length rule and its wording exist once. Both surfaces reach the same
 * decision, and a rule enforced in one copy but not the other is how a Void
 * with a two-character reason gets through.
 */
export function VoidQuoteDialog({
  open,
  onOpenChange,
  quoteId,
  quoteNumber,
  customerName,
  onVoided,
}: VoidQuoteDialogProps): React.JSX.Element {
  const voidQuote = useVoidQuote();
  const [reason, setReason] = useState('');

  const trimmed = reason.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < REASON_MIN;
  const canSubmit =
    trimmed.length >= REASON_MIN && trimmed.length <= REASON_MAX && !voidQuote.isPending;

  const handleOpenChange = useCallback(
    (next: boolean) => {
      onOpenChange(next);
      if (!next) setReason('');
    },
    [onOpenChange],
  );

  const handleConfirm = useCallback(() => {
    voidQuote.mutate(
      { quoteId, reason: trimmed },
      {
        onSuccess: () => {
          showToast.success(`Quote ${quoteNumber} voided`);
          handleOpenChange(false);
          onVoided?.();
        },
        onError: () => showToast.error('Failed to void quote'),
      },
    );
  }, [voidQuote, quoteId, trimmed, quoteNumber, handleOpenChange, onVoided]);

  return (
    <MUIDialog open={open} onOpenChange={handleOpenChange} size="sm">
      <MUIDialogHeader>
        <MUIDialogTitle>Void {quoteNumber}</MUIDialogTitle>
        <MUIDialogDescription>
          {customerName ?? 'The customer'} keeps the PDF already sent to them. Voiding does not
          recall it — it marks the quote dead here and shows it as withdrawn in their app.
        </MUIDialogDescription>
      </MUIDialogHeader>
      <MUIDialogBody sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Textarea
          placeholder="Why is this quote being withdrawn?"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={REASON_MAX}
          autoFocus
        />
        <p className="text-xs text-foreground-tertiary">
          {tooShort
            ? `Give a bit more detail (at least ${REASON_MIN} characters).`
            : 'Kept on the quote for good. There is no un-void.'}
        </p>
      </MUIDialogBody>
      <MUIDialogFooter>
        <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
          Cancel
        </Button>
        <Button variant="destructive" size="sm" onClick={handleConfirm} disabled={!canSubmit}>
          {voidQuote.isPending ? 'Voiding...' : 'Void Quote'}
        </Button>
      </MUIDialogFooter>
    </MUIDialog>
  );
}
