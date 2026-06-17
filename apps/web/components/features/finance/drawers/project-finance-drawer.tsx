'use client';

import { PaymentTermStatus } from '@tejas96/shared/types';
import { formatDate } from '@tejas96/shared/utils';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { AmountCell } from '../shared';
import { DrawerShell } from './drawer-shell';

import { MUITypography } from '@/components/ui';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/lib/config/routes';
import {
  type PaymentTerm,
  type ProjectExpense,
  type Receipt,
  useProjectExpenses,
  useProjectReceipts,
  useProjectReceiptSummary,
  usePaymentTerms,
} from '@/lib/hooks/resources';
import { formatCurrency } from '@/lib/utils';

export interface ProjectFinanceDrawerProps {
  open: boolean;
  onClose: () => void;
  projectId: string | null;
  projectNumber?: string;
  projectName?: string;
  customerName?: string;
  /** Stack mode: when true, renders with elevated z-index for "drawer-on-drawer". */
  stacked?: boolean;
}

const ROW_LIMIT = 6;

function StatTile({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'warning' | 'error';
}): React.JSX.Element {
  const toneClass =
    tone === 'success'
      ? 'text-success'
      : tone === 'warning'
        ? 'text-warning'
        : tone === 'error'
          ? 'text-error'
          : 'text-foreground';
  return (
    <div className="border-border-light bg-background-secondary rounded-md border p-2.5">
      <MUITypography variant="finePrint" className="text-foreground-secondary block">
        {label}
      </MUITypography>
      <MUITypography variant="bodyPrimary" className={`mt-0.5 block ${toneClass}`}>
        {value}
      </MUITypography>
    </div>
  );
}

function SectionHeader({ title, count }: { title: string; count?: number }): React.JSX.Element {
  return (
    <div className="mb-2 mt-4 flex items-center justify-between">
      <MUITypography variant="sectionTitle">{title}</MUITypography>
      {count != null && (
        <MUITypography variant="finePrint" className="text-foreground-tertiary">
          {count} total
        </MUITypography>
      )}
    </div>
  );
}

function termToneFromStatus(
  s: PaymentTermStatus,
  isOverdue: boolean,
): 'default' | 'success' | 'warning' | 'error' {
  if (s === PaymentTermStatus.PAID) return 'success';
  if (isOverdue && s !== PaymentTermStatus.WAIVED && s !== PaymentTermStatus.CANCELLED)
    return 'error';
  if (s === PaymentTermStatus.PARTIAL) return 'warning';
  return 'default';
}

/**
 * Project drilldown drawer — opened from any org-finance row that
 * carries a `projectId` (Receipts, Expenses, Outstanding,
 * Profitability, Recent Activity, etc.).
 *
 * Composition: 4 summary tiles + condensed lists of payment terms
 * (top 6 by status priority), receipts (latest 6), expenses (latest
 * 6). "Open Project" deep-links to the existing per-project Finance
 * tab where users can act on the data.
 *
 * V1 scope: read-only here. All mutations live behind the deep-link
 * (`?tab=finance`).
 */
export function ProjectFinanceDrawer({
  open,
  onClose,
  projectId,
  projectNumber,
  projectName,
  customerName,
  stacked = false,
}: ProjectFinanceDrawerProps): React.JSX.Element {
  const router = useRouter();
  const enabled = open && !!projectId;
  const id = projectId ?? '';

  const summaryQ = useProjectReceiptSummary(id, { enabled });
  const termsQ = usePaymentTerms(id, { enabled });
  const receiptsQ = useProjectReceipts(id, { enabled });
  const expensesQ = useProjectExpenses(id, {}, { enabled });

  const totals = summaryQ.data?.totals;
  const overdue = summaryQ.data?.overdueCount ?? 0;

  const sortedTerms = React.useMemo<PaymentTerm[]>(() => {
    const all = termsQ.data ?? [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const score = (t: PaymentTerm): number => {
      const overdue =
        !!t.dueDate &&
        t.status !== PaymentTermStatus.PAID &&
        t.status !== PaymentTermStatus.WAIVED &&
        t.status !== PaymentTermStatus.CANCELLED &&
        new Date(t.dueDate).getTime() < today.getTime();
      if (overdue) return 0;
      if (t.status === PaymentTermStatus.PARTIAL) return 1;
      if (t.status === PaymentTermStatus.PENDING) return 2;
      if (t.status === PaymentTermStatus.PAID) return 3;
      return 4;
    };
    return [...all].sort((a, b) => {
      const s = score(a) - score(b);
      if (s !== 0) return s;
      const ad = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
      const bd = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
      return ad - bd;
    });
  }, [termsQ.data]);

  const recentReceipts = React.useMemo<Receipt[]>(() => {
    const all = receiptsQ.data ?? [];
    return [...all]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, ROW_LIMIT);
  }, [receiptsQ.data]);

  const recentExpenses = React.useMemo<ProjectExpense[]>(() => {
    const all = expensesQ.data?.data ?? [];
    return [...all]
      .sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime())
      .slice(0, ROW_LIMIT);
  }, [expensesQ.data]);

  const goToProject = React.useCallback(() => {
    if (!projectId) return;
    router.push(`${ROUTES.PROJECTS.DETAIL.replace('[id]', projectId)}?tab=finance`);
    onClose();
  }, [projectId, router, onClose]);

  const subtitle =
    customerName ?? (projectName && projectName !== projectNumber ? projectName : undefined);
  const title = projectNumber
    ? projectName && projectName !== projectNumber
      ? `${projectNumber} · ${projectName}`
      : projectNumber
    : 'Project finance';

  return (
    <DrawerShell
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      variant={stacked ? 'inner' : 'outer'}
      primaryAction={projectId ? { label: 'Open Project', onClick: goToProject } : undefined}
    >
      <section className="grid grid-cols-2 gap-2">
        {summaryQ.isLoading || !totals ? (
          <>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </>
        ) : (
          <>
            <StatTile label="Expected" value={formatCurrency(totals.totalExpected)} />
            <StatTile
              label="Received"
              value={formatCurrency(totals.totalReceived)}
              tone="success"
            />
            <StatTile
              label="Pending"
              value={formatCurrency(totals.pending)}
              tone={totals.pending > 0 ? 'warning' : 'default'}
            />
            <StatTile
              label="Overdue Terms"
              value={String(overdue)}
              tone={overdue > 0 ? 'error' : 'default'}
            />
          </>
        )}
      </section>

      <SectionHeader title="Payment Terms" count={termsQ.data?.length} />
      <ul className="border-border-light divide-border-light divide-y rounded-md border">
        {termsQ.isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <li key={`tskel-${i}`} className="px-3 py-2.5">
              <Skeleton className="h-4 w-full" />
            </li>
          ))}
        {!termsQ.isLoading && sortedTerms.length === 0 && (
          <li className="text-foreground-tertiary px-3 py-3 text-center text-sm">
            No payment terms yet.
          </li>
        )}
        {!termsQ.isLoading &&
          sortedTerms.slice(0, ROW_LIMIT).map((t) => {
            const isOverdue =
              !!t.dueDate &&
              t.status !== PaymentTermStatus.PAID &&
              t.status !== PaymentTermStatus.WAIVED &&
              t.status !== PaymentTermStatus.CANCELLED &&
              new Date(t.dueDate).getTime() < Date.now();
            const tone = termToneFromStatus(t.status, isOverdue);
            const outstanding = Number(t.expectedAmount) - Number(t.paidAmount);
            return (
              <li key={t.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <MUITypography variant="bodyPrimary" className="truncate">
                    {t.name}
                  </MUITypography>
                  <MUITypography variant="finePrint" className="text-foreground-tertiary">
                    {t.dueDate ? `Due ${formatDate(t.dueDate, 'medium')}` : 'No due date'} ·{' '}
                    {t.status}
                  </MUITypography>
                </div>
                <div className="text-right">
                  <AmountCell
                    value={outstanding}
                    className={`block text-right tabular-nums text-${tone === 'default' ? 'foreground' : tone}`}
                  />
                  <MUITypography variant="finePrint" className="text-foreground-tertiary">
                    of {formatCurrency(Number(t.expectedAmount))}
                  </MUITypography>
                </div>
              </li>
            );
          })}
      </ul>

      <SectionHeader title="Recent Receipts" count={receiptsQ.data?.length} />
      <ul className="border-border-light divide-border-light divide-y rounded-md border">
        {receiptsQ.isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <li key={`rskel-${i}`} className="px-3 py-2.5">
              <Skeleton className="h-4 w-full" />
            </li>
          ))}
        {!receiptsQ.isLoading && recentReceipts.length === 0 && (
          <li className="text-foreground-tertiary px-3 py-3 text-center text-sm">
            No receipts recorded yet.
          </li>
        )}
        {!receiptsQ.isLoading &&
          recentReceipts.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0 flex-1">
                <MUITypography variant="bodyPrimary" className="truncate">
                  {r.paymentNumber}
                </MUITypography>
                <MUITypography variant="finePrint" className="text-foreground-tertiary">
                  {formatDate(r.createdAt, 'medium')} · {r.paymentMethod} · {r.status}
                </MUITypography>
              </div>
              <AmountCell value={Number(r.paidAmount)} />
            </li>
          ))}
      </ul>

      <SectionHeader title="Recent Expenses" count={expensesQ.data?.data?.length} />
      <ul className="border-border-light divide-border-light divide-y rounded-md border">
        {expensesQ.isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <li key={`eskel-${i}`} className="px-3 py-2.5">
              <Skeleton className="h-4 w-full" />
            </li>
          ))}
        {!expensesQ.isLoading && recentExpenses.length === 0 && (
          <li className="text-foreground-tertiary px-3 py-3 text-center text-sm">
            No expenses logged yet.
          </li>
        )}
        {!expensesQ.isLoading &&
          recentExpenses.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0 flex-1">
                <MUITypography variant="bodyPrimary" className="truncate">
                  {e.expenseNumber}
                </MUITypography>
                <MUITypography variant="finePrint" className="text-foreground-tertiary truncate">
                  {formatDate(e.expenseDate, 'medium')} · {e.vendorName ?? 'No vendor'} ·{' '}
                  {e.category}
                </MUITypography>
              </div>
              <AmountCell value={Number(e.amount)} />
            </li>
          ))}
      </ul>
    </DrawerShell>
  );
}
