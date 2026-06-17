'use client';

import { PAYMENT_TERM_STATUS_LABELS } from '@tejas96/shared/constants';
import { PaymentTermStatus } from '@tejas96/shared/types';
import { DollarSign } from 'lucide-react';
import Link from 'next/link';
import type { JSX } from 'react';

import { type ProjectDetail } from '../../../../hooks';

import { Button, Skeleton } from '@/components/ui';
import { type ReceiptSummaryTerm, useProjectReceiptSummary } from '@/lib/hooks/resources';
import { formatCurrency } from '@/lib/utils/format';

interface OverviewFinancialsProps {
  project: ProjectDetail;
  projectId: string;
  projectPath: string;
  isActive: boolean;
}

/**
 * Visual classification per payment term, derived from backend status
 * plus the paid-vs-expected ratio. We intentionally treat
 * `paidAmount > 0 && status !== 'paid'` as "partial" so a term that is
 * still pending but has received an under-amount receipt reads as
 * in-progress on the bar.
 */
type TermDisplayKind = 'paid' | 'partial' | 'pending' | 'overdue' | 'waived' | 'cancelled';

function classifyTerm(term: ReceiptSummaryTerm): TermDisplayKind {
  if (term.status === PaymentTermStatus.PAID) return 'paid';
  if (term.status === PaymentTermStatus.WAIVED) return 'waived';
  if (term.status === PaymentTermStatus.CANCELLED) return 'cancelled';
  const remaining = Math.max(0, term.expectedAmount - term.paidAmount);
  const isOverdue =
    term.dueDate != null && new Date(term.dueDate).getTime() < Date.now() && remaining > 0;
  if (isOverdue) return 'overdue';
  if (term.paidAmount > 0) return 'partial';
  return 'pending';
}

function segmentClasses(kind: TermDisplayKind): { bg: string; text: string } {
  switch (kind) {
    case 'paid':
      return { bg: 'bg-success', text: 'text-white' };
    case 'partial':
      return {
        bg: 'bg-[repeating-linear-gradient(45deg,#fef3c7,#fef3c7_8px,#fde68a_8px,#fde68a_16px)]',
        text: 'text-amber-800',
      };
    case 'overdue':
      return { bg: 'bg-error/70', text: 'text-white' };
    case 'waived':
    case 'cancelled':
      return { bg: 'bg-gray-300/60', text: 'text-foreground-secondary line-through' };
    case 'pending':
    default:
      return { bg: 'bg-gray-200', text: 'text-foreground-secondary' };
  }
}

export function OverviewFinancials({
  project,
  projectId,
  projectPath,
  isActive,
}: OverviewFinancialsProps): JSX.Element {
  const { data: summary, isPending: summaryPending } = useProjectReceiptSummary(projectId, {
    enabled: isActive,
  });

  if (isActive && summaryPending) {
    return <Skeleton className="h-[340px] rounded-xl" />;
  }

  const totalExpected = summary?.totals.totalExpected ?? 0;
  const totalPaid = summary?.totals.totalReceived ?? 0;
  const pendingAmount = summary?.totals.pending ?? Math.max(totalExpected - totalPaid, 0);
  const paidPct = totalExpected > 0 ? (totalPaid / totalExpected) * 100 : 0;
  const financeTabHref = `${projectPath}?tab=finance`;
  const receiptsTabHref = `${projectPath}?tab=finance&sub=receipts`;
  const paymentCount = summary?.totals.receiptCount ?? 0;
  const hasPaymentData = totalExpected > 0;
  const overdueCount = summary?.overdueCount ?? 0;
  // Next due term — server already orders terms by displayOrder ASC and
  // tags `nextDueTermId` based on dueDate / status, so we can resolve it
  // with a single lookup rather than re-implementing the ranking here.
  const nextDueTerm = summary?.nextDueTermId
    ? summary.terms.find((t) => t.id === summary.nextDueTermId)
    : undefined;

  // Payment-term segments — each term gets a slice of the bar weighted
  // by its expected amount so the visual total matches the contract
  // value the user sees in the header. Equal-width fallback when totals
  // are zero (shouldn't happen, but guards a div-by-zero).
  const sortedTerms = summary?.terms
    ? [...summary.terms].sort((a, b) => a.displayOrder - b.displayOrder)
    : [];
  const termCount = sortedTerms.length;
  const equalSegPct = termCount > 0 ? 100 / termCount : 0;
  const incompleteTermCount = sortedTerms.filter(
    (t) =>
      t.status !== PaymentTermStatus.PAID &&
      t.status !== PaymentTermStatus.WAIVED &&
      t.status !== PaymentTermStatus.CANCELLED,
  ).length;

  const estimatedCost = project.estimatedCost;
  const actualCost = project.actualCost;
  const hasMarginData =
    estimatedCost != null &&
    estimatedCost > 0 &&
    actualCost != null &&
    actualCost > 0 &&
    totalExpected > 0;
  const margin = hasMarginData ? totalExpected - actualCost : undefined;

  return (
    <section className="rounded-xl border border-border-light/70 bg-card p-5 shadow-card">
      <div className="space-y-4">
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-1">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
            <DollarSign className="size-4 text-success" />
            Financials
          </p>
          {hasPaymentData && (
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-foreground-secondary">Contract Value</span>
              <span className="text-[15px] font-bold text-foreground">
                {formatCurrency(totalExpected)}
              </span>
            </div>
          )}
        </div>

        {/* ── Payment-term progress bar ── one segment per term, width
            weighted by the term's share of the contract value so the
            bar visually mirrors the Finance tab. Falls back to a simple
            paid-vs-remaining bar when no terms are defined. */}
        {hasPaymentData && termCount > 0 ? (
          <div>
            <div className="flex h-10 overflow-hidden rounded-lg border border-border-light bg-muted">
              {sortedTerms.map((term, idx) => {
                const kind = classifyTerm(term);
                const { bg, text } = segmentClasses(kind);
                const widthPct =
                  totalExpected > 0 ? (term.expectedAmount / totalExpected) * 100 : equalSegPct;
                const remaining = Math.max(0, term.expectedAmount - term.paidAmount);
                const tooltip =
                  `${term.name} — ${PAYMENT_TERM_STATUS_LABELS[term.status] ?? term.status}` +
                  ` · ${formatCurrency(term.paidAmount)} / ${formatCurrency(term.expectedAmount)}${
                    kind === 'overdue' ? ` · ${formatCurrency(remaining)} overdue` : ''
                  }`;
                const showLabel = widthPct >= 12;
                return (
                  <div
                    key={term.id}
                    className={`flex items-center justify-center text-[11px] font-semibold ${bg} ${text} ${idx < termCount - 1 ? 'border-r border-white/30' : ''}`}
                    style={{ width: `${widthPct}%` }}
                    title={tooltip}
                  >
                    {showLabel && (
                      <span>
                        {kind === 'paid'
                          ? '✓'
                          : kind === 'partial'
                            ? `${Math.round((term.paidAmount / term.expectedAmount) * 100)}%`
                            : kind === 'overdue'
                              ? 'Overdue'
                              : kind === 'waived'
                                ? 'Waived'
                                : `${Math.round(widthPct)}%`}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-1 flex text-[10px] text-foreground-tertiary px-0.5">
              {sortedTerms.map((term) => {
                const widthPct =
                  totalExpected > 0 ? (term.expectedAmount / totalExpected) * 100 : equalSegPct;
                return (
                  <span
                    key={term.id}
                    className="truncate text-center"
                    style={{ width: `${widthPct}%` }}
                    title={term.name}
                  >
                    {term.name}
                  </span>
                );
              })}
            </div>
          </div>
        ) : hasPaymentData ? (
          <div>
            <div className="flex h-10 overflow-hidden rounded-lg border border-border-light bg-muted">
              <div
                className="flex items-center justify-center bg-success text-[11px] font-semibold text-white"
                style={{ width: `${paidPct}%` }}
              >
                {paidPct > 8 ? `${Math.round(paidPct)}%` : ''}
              </div>
              <div
                className="flex items-center justify-center bg-gray-200 text-[11px] font-semibold text-foreground-secondary"
                style={{ width: `${Math.max(0, 100 - paidPct)}%` }}
              >
                {100 - paidPct > 8 ? `${Math.round(100 - paidPct)}%` : ''}
              </div>
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-foreground-tertiary px-0.5">
              <span>Received</span>
              <span>Remaining</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-foreground-secondary">No payment data available yet.</p>
        )}

        {/* ── Amount breakdown grid (UX: 4 cards) ── */}
        {hasPaymentData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Received */}
            <div className="rounded-lg border border-border-light p-3 bg-success/5">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="size-1.5 rounded-full bg-success" />
                <span className="text-[10px] font-medium uppercase text-success">Received</span>
              </div>
              <p className="text-[17px] font-semibold text-foreground leading-none">
                {formatCurrency(totalPaid)}
              </p>
              <p className="mt-1 text-[10px] text-foreground-secondary">
                {paymentCount} payment{paymentCount !== 1 ? 's' : ''} · {Math.round(paidPct)}%
              </p>
            </div>

            {/* Due Now — driven by the next outstanding payment term so
                this card now matches what the Finance tab shows. Falls
                back to the active milestone for projects that don't yet
                have any terms. */}
            <div className="rounded-lg border border-warning/30 p-3 bg-warning/5">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="size-1.5 rounded-full bg-warning" />
                <span className="text-[10px] font-medium uppercase text-warning">Due Now</span>
              </div>
              {nextDueTerm ? (
                <>
                  <p className="text-[17px] font-semibold text-warning leading-none">
                    {formatCurrency(
                      Math.max(0, nextDueTerm.expectedAmount - nextDueTerm.paidAmount),
                    )}
                  </p>
                  <p className="mt-1 text-[10px] text-warning font-medium truncate">
                    {nextDueTerm.name}
                    {overdueCount > 0 ? ` · ${overdueCount} overdue` : ''}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[17px] font-semibold text-foreground-secondary leading-none">
                    —
                  </p>
                  <p className="mt-1 text-[10px] text-foreground-secondary">
                    {totalPaid >= totalExpected && totalExpected > 0
                      ? 'All terms collected'
                      : 'No outstanding term'}
                  </p>
                </>
              )}
            </div>

            {/* Pending */}
            <div className="rounded-lg border border-border-light p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="size-1.5 rounded-full bg-foreground-tertiary" />
                <span className="text-[10px] font-medium uppercase text-foreground-secondary">
                  Pending
                </span>
              </div>
              <p className="text-[17px] font-semibold text-foreground leading-none">
                {formatCurrency(pendingAmount)}
              </p>
              <p className="mt-1 text-[10px] text-foreground-secondary">
                {incompleteTermCount > 0
                  ? `${incompleteTermCount} term${incompleteTermCount !== 1 ? 's' : ''} left`
                  : 'All terms cleared'}
              </p>
            </div>

            {/* 4th card — Margin or collection % */}
            {hasMarginData ? (
              <div className="rounded-lg border border-secondary/20 p-3 bg-secondary/5">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="size-1.5 rounded-full bg-secondary" />
                  <span className="text-[10px] font-medium uppercase text-secondary">Margin</span>
                </div>
                <p
                  className={`text-[17px] font-semibold leading-none ${margin != null && margin >= 0 ? 'text-success' : 'text-error'}`}
                >
                  {margin != null && margin >= 0 ? '+' : ''}
                  {formatCurrency(margin ?? 0)}
                </p>
                <p className="mt-1 text-[10px] text-secondary font-medium">Revenue − Cost</p>
              </div>
            ) : (
              <div className="rounded-lg border border-border-light p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="size-1.5 rounded-full bg-info" />
                  <span className="text-[10px] font-medium uppercase text-info">Collected</span>
                </div>
                <p className="text-[17px] font-semibold text-foreground leading-none">
                  {Math.round(paidPct)}%
                </p>
                <p className="mt-1 text-[10px] text-foreground-secondary">
                  of {formatCurrency(totalExpected)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Footer: Cost facts + actions ── */}
        <div className="flex items-center justify-between pt-3 border-t border-border-light">
          {estimatedCost || actualCost ? (
            <div className="flex items-center gap-4 text-[11px]">
              {estimatedCost != null && estimatedCost > 0 && (
                <div>
                  <span className="text-foreground-secondary">Est. Cost: </span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(estimatedCost)}
                  </span>
                </div>
              )}
              {actualCost != null && actualCost > 0 && (
                <div>
                  <span className="text-foreground-secondary">Actual: </span>
                  <span className="font-medium text-foreground">{formatCurrency(actualCost)}</span>
                </div>
              )}
              {hasMarginData && margin != null && (
                <div>
                  <span className="text-foreground-secondary">Margin: </span>
                  <span className={`font-semibold ${margin >= 0 ? 'text-success' : 'text-error'}`}>
                    {margin >= 0 ? '+' : ''}
                    {formatCurrency(margin)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={financeTabHref}>View Terms</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={receiptsTabHref}>Record Receipt</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
