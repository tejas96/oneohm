'use client';

import { formatDate } from '@tejas96/shared/utils';
import * as React from 'react';

import { AgingBucketChip, AmountCell } from '../shared';
import { DrawerShell } from './drawer-shell';
import { ProjectFinanceDrawer } from './project-finance-drawer';

import { MUITypography } from '@/components/ui';
import { Skeleton } from '@/components/ui/skeleton';
import { type CustomerAging, useOrgOutstanding, useOrgReceipts } from '@/lib/hooks/resources';
import { formatCurrency } from '@/lib/utils';

export interface CustomerFinanceDrawerProps {
  open: boolean;
  onClose: () => void;
  /** AR row from the parent table — provides the cached customer + bucket totals. */
  customer: CustomerAging | null;
}

const RECENT_LIMIT = 6;

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

/**
 * Customer drilldown drawer — opened from the Customers AR table.
 *
 * Composition:
 *   - Header: customer name + phone/email subtitle
 *   - Summary tiles: total outstanding + open-term count + last receipt
 *   - Aging breakdown: 5 chip rows (Current / 0-30 / 31-60 / 61-90 / 90+)
 *   - Open Terms list: pulled fresh via `useOrgOutstanding({ customerId })`
 *   - Recent Receipts list: pulled fresh via `useOrgReceipts({ customerId })`
 *   - Each open-term row deep-links into ProjectFinanceDrawer (stacked).
 *
 * V1: avoids the "/finance/customers/:id/summary" endpoint per plan
 * §self-review by composing client-side from existing hooks.
 */
export function CustomerFinanceDrawer({
  open,
  onClose,
  customer,
}: CustomerFinanceDrawerProps): React.JSX.Element {
  const customerId = customer?.customerId ?? '';
  const enabled = open && !!customerId;

  const outstandingQ = useOrgOutstanding(
    { customerId, sort: 'daysOverdue', sortOrder: 'DESC', page: 1, limit: 50 },
    { enabled },
  );
  const receiptsQ = useOrgReceipts({ customerId, page: 1, limit: 25 }, { enabled });

  // Stacked project drawer state.
  const [projectDrawer, setProjectDrawer] = React.useState<{
    projectId: string;
    projectNumber?: string;
    projectName?: string;
  } | null>(null);

  const openTerms = outstandingQ.data?.data ?? [];
  const recentReceipts = (receiptsQ.data?.data ?? []).slice(0, RECENT_LIMIT);

  // Distinct projects across the customer's open terms (capped to 5).
  const distinctProjects = React.useMemo(() => {
    const seen = new Map<
      string,
      { projectId: string; projectNumber: string; projectName: string }
    >();
    for (const t of openTerms) {
      if (!seen.has(t.projectId)) {
        seen.set(t.projectId, {
          projectId: t.projectId,
          projectNumber: t.projectNumber,
          projectName: t.projectName,
        });
      }
      if (seen.size >= 5) break;
    }
    return [...seen.values()];
  }, [openTerms]);

  return (
    <>
      <DrawerShell
        open={open && projectDrawer === null}
        onClose={onClose}
        title={customer?.customerName ?? 'Customer'}
        subtitle={
          customer
            ? [customer.customerPhone, customer.customerEmail].filter(Boolean).join(' · ') ||
              undefined
            : undefined
        }
        variant="outer"
      >
        {!customer ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <>
            <section className="grid grid-cols-2 gap-2">
              <StatTile
                label="Total Outstanding"
                value={formatCurrency(customer.totalOutstanding)}
                tone={customer.totalOutstanding > 0 ? 'warning' : 'default'}
              />
              <StatTile label="Open Terms" value={String(customer.openTermCount)} />
              <StatTile
                label="Last Receipt"
                value={
                  customer.lastReceiptDate ? formatDate(customer.lastReceiptDate, 'medium') : '—'
                }
              />
              <StatTile
                label="Bucket 90+"
                value={formatCurrency(customer.bucket90plus)}
                tone={customer.bucket90plus > 0 ? 'error' : 'default'}
              />
            </section>

            <div className="mb-2 mt-4">
              <MUITypography variant="sectionTitle">Aging Breakdown</MUITypography>
            </div>
            <div className="border-border-light divide-border-light divide-y rounded-md border">
              {[
                { label: 'Current', value: customer.current, bucket: 'current' as const },
                { label: '0-30 days', value: customer.bucket0to30, bucket: '0-30' as const },
                { label: '31-60 days', value: customer.bucket31to60, bucket: '31-60' as const },
                { label: '61-90 days', value: customer.bucket61to90, bucket: '61-90' as const },
                { label: '90+ days', value: customer.bucket90plus, bucket: '90+' as const },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-2 px-3 py-2">
                  <AgingBucketChip bucket={row.bucket} />
                  <AmountCell value={row.value} muted={row.value === 0} />
                </div>
              ))}
            </div>

            <div className="mb-2 mt-4 flex items-center justify-between">
              <MUITypography variant="sectionTitle">Projects with Open Terms</MUITypography>
              <MUITypography variant="finePrint" className="text-foreground-tertiary">
                {distinctProjects.length} shown
              </MUITypography>
            </div>
            <ul className="border-border-light divide-border-light divide-y rounded-md border">
              {outstandingQ.isLoading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <li key={`pskel-${i}`} className="px-3 py-2.5">
                    <Skeleton className="h-4 w-full" />
                  </li>
                ))}
              {!outstandingQ.isLoading && distinctProjects.length === 0 && (
                <li className="text-foreground-tertiary px-3 py-3 text-center text-sm">
                  No projects with open terms.
                </li>
              )}
              {!outstandingQ.isLoading &&
                distinctProjects.map((p) => {
                  const projectOutstanding = openTerms
                    .filter((t) => t.projectId === p.projectId)
                    .reduce((sum, t) => sum + Number(t.outstandingAmount), 0);
                  return (
                    <li
                      key={p.projectId}
                      onClick={() => setProjectDrawer(p)}
                      className="hover:bg-surface-secondary flex cursor-pointer items-center justify-between gap-2 px-3 py-2 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <MUITypography variant="bodyPrimary" className="truncate">
                          {p.projectNumber}
                        </MUITypography>
                        <MUITypography
                          variant="finePrint"
                          className="text-foreground-tertiary truncate"
                        >
                          {p.projectName}
                        </MUITypography>
                      </div>
                      <AmountCell value={projectOutstanding} />
                    </li>
                  );
                })}
            </ul>

            <div className="mb-2 mt-4 flex items-center justify-between">
              <MUITypography variant="sectionTitle">Recent Receipts</MUITypography>
            </div>
            <ul className="border-border-light divide-border-light divide-y rounded-md border">
              {receiptsQ.isLoading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <li key={`rskel-${i}`} className="px-3 py-2.5">
                    <Skeleton className="h-4 w-full" />
                  </li>
                ))}
              {!receiptsQ.isLoading && recentReceipts.length === 0 && (
                <li className="text-foreground-tertiary px-3 py-3 text-center text-sm">
                  No receipts in the recent window.
                </li>
              )}
              {!receiptsQ.isLoading &&
                recentReceipts.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <MUITypography variant="bodyPrimary" className="truncate">
                        {r.paymentNumber}
                      </MUITypography>
                      <MUITypography
                        variant="finePrint"
                        className="text-foreground-tertiary truncate"
                      >
                        {formatDate(r.createdAt, 'medium')} · {r.projectNumber} · {r.paymentMethod}
                      </MUITypography>
                    </div>
                    <AmountCell value={Number(r.paidAmount)} />
                  </li>
                ))}
            </ul>
          </>
        )}
      </DrawerShell>

      {projectDrawer && (
        <ProjectFinanceDrawer
          open={projectDrawer !== null}
          onClose={() => setProjectDrawer(null)}
          projectId={projectDrawer.projectId}
          projectNumber={projectDrawer.projectNumber}
          projectName={projectDrawer.projectName}
          customerName={customer?.customerName}
          stacked
        />
      )}
    </>
  );
}
