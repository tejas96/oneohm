'use client';

import { PaymentTransactionStatus } from '@oneohm-epc/shared/types';
import { ChevronDown, ChevronRight, Download, MoreHorizontal, Trash2 } from 'lucide-react';
import React, { useState, type JSX } from 'react';

import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui';
import { type PaymentTerm, type Receipt, useReceiptMutations } from '@/lib/hooks/resources';
import { formatCurrency, formatDate } from '@/lib/utils';

import { PAYMENT_STATUS_LABELS } from '../../projects/constants';
import { RECEIPT_NEXT_STATUSES, RECEIPT_STATUS_BADGE_VARIANT } from '../constants';
import { useFinancePdf } from '../hooks/use-finance-pdf';

interface ReceiptsTableProps {
  receipts: Receipt[];
  terms: PaymentTerm[];
  projectId: string;
}

function maskAccountNumber(account?: string | null): string | undefined {
  if (!account || account.length < 4) return account ?? undefined;
  return `••••${account.slice(-4)}`;
}

function DetailItem({ label, value }: { label: string; value?: string | null }): JSX.Element | null {
  if (!value) return null;
  return (
    <div>
      <span className="text-2xs text-foreground-muted uppercase">{label}</span>
      <p className="text-xs text-foreground mt-0.5">{value}</p>
    </div>
  );
}

export function ReceiptsTable({ receipts, terms, projectId }: ReceiptsTableProps): JSX.Element {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const { updateStatus, remove } = useReceiptMutations(projectId);
  const { printReceipt, isReady: pdfReady } = useFinancePdf(projectId);

  const termById = new Map(terms.map((t) => [t.id, t]));

  const handleDelete = (id: string): void => {
    if (confirmDeleteId === id) {
      remove.mutate(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      window.setTimeout(() => setConfirmDeleteId((cur) => (cur === id ? null : cur)), 4000);
    }
  };

  return (
    <div className="rounded-lg border border-border-light overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-muted/50">
            <th className="w-6 px-2 py-2" />
            <th className="text-2xs font-medium text-foreground-muted uppercase text-left px-3 py-2">
              Date
            </th>
            <th className="text-2xs font-medium text-foreground-muted uppercase text-left px-3 py-2">
              Number
            </th>
            <th className="text-2xs font-medium text-foreground-muted uppercase text-left px-3 py-2">
              Term
            </th>
            <th className="text-2xs font-medium text-foreground-muted uppercase text-right px-3 py-2">
              Amount
            </th>
            <th className="text-2xs font-medium text-foreground-muted uppercase text-left px-3 py-2">
              Method
            </th>
            <th className="text-2xs font-medium text-foreground-muted uppercase text-left px-3 py-2">
              Status
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
                        <ChevronDown className="size-3.5" />
                      ) : (
                        <ChevronRight className="size-3.5" />
                      ))}
                  </td>
                  <td className="text-xs text-foreground px-3 py-2.5">
                    {formatDate(receipt.createdAt, 'medium')}
                  </td>
                  <td className="text-xs text-foreground font-mono px-3 py-2.5">
                    {receipt.paymentNumber}
                  </td>
                  <td className="text-xs text-foreground-secondary px-3 py-2.5">
                    {linkedTerm ? linkedTerm.name : <span className="italic">Advance</span>}
                  </td>
                  <td className="text-xs text-foreground font-medium text-right px-3 py-2.5">
                    {formatCurrency(receipt.paidAmount)}
                  </td>
                  <td className="text-xs text-foreground px-3 py-2.5 capitalize">
                    {receipt.paymentMethod?.replace(/_/g, ' ') ?? '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge
                      variant={
                        (RECEIPT_STATUS_BADGE_VARIANT[receipt.status] ?? 'secondary') as 'success'
                      }
                      size="xs"
                    >
                      {PAYMENT_STATUS_LABELS[receipt.status] ?? receipt.status}
                    </Badge>
                  </td>
                  <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost" aria-label="Receipt actions">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          disabled={!pdfReady}
                          onClick={() => void printReceipt(receipt, linkedTerm ?? null)}
                        >
                          <Download className="size-3.5 mr-2" />
                          Download PDF
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {nextStatuses.length === 0 && (
                          <DropdownMenuItem disabled>No transitions available</DropdownMenuItem>
                        )}
                        {nextStatuses.map((next) => (
                          <DropdownMenuItem
                            key={next}
                            disabled={updateStatus.isPending}
                            onClick={() =>
                              updateStatus.mutate({ id: receipt.id, payload: { status: next } })
                            }
                          >
                            Mark {PAYMENT_STATUS_LABELS[next] ?? next}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(receipt.id)}
                          disabled={remove.isPending || isTerminal}
                          className="text-error"
                        >
                          <Trash2 className="size-3.5 mr-2" />
                          {confirmDeleteId === receipt.id
                            ? 'Click again to confirm'
                            : 'Delete'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
    </div>
  );
}
