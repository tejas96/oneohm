'use client';

import { type JSX } from 'react';

import { Skeleton } from '@/components/ui';
import { type ReceiptProjectSummary } from '@/lib/hooks/resources';
import { formatCurrency } from '@/lib/utils';

interface FinanceSummaryStripProps {
  summary: ReceiptProjectSummary | undefined;
  isLoading: boolean;
}

function SummaryCard({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'warning' | 'error';
}): JSX.Element {
  const toneClasses: Record<string, string> = {
    default: 'text-foreground',
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error',
  };
  return (
    <div className="rounded-lg border border-border-light bg-background-secondary p-3">
      <p className="text-2xs text-foreground-secondary">{label}</p>
      <p className={`text-sm font-semibold mt-0.5 ${toneClasses[tone]}`}>{value}</p>
    </div>
  );
}

export function FinanceSummaryStrip({
  summary,
  isLoading,
}: FinanceSummaryStripProps): JSX.Element {
  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
    );
  }

  const { totals, overdueCount } = summary;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <SummaryCard label="Total Expected" value={formatCurrency(totals.totalExpected)} />
      <SummaryCard label="Total Received" value={formatCurrency(totals.totalReceived)} tone="success" />
      <SummaryCard
        label="Pending"
        value={formatCurrency(totals.pending)}
        tone={totals.pending > 0 ? 'warning' : 'default'}
      />
      <SummaryCard
        label="Overdue Terms"
        value={String(overdueCount)}
        tone={overdueCount > 0 ? 'error' : 'default'}
      />
    </div>
  );
}
