'use client';

import CloseIcon from '@mui/icons-material/Close';
import {
  Alert,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  Link as MUILink,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import NextLink from 'next/link';
import { type JSX, useEffect, useState } from 'react';

import { useAutoFileApprovedReceipts } from './hooks/use-auto-file-receipts';

import { MUIStatusChip, MUITypography } from '@/components/ui';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import {
  useApprovalImpact,
  useApprovalMutations,
  usePaymentApproval,
} from '@/lib/hooks/resources/payment-approvals';
import { useAccessDialog, useCan } from '@/lib/rbac';
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
  vendor_payment: 'Vendor payment',
} as const;

/**
 * What the duplicate warning calls the other requests. The server only matches
 * the same kind, so "payment" was the wrong word for an expense or a bill.
 */
const DUPLICATE_NOUN = {
  receipt: 'payment',
  expense: 'expense',
  reversal: 'reversal',
  vendor_payment: 'vendor payment',
} as const;

/** "a bill on credit from Sharma Traders", "a payment to Sharma Traders", "an expense". */
function describeReversed(data: {
  reversesEntryType?: string | null;
  reversesIsCash?: boolean | null;
  reversesVendorName?: string | null;
}): string {
  const vendor = data.reversesVendorName ?? 'a vendor';
  if (data.reversesEntryType === 'vendor_payment') return `a payment to ${vendor}`;
  if (data.reversesIsCash === false) return `a bill on credit from ${vendor}`;
  if (data.reversesEntryType === 'receipt') return 'a customer receipt';
  if (data.reversesEntryType === 'refund') return 'a refund';
  return 'an expense';
}

/**
 * Same "Advance" wording as the Payables page (`payables-columns.tsx`) — a
 * negative payable is never shown as a red debt, so one concept keeps one
 * name everywhere it appears. Applies to both `beforePaise` and `afterPaise`:
 * either can be negative, and `afterPaise` going negative when `beforePaise`
 * was not is exactly the "this payment overshoots what's owed" case the
 * approver needs to see plainly, not as an unexplained minus sign.
 */
function formatVendorPayable(paise: number): string {
  return paise < 0 ? `Advance ${formatPaise(-paise)}` : formatPaise(paise);
}

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
  const { approve, reject, cancel } = useApprovalMutations();
  const autoFileReceipt = useAutoFileApprovedReceipts();
  const [reason, setReason] = useState('');

  // Approving moves money. Kept clickable when blocked so the dialog can say
  // which permission is missing.
  const { can } = useCan();
  const { requestAccess } = useAccessDialog();
  const canProcess = can('finance.approvals.process');

  // A reason typed for one request must not survive into the next.
  useEffect(() => setReason(''), [approvalId]);

  const isOwn = Boolean(data && user && data.submittedBy === user.id);
  const isReversal = data?.kind === 'reversal';
  const isPending = data?.status === 'pending';
  const busy = approve.isPending || reject.isPending || cancel.isPending;

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

            {/* An approver must know which of the two they are signing off:
                this records a debt, or this moves cash right now. */}
            {data.isCredit ? (
              <Alert severity="info">
                On credit · {data.vendorName ?? 'vendor'}. Approving records what we owe. No cash
                moves.
              </Alert>
            ) : null}

            {/* A reversal is signed off on what it undoes and why. A bare amount
                could be anything, and approving it cannot be taken back. */}
            {isReversal ? (
              <Alert severity="warning">
                Undoes {data.reversesEntryNo ?? 'an earlier entry'}, {describeReversed(data)}.
                <br />
                Reason: {data.reversalReason ?? 'none given'}
              </Alert>
            ) : null}

            <Box>
              <Typography sx={{ fontSize: '1.5rem', fontWeight: 600 }}>
                {formatPaise(Math.abs(data.amountPaise))}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {isReversal ? 'Dated' : data.isCredit ? 'Billed on' : 'Paid on'} {data.valueDate}
                {data.paymentMethod ? ` · ${data.paymentMethod}` : ''}
                {data.reference ? ` · ${data.reference}` : ''}
              </Typography>
            </Box>

            {/* Whose money this is. An amount and a UTR cannot be checked
                against a statement without it. */}
            <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, p: 1.5 }}>
              <Typography variant="body2">
                <strong>{data.customerName ?? 'Customer not linked'}</strong>
                {data.customerPhone ? ` · ${data.customerPhone}` : ''}
              </Typography>
              <MUILink
                component={NextLink}
                href={buildRoute(ROUTES.PROJECTS.DETAIL, { id: data.projectId })}
                variant="body2"
              >
                {data.projectNumber ?? 'Open project'}
                {data.projectName ? ` — ${data.projectName}` : ''}
              </MUILink>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Submitted by {data.submittedByName ?? 'unknown'}
                {data.submittedByRoles ? ` (${data.submittedByRoles})` : ''} on{' '}
                {new Date(data.submittedAt).toLocaleDateString()}
              </Typography>
              {/* Only once the row has actually been reviewed — `reviewedAt`
                  is null for both a pending row and one the submitter simply
                  withdrew, neither of which anyone "reviewed". */}
              {data.reviewedAt ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Reviewed by {data.reviewedByName ?? 'unknown'}
                  {data.reviewedByRoles ? ` (${data.reviewedByRoles})` : ''} on{' '}
                  {new Date(data.reviewedAt).toLocaleDateString()}
                </Typography>
              ) : null}
            </Box>

            {data.notes ? <Typography variant="body2">{data.notes}</Typography> : null}

            {data.possibleDuplicates && data.possibleDuplicates.length > 0 && (
              <Alert severity="warning">
                {data.possibleDuplicates.length} other {DUPLICATE_NOUN[data.kind]}
                {data.possibleDuplicates.length === 1 ? '' : 's'} with the same amount and date
                exist{data.possibleDuplicates.length === 1 ? 's' : ''} for this project. Check this
                is not a double entry.
              </Alert>
            )}

            {(data.proofs?.length ?? 0) > 0 ? (
              <Box>
                <MUITypography variant="sectionTitle">
                  Proof of payment ({data.proofs?.length})
                </MUITypography>
                {/* A grid, because several images per payment is ordinary — a
                    cheque photo plus the bank slip, or one screenshot per
                    instalment of a split transfer. */}
                <Box
                  sx={{
                    mt: 1,
                    display: 'grid',
                    gap: 1,
                    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                  }}
                >
                  {data.proofs?.map((proof) =>
                    proof.mimeType?.startsWith('image/') ? (
                      <MUILink
                        key={proof.id}
                        href={proof.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={proof.fileName ?? 'Proof of payment'}
                      >
                        <Box
                          component="img"
                          src={proof.url}
                          alt={proof.fileName ?? 'Proof of payment'}
                          sx={{
                            display: 'block',
                            width: '100%',
                            height: 110,
                            objectFit: 'cover',
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        />
                      </MUILink>
                    ) : (
                      <MUILink
                        key={proof.id}
                        href={proof.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="body2"
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: 110,
                          px: 1,
                          textAlign: 'center',
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        {proof.fileName ?? 'Open attachment'}
                      </MUILink>
                    ),
                  )}
                </Box>
              </Box>
            ) : isReversal ? null : (
              // A reversal has nothing to prove: it undoes an entry already
              // checked when it was approved.
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

            {/* The vendor-payment sibling of the block above: `lines` is
                always empty for `kind === 'vendor_payment'` (a vendor
                payment never allocates against a milestone), so without this
                the drawer would show no consequence preview at all for that
                kind. `afterPaise` is rendered exactly as the server sends it
                — never clamped — because a negative result is the signal
                that this payment pays ahead of what's owed. */}
            {impact.data?.vendorPayable && (
              <>
                <Divider />
                <Box>
                  <MUITypography variant="sectionTitle">
                    {isReversal ? 'If approved' : 'If approved, this settles'}
                  </MUITypography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {impact.data.vendorPayable.vendorName ?? 'This vendor'}&apos;s payable:{' '}
                    {formatVendorPayable(impact.data.vendorPayable.beforePaise)} →{' '}
                    {formatVendorPayable(impact.data.vendorPayable.afterPaise)}
                  </Typography>
                </Box>
              </>
            )}

            <Divider />

            {isOwn && isPending && (
              <Stack spacing={1.5}>
                <Alert severity="info">
                  You submitted this payment — another user must approve it.
                </Alert>
                {/* Withdrawing your own typo should not require asking a
                    colleague to formally reject you. */}
                <Button
                  variant="outlined"
                  disabled={busy}
                  onClick={() => cancel.mutate(data.id, { onSuccess: onClose })}
                >
                  Withdraw this submission
                </Button>
              </Stack>
            )}

            {isPending && !isOwn && (
              <Stack spacing={2}>
                <Button
                  variant="contained"
                  color="success"
                  disabled={busy}
                  aria-disabled={!canProcess}
                  sx={canProcess ? undefined : { opacity: 0.5 }}
                  onClick={() =>
                    canProcess
                      ? approve.mutate(data.id, {
                          onSuccess: (row) => {
                            onClose();
                            // Not awaited: the balance is already updated, and
                            // rendering + uploading the PDF takes a couple of
                            // seconds the approver has no reason to wait through.
                            // Failure is reported on its own toast and never
                            // reopens or blocks this drawer.
                            void autoFileReceipt.fileOne(row);
                          },
                        })
                      : requestAccess('finance.approvals.process', 'Approve payment')
                  }
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
                  aria-disabled={!canProcess}
                  sx={canProcess ? undefined : { opacity: 0.5 }}
                  onClick={() =>
                    canProcess
                      ? reject.mutate({ id: data.id, reason }, { onSuccess: onClose })
                      : requestAccess('finance.approvals.process', 'Reject payment')
                  }
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
