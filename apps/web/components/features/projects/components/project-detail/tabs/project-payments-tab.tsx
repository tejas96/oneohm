'use client';

import { Banknote, ChevronDown, ChevronRight } from 'lucide-react';
import React, { useState } from 'react';

import {
  PAYMENT_STATUS_BADGE_VARIANT,
  PAYMENT_STATUS_LABELS,
} from '../../../constants';
import type { ProjectPayment } from '../../../hooks/types';
import { useProjectPayments, useProjectPaymentSummary } from '../../../hooks/use-project-payments';

import { EmptyState, ErrorState } from '@/components/shared/feedback/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { showToast } from '@/components/ui/sonner';
import { getErrorMessage } from '@/lib/utils/error';
import { formatCurrency, formatDate } from '@/lib/utils/format';


interface ProjectPaymentsTabProps {
  projectId: string;
  isActive: boolean;
}

function maskAccountNumber(account?: string): string {
  if (!account || account.length < 4) return '••••';
  return `••••${account.slice(-4)}`;
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border-light bg-background-secondary p-3">
      <p className="text-2xs text-foreground-secondary">{label}</p>
      <p className="text-sm font-semibold text-foreground mt-0.5">{value}</p>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-2xs text-foreground-muted uppercase">{label}</span>
      <p className="text-xs text-foreground mt-0.5">{value}</p>
    </div>
  );
}

function PaymentHistoryTable({ payments }: { payments: ProjectPayment[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div>
      <h3 className="text-xs font-semibold text-foreground mb-3">Payment History</h3>
      <div className="rounded-lg border border-border-light overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50">
              <th className="w-6 px-2 py-2" />
              <th className="text-2xs font-medium text-foreground-muted uppercase text-left px-3 py-2">Date</th>
              <th className="text-2xs font-medium text-foreground-muted uppercase text-left px-3 py-2">Number</th>
              <th className="text-2xs font-medium text-foreground-muted uppercase text-right px-3 py-2">Expected</th>
              <th className="text-2xs font-medium text-foreground-muted uppercase text-right px-3 py-2">Paid</th>
              <th className="text-2xs font-medium text-foreground-muted uppercase text-left px-3 py-2">Method</th>
              <th className="text-2xs font-medium text-foreground-muted uppercase text-left px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {payments.map((payment) => {
              const isExpanded = expandedId === payment.id;
              const hasDetails =
                payment.paymentReference ||
                payment.transactionId ||
                payment.bankName ||
                payment.accountNumber ||
                payment.ifscCode ||
                payment.notes ||
                payment.reconciledAt;

              return (
                <React.Fragment key={payment.id}>
                  <tr
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() =>
                      hasDetails && setExpandedId(isExpanded ? null : payment.id)
                    }
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
                      {formatDate(payment.createdAt, 'medium')}
                    </td>
                    <td className="text-xs text-foreground font-mono px-3 py-2.5">
                      {payment.paymentNumber}
                    </td>
                    <td className="text-xs text-foreground text-right px-3 py-2.5">
                      {formatCurrency(payment.expectedAmount)}
                    </td>
                    <td className="text-xs text-foreground font-medium text-right px-3 py-2.5">
                      {formatCurrency(payment.paidAmount)}
                    </td>
                    <td className="text-xs text-foreground px-3 py-2.5 capitalize">
                      {payment.paymentMethod?.replace(/_/g, ' ') ?? '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge
                        variant={
                          (PAYMENT_STATUS_BADGE_VARIANT[payment.status] ??
                            'secondary') as 'success'
                        }
                        size="xs"
                      >
                        {PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}
                      </Badge>
                    </td>
                  </tr>

                  {isExpanded && hasDetails && (
                    <tr>
                      <td colSpan={7} className="bg-muted/20 px-6 py-3">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                          <DetailItem label="Reference" value={payment.paymentReference} />
                          <DetailItem label="Transaction ID" value={payment.transactionId} />
                          <DetailItem label="Bank" value={payment.bankName} />
                          <DetailItem
                            label="Account"
                            value={
                              payment.accountNumber
                                ? maskAccountNumber(payment.accountNumber)
                                : undefined
                            }
                          />
                          <DetailItem label="IFSC" value={payment.ifscCode} />
                          <DetailItem
                            label="Reconciled"
                            value={
                              payment.reconciledAt
                                ? formatDate(payment.reconciledAt, 'medium')
                                : undefined
                            }
                          />
                          <DetailItem label="Notes" value={payment.notes} />
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
    </div>
  );
}

export const ProjectPaymentsTab = React.memo(({
  projectId,
  isActive,
}: ProjectPaymentsTabProps): React.JSX.Element => {
  const { data: payments, isLoading, isError, error, refetch } = useProjectPayments(projectId, { enabled: isActive });
  const { data: summary } = useProjectPaymentSummary(projectId, { enabled: isActive });

  if (isLoading && isActive) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load payments"
        description={getErrorMessage(error)}
        onRetry={() => refetch()}
      />
    );
  }

  if (!payments || payments.length === 0) {
    return (
      <EmptyState
        icon={<Banknote className="w-full h-full" />}
        iconColor="muted"
        title="No payments recorded"
        description="Payment records will appear here once transactions are added."
        action={{
          label: 'Upload Payment',
          onClick: () => showToast.info('Coming Soon'),
        }}
      />
    );
  }

  const pending = summary?.pendingAmount ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Payments</h3>
        <Button size="sm" onClick={() => showToast.info('Coming Soon')}>
          + Record Payment
        </Button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard label="Total Expected" value={formatCurrency(summary.totalExpected)} />
          <SummaryCard label="Total Paid" value={formatCurrency(summary.totalPaid)} />
          <SummaryCard label="Pending" value={formatCurrency(summary.pendingAmount)} />
          <SummaryCard label="Transactions" value={String(summary.paymentCount)} />
        </div>
      )}

      <PaymentHistoryTable payments={payments} />

      {pending > 0 && (
        <div className="rounded-lg bg-warning/10 border border-warning/20 p-3 flex items-center justify-between">
          <span className="text-xs font-medium text-warning">
            Pending Amount: <span className="font-semibold text-foreground">{formatCurrency(pending)}</span>
          </span>
          <button
            type="button"
            onClick={() => showToast.info('Coming Soon')}
            className="px-3 py-1.5 text-xs font-medium text-white bg-warning hover:bg-warning/90 rounded-lg cursor-pointer"
          >
            Upload Payment
          </button>
        </div>
      )}
    </div>
  );
});
