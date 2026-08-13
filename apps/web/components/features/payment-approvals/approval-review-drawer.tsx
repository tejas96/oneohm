'use client';

import CloseIcon from '@mui/icons-material/Close';
import {
  Alert,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { type JSX, useEffect, useState } from 'react';

import { MUIStatusChip, MUITypography } from '@/components/ui';
import {
  useApprovalImpact,
  useApprovalMutations,
  usePaymentApproval,
} from '@/lib/hooks/resources/payment-approvals';
import { formatPaise } from '@/lib/utils/paise';
import { useAuth } from '@/providers/auth-provider';

export interface ApprovalReviewDrawerProps {
  approvalId: string | null;
  onClose: () => void;
}

const KIND_LABEL = {
  receipt: 'Money received',
  expense: 'Money spent',
  reversal: 'Reversal',
} as const;

/**
 * Where verification actually happens.
 *
 * Shows the claim, the customer's own evidence, and what approving would settle
 * — so the approver sees the consequence before agreeing to it rather than
 * discovering it afterwards.
 */
export function ApprovalReviewDrawer({
  approvalId,
  onClose,
}: ApprovalReviewDrawerProps): JSX.Element {
  const { user } = useAuth();
  const { data, isLoading } = usePaymentApproval(approvalId);
  const impact = useApprovalImpact(approvalId);
  const { approve, reject } = useApprovalMutations();
  const [reason, setReason] = useState('');

  // A reason typed for one request must not survive into the next.
  useEffect(() => setReason(''), [approvalId]);

  const isOwn = Boolean(data && user && data.submittedBy === user.id);
  const isPending = data?.status === 'pending';
  const busy = approve.isPending || reject.isPending;

  return (
    <Drawer anchor="right" open={Boolean(approvalId)} onClose={onClose}>
      <Box sx={{ width: { xs: '100vw', sm: 460 }, p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <MUITypography variant="drawerTitle">{data?.requestNo ?? 'Review'}</MUITypography>
          <IconButton onClick={onClose} size="small" aria-label="Close">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        {isLoading || !data ? (
          <Typography sx={{ mt: 3 }}>Loading…</Typography>
        ) : (
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <MUIStatusChip label={data.status} colorSeed={data.status} size="small" />
              <Typography variant="body2">{KIND_LABEL[data.kind]}</Typography>
            </Stack>

            <Box>
              <Typography sx={{ fontSize: '1.5rem', fontWeight: 600 }}>
                {formatPaise(Math.abs(data.amountPaise))}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Paid on {data.valueDate}
                {data.paymentMethod ? ` · ${data.paymentMethod}` : ''}
                {data.reference ? ` · ${data.reference}` : ''}
              </Typography>
            </Box>

            {data.notes ? <Typography variant="body2">{data.notes}</Typography> : null}

            {data.possibleDuplicates && data.possibleDuplicates.length > 0 && (
              <Alert severity="warning">
                {data.possibleDuplicates.length} other payment
                {data.possibleDuplicates.length === 1 ? '' : 's'} with the same amount and date
                exist{data.possibleDuplicates.length === 1 ? 's' : ''} for this project. Check this
                is not a double entry.
              </Alert>
            )}

            {data.proofDocumentId ? (
              <Alert severity="success">Proof of payment attached.</Alert>
            ) : (
              <Alert severity="info">
                No proof of payment was attached. Confirm by another means before approving.
              </Alert>
            )}

            {impact.data && impact.data.lines.length > 0 && (
              <>
                <Divider />
                <Box>
                  <MUITypography variant="sectionTitle">If approved, this settles</MUITypography>
                  <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                    {impact.data.lines.map((line) => (
                      <Typography key={line.milestoneId} variant="body2">
                        {line.milestoneName}: {formatPaise(line.appliedPaise)}
                        {line.settlesFully
                          ? ' — fully settled'
                          : ` — ${formatPaise(line.balanceAfterPaise)} still due`}
                      </Typography>
                    ))}
                  </Stack>
                  {impact.data.unallocatedPaise > 0 && (
                    <Alert severity="info" sx={{ mt: 1 }}>
                      {formatPaise(impact.data.unallocatedPaise)} is more than is currently due and
                      will be held as credit against future milestones.
                    </Alert>
                  )}
                </Box>
              </>
            )}

            <Divider />

            {isOwn && isPending && (
              <Alert severity="info">
                You submitted this payment — another user must approve it.
              </Alert>
            )}

            {isPending && !isOwn && (
              <Stack spacing={2}>
                <Button
                  variant="contained"
                  color="success"
                  disabled={busy}
                  onClick={() => approve.mutate(data.id, { onSuccess: onClose })}
                >
                  Approve — this updates the balance
                </Button>

                <TextField
                  label="Reason for rejection"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  multiline
                  minRows={2}
                  size="small"
                  helperText="Rejection is final — a corrected payment is entered as a new record."
                />
                <Button
                  variant="outlined"
                  color="error"
                  disabled={busy || reason.trim().length < 3}
                  onClick={() => reject.mutate({ id: data.id, reason }, { onSuccess: onClose })}
                >
                  Reject
                </Button>
              </Stack>
            )}

            {data.status === 'rejected' && (
              <Alert severity="error">Rejected: {data.rejectionReason}</Alert>
            )}
            {data.status === 'approved' && (
              <Alert severity="success">
                Approved — posted to the ledger and counted in the balance.
              </Alert>
            )}
            {data.status === 'cancelled' && (
              <Alert severity="info">Withdrawn by the person who submitted it.</Alert>
            )}
          </Stack>
        )}
      </Box>
    </Drawer>
  );
}
