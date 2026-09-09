'use client';

import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Box, Divider, Stack, Typography } from '@mui/material';
import { LOSS_REASON_LABELS } from '@tejas96/shared/constants';
import { LossReason } from '@tejas96/shared/types';
import { useEffect, useMemo, useState, type JSX } from 'react';

import { SegmentedToggle, type SegmentedOption } from './primitives';
import { useCancelProject, useSettlementPreview, type CancelProjectSettlement } from '../../hooks';

import {
  Button,
  MUIDialog,
  MUIDialogBody,
  MUIDialogDescription,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
  MUIInput,
  MUISelect,
  showToast,
} from '@/components/ui';
import { useGatedAction } from '@/lib/rbac';
import { getErrorMessage } from '@/lib/utils';
import { formatPaise, paiseToRupees, rupeesToPaise } from '@/lib/utils/paise';

interface CancelProjectDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectNumber?: string;
}

type PayerType = 'customer' | 'lender';

const PAYER_LABELS: Record<PayerType, string> = {
  customer: 'Customer',
  lender: 'Lender',
};

const PROPERTY_OUTCOME_OPTIONS: ReadonlyArray<SegmentedOption<'requote' | 'close'>> = [
  { value: 'requote', label: 'Keep it for a re-quote' },
  { value: 'close', label: 'Close the site' },
];

type ParsedKept = { ok: true; paise: number } | { ok: false; message: string };

/**
 * Reads one settlement line's typed rupee text against what that payer
 * actually collected. Zero is a valid answer — it means refund everything —
 * so this cannot reuse `parseRupeeInput`: that helper's "must be positive"
 * rejection is correct for every other money field in the app but wrong for
 * this one.
 */
function parseKeptInput(text: string, collectedPaise: number): ParsedKept {
  const cleaned = text.replace(/[,\s₹]/g, '');
  if (cleaned === '') {
    return { ok: false, message: 'Enter an amount, or 0 to refund everything.' };
  }
  const rupees = Number(cleaned);
  if (!Number.isFinite(rupees) || rupees < 0) {
    return { ok: false, message: 'Enter an amount of zero or more.' };
  }
  const paise = rupeesToPaise(rupees);
  if (paise > collectedPaise) {
    return {
      ok: false,
      message: `Cannot keep more than the ${formatPaise(collectedPaise)} collected.`,
    };
  }
  return { ok: true, paise };
}

/**
 * Cancellation no longer goes through the plain status dropdown — Task 8
 * removed that transition, so the API rejects it. This is the only way in.
 *
 * Shell modelled on mark-as-lost-dialog.tsx (busy state, escape-key
 * handling); the money fields match record-money-dialog.tsx, the house
 * pattern for every other dialog that reads or writes paise.
 */
export function CancelProjectDialog({
  open,
  onClose,
  projectId,
  projectNumber,
}: CancelProjectDialogProps): JSX.Element {
  const cancelMutation = useCancelProject(projectId);
  const preview = useSettlementPreview(projectId, { enabled: open });

  const [lossReason, setLossReason] = useState<LossReason | ''>('');
  const [cancelReason, setCancelReason] = useState('');
  const [propertyOutcome, setPropertyOutcome] = useState<'requote' | 'close'>('requote');
  const [keptText, setKeptText] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setLossReason('');
    setCancelReason('');
    setPropertyOutcome('requote');
    setKeptText({});
  }, [open]);

  /*
   * Default every line to keeping the full amount, so the common case — keep
   * everything, refund nothing — is one click. Re-seeded whenever the
   * preview lands, but this never overwrites a line the person already
   * edited: it only fills in payers not yet present in `keptText`.
   */
  useEffect(() => {
    if (!preview.data) return;
    setKeptText((current) => {
      let changed = false;
      const next = { ...current };
      for (const line of preview.data ?? []) {
        if (!(line.payerType in next)) {
          next[line.payerType] = paiseToRupees(line.collectedPaise).toFixed(2);
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [preview.data]);

  const lines = useMemo(() => preview.data ?? [], [preview.data]);
  const parsedLines = useMemo(
    () =>
      lines.map((line) => ({
        payerType: line.payerType,
        collectedPaise: line.collectedPaise,
        parsed: parseKeptInput(keptText[line.payerType] ?? '', line.collectedPaise),
      })),
    [lines, keptText],
  );

  const canSubmit =
    Boolean(lossReason) &&
    cancelReason.trim().length > 0 &&
    parsedLines.every((line) => line.parsed.ok);

  const handleSubmit = (): void => {
    if (!lossReason || !cancelReason.trim()) return;

    const settlements: CancelProjectSettlement[] = [];
    let anyRefund = false;
    for (const line of parsedLines) {
      if (!line.parsed.ok) return;
      settlements.push({ payerType: line.payerType, keptPaise: line.parsed.paise });
      if (line.parsed.paise < line.collectedPaise) anyRefund = true;
    }

    cancelMutation.mutate(
      { lossReason, cancelReason: cancelReason.trim(), propertyOutcome, settlements },
      {
        onSuccess: () => {
          showToast.success(
            anyRefund ? 'Project cancelled — refund recorded' : 'Project cancelled',
          );
          onClose();
        },
        onError: (error) => showToast.error(getErrorMessage(error)),
      },
    );
  };

  const save = useGatedAction('projects.edit', handleSubmit, 'Cancel project');

  return (
    <MUIDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !cancelMutation.isPending) onClose();
      }}
      size="default"
      disableEscapeKeyDown={cancelMutation.isPending}
    >
      <MUIDialogHeader hideCloseButton={cancelMutation.isPending}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: '50%',
              bgcolor: 'error.light',
              flexShrink: 0,
            }}
          >
            <ErrorOutlineIcon sx={{ color: 'error.main', fontSize: 20 }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <MUIDialogTitle>Cancel project</MUIDialogTitle>
            <MUIDialogDescription>
              {projectNumber ? `${projectNumber}. ` : ''}Reverses everything reversible; anything
              already at site becomes a return to resolve afterwards.
            </MUIDialogDescription>
          </Box>
        </Box>
      </MUIDialogHeader>

      <MUIDialogBody>
        <Stack spacing={2.5}>
          <MUISelect
            fieldLabel="Loss reason"
            required
            placeholder="Select a reason"
            value={lossReason}
            onChange={(event) => setLossReason(event.target.value as LossReason)}
            disabled={cancelMutation.isPending}
            options={Object.values(LossReason).map((value) => ({
              value,
              label: LOSS_REASON_LABELS[value],
            }))}
          />

          <MUIInput
            fieldLabel="Note"
            required
            multiline
            minRows={2}
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            disabled={cancelMutation.isPending}
            placeholder="What happened — enough detail to make sense of this later"
          />

          <Box>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
              The roof
            </Typography>
            <SegmentedToggle
              ariaLabel="What happens to the roof"
              value={propertyOutcome}
              onChange={setPropertyOutcome}
              options={PROPERTY_OUTCOME_OPTIONS}
            />
          </Box>

          {lines.length > 0 && (
            <>
              <Divider />
              <Box>
                <Typography variant="subtitle2" fontWeight={600}>
                  Settlement
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mb: 1.5 }}
                >
                  What to keep from what each payer already sent. The rest is refunded.
                </Typography>
                <Stack spacing={2}>
                  {parsedLines.map((line) => (
                    <MUIInput
                      key={line.payerType}
                      fieldLabel={`${PAYER_LABELS[line.payerType]} — collected ${formatPaise(line.collectedPaise)}`}
                      inputMode="decimal"
                      value={keptText[line.payerType] ?? ''}
                      onChange={(event) =>
                        setKeptText((current) => ({
                          ...current,
                          [line.payerType]: event.target.value,
                        }))
                      }
                      disabled={cancelMutation.isPending}
                      error={!line.parsed.ok ? line.parsed.message : undefined}
                    />
                  ))}
                </Stack>
              </Box>
            </>
          )}
        </Stack>
      </MUIDialogBody>

      <MUIDialogFooter>
        <Button variant="outline" onClick={onClose} disabled={cancelMutation.isPending}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={save.onGatedClick}
          aria-disabled={!save.allowed}
          disabled={!canSubmit || cancelMutation.isPending}
        >
          {cancelMutation.isPending ? 'Cancelling…' : 'Cancel project'}
        </Button>
      </MUIDialogFooter>
    </MUIDialog>
  );
}
