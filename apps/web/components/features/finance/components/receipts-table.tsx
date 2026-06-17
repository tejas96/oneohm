'use client';

import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DownloadIcon from '@mui/icons-material/Download';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import {
  Button,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
} from '@mui/material';
import { PaymentTransactionStatus } from '@tejas96/shared/types';
import React, { useState, type JSX } from 'react';

import { PAYMENT_STATUS_LABELS } from '../../projects/constants';
import { RECEIPT_NEXT_STATUSES, RECEIPT_STATUS_COLOR } from '../constants';
import { useFinancePdf } from '../hooks/use-finance-pdf';

import {
  MUIDialog,
  MUIDialogBody,
  MUIDialogDescription,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
  MUIStatusChip,
  MUITypography,
} from '@/components/ui';
import { type PaymentTerm, type Receipt, useReceiptMutations } from '@/lib/hooks/resources';
import { formatCurrency, formatDate } from '@/lib/utils';

interface ReceiptsTableProps {
  receipts: Receipt[];
  terms: PaymentTerm[];
  projectId: string;
}

function maskAccountNumber(account?: string | null): string | undefined {
  if (!account || account.length < 4) return account ?? undefined;
  return `••••${account.slice(-4)}`;
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}): JSX.Element | null {
  if (!value) return null;
  return (
    <div>
      <MUITypography variant="finePrint" className="text-foreground-muted uppercase block">
        {label}
      </MUITypography>
      <MUITypography variant="body" className="block mt-0.5">
        {value}
      </MUITypography>
    </div>
  );
}

interface ReceiptRowMenuProps {
  receipt: Receipt;
  isTerminal: boolean;
  pdfReady: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  nextStatuses: PaymentTransactionStatus[];
  onDownload: () => void;
  onTransition: (next: PaymentTransactionStatus) => void;
  onDelete: () => void;
}

function ReceiptRowMenu({
  receipt,
  isTerminal,
  pdfReady,
  isUpdating,
  isDeleting,
  nextStatuses,
  onDownload,
  onTransition,
  onDelete,
}: ReceiptRowMenuProps): JSX.Element {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const open = Boolean(anchor);
  const close = (): void => setAnchor(null);

  return (
    <>
      <IconButton
        size="small"
        aria-label={`Receipt ${receipt.paymentNumber} actions`}
        onClick={(e) => setAnchor(e.currentTarget)}
      >
        <MoreHorizIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={open}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          disabled={!pdfReady}
          onClick={() => {
            close();
            onDownload();
          }}
        >
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Download PDF</ListItemText>
        </MenuItem>
        <Divider />
        {nextStatuses.length === 0 && (
          <MenuItem disabled>
            <ListItemText>No transitions available</ListItemText>
          </MenuItem>
        )}
        {nextStatuses.map((next) => (
          <MenuItem
            key={next}
            disabled={isUpdating}
            onClick={() => {
              close();
              onTransition(next);
            }}
          >
            <ListItemText>Mark {PAYMENT_STATUS_LABELS[next] ?? next}</ListItemText>
          </MenuItem>
        ))}
        <Divider />
        <MenuItem
          disabled={isDeleting || isTerminal}
          onClick={() => {
            close();
            onDelete();
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteOutlineIcon fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}

export function ReceiptsTable({ receipts, terms, projectId }: ReceiptsTableProps): JSX.Element {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Receipt | null>(null);
  const { updateStatus, remove } = useReceiptMutations(projectId);
  const { printReceipt, isReady: pdfReady } = useFinancePdf(projectId);

  const termById = new Map(terms.map((t) => [t.id, t]));

  return (
    <div className="rounded-lg border border-border-light overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-muted/50">
            <th className="w-6 px-2 py-2" />
            <th className="text-left px-3 py-2">
              <MUITypography variant="finePrint" className="text-foreground-muted uppercase">
                Date
              </MUITypography>
            </th>
            <th className="text-left px-3 py-2">
              <MUITypography variant="finePrint" className="text-foreground-muted uppercase">
                Number
              </MUITypography>
            </th>
            <th className="text-left px-3 py-2">
              <MUITypography variant="finePrint" className="text-foreground-muted uppercase">
                Term
              </MUITypography>
            </th>
            <th className="text-right px-3 py-2">
              <MUITypography variant="finePrint" className="text-foreground-muted uppercase">
                Amount
              </MUITypography>
            </th>
            <th className="text-left px-3 py-2">
              <MUITypography variant="finePrint" className="text-foreground-muted uppercase">
                Method
              </MUITypography>
            </th>
            <th className="text-left px-3 py-2">
              <MUITypography variant="finePrint" className="text-foreground-muted uppercase">
                Status
              </MUITypography>
            </th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border-light">
          {receipts.map((receipt) => {
            const isExpanded = expandedId === receipt.id;
            const linkedTerm = receipt.paymentTermId ? termById.get(receipt.paymentTermId) : null;
            const hasDetails = Boolean(
              receipt.paymentReference ||
                receipt.transactionId ||
                receipt.bankName ||
                receipt.accountNumber ||
                receipt.ifscCode ||
                receipt.notes ||
                receipt.reconciledAt,
            );
            const nextStatuses = RECEIPT_NEXT_STATUSES[receipt.status] ?? [];
            const isTerminal =
              receipt.status === PaymentTransactionStatus.BOUNCED ||
              receipt.status === PaymentTransactionStatus.REFUNDED;

            return (
              <React.Fragment key={receipt.id}>
                <tr
                  className="hover:bg-muted/30 transition-colors"
                  onClick={() => hasDetails && setExpandedId(isExpanded ? null : receipt.id)}
                  style={{ cursor: hasDetails ? 'pointer' : 'default' }}
                >
                  <td className="px-2 py-2.5 text-foreground-tertiary">
                    {hasDetails &&
                      (isExpanded ? (
                        <ExpandLessIcon sx={{ fontSize: 16 }} />
                      ) : (
                        <ExpandMoreIcon sx={{ fontSize: 16 }} />
                      ))}
                  </td>
                  <td className="px-3 py-2.5">
                    <MUITypography variant="body">
                      {formatDate(receipt.createdAt, 'medium')}
                    </MUITypography>
                  </td>
                  <td className="px-3 py-2.5">
                    <MUITypography variant="body" className="font-mono">
                      {receipt.paymentNumber}
                    </MUITypography>
                  </td>
                  <td className="px-3 py-2.5">
                    {linkedTerm ? (
                      <MUITypography variant="body" className="text-foreground-secondary">
                        {linkedTerm.name}
                      </MUITypography>
                    ) : (
                      <MUITypography variant="placeholder">Advance</MUITypography>
                    )}
                  </td>
                  <td className="text-right px-3 py-2.5">
                    <MUITypography variant="bodyPrimary">
                      {formatCurrency(receipt.paidAmount)}
                    </MUITypography>
                  </td>
                  <td className="px-3 py-2.5">
                    <MUITypography variant="body" className="capitalize">
                      {receipt.paymentMethod?.replace(/_/g, ' ') ?? '—'}
                    </MUITypography>
                  </td>
                  <td className="px-3 py-2.5">
                    <MUIStatusChip
                      label={PAYMENT_STATUS_LABELS[receipt.status] ?? receipt.status}
                      color={RECEIPT_STATUS_COLOR[receipt.status] ?? 'default'}
                      colorSeed={receipt.status}
                    />
                  </td>
                  <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <ReceiptRowMenu
                      receipt={receipt}
                      isTerminal={isTerminal}
                      pdfReady={pdfReady}
                      isUpdating={updateStatus.isPending}
                      isDeleting={remove.isPending}
                      nextStatuses={nextStatuses}
                      onDownload={() => void printReceipt(receipt, linkedTerm ?? null)}
                      onTransition={(next) =>
                        updateStatus.mutate({ id: receipt.id, payload: { status: next } })
                      }
                      onDelete={() => setPendingDelete(receipt)}
                    />
                  </td>
                </tr>

                {isExpanded && hasDetails && (
                  <tr>
                    <td colSpan={8} className="bg-muted/20 px-6 py-3">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        <DetailItem label="Reference" value={receipt.paymentReference} />
                        <DetailItem label="Transaction ID" value={receipt.transactionId} />
                        <DetailItem label="Bank" value={receipt.bankName} />
                        <DetailItem
                          label="Account"
                          value={maskAccountNumber(receipt.accountNumber)}
                        />
                        <DetailItem label="IFSC" value={receipt.ifscCode} />
                        <DetailItem
                          label="Reconciled"
                          value={
                            receipt.reconciledAt
                              ? formatDate(receipt.reconciledAt, 'medium')
                              : undefined
                          }
                        />
                        <DetailItem label="Notes" value={receipt.notes} />
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      <MUIDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        size="sm"
      >
        <MUIDialogHeader>
          <MUIDialogTitle>
            {pendingDelete ? `Delete receipt ${pendingDelete.paymentNumber}?` : 'Delete receipt?'}
          </MUIDialogTitle>
          <MUIDialogDescription>
            {pendingDelete
              ? `This will remove the ${formatCurrency(Number(pendingDelete.paidAmount))} receipt and re-aggregate its linked term. This cannot be undone.`
              : 'This action cannot be undone.'}
          </MUIDialogDescription>
        </MUIDialogHeader>
        <MUIDialogBody>
          <MUITypography variant="body" className="text-foreground-secondary">
            Once deleted, any payment-term progress derived from this receipt will be recomputed
            automatically.
          </MUITypography>
        </MUIDialogBody>
        <MUIDialogFooter>
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => setPendingDelete(null)}
            disabled={remove.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={remove.isPending}
            onClick={() => {
              if (pendingDelete) remove.mutate(pendingDelete.id);
              setPendingDelete(null);
            }}
          >
            {remove.isPending ? 'Deleting…' : 'Delete receipt'}
          </Button>
        </MUIDialogFooter>
      </MUIDialog>
    </div>
  );
}
