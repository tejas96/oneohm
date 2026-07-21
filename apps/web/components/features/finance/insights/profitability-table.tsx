'use client';

import * as React from 'react';

import { AmountCell } from '../shared';

import { MUITypography } from '@/components/ui';
import { Skeleton } from '@/components/ui/skeleton';
import type { ProjectProfitability } from '@/lib/hooks/resources';

/**
 * Project profitability table — one row per project.
 *
 * Margin coloring (per plan §10 Visual System):
 *   - margin% ≥ 20  → success/green
 *   - 10 ≤ margin% < 20 → warning/amber
 *   - margin% < 10  → danger/red
 *
 * BOM Variance: positive = over-budget (rendered red via `signed`),
 * zero/negative = under-or-on-budget (green/neutral). BOM target may
 * legitimately be zero for projects without an itemised BOM yet — we
 * render the variance cell with an em-dash in that case to avoid
 * implying "100% over budget" from a divide-by-zero.
 */
export interface ProfitabilityTableProps {
  items: ProjectProfitability[];
  isLoading?: boolean;
  onRowClick?: (item: ProjectProfitability) => void;
}

const SKELETON_ROWS = 8;

function marginTone(pct: number): string {
  if (pct >= 20) return 'text-success';
  if (pct >= 10) return 'text-warning';
  return 'text-error';
}

export function ProfitabilityTable({
  items,
  isLoading,
  onRowClick,
}: ProfitabilityTableProps): React.JSX.Element {
  return (
    <div className="bg-surface w-full overflow-x-auto rounded-xl shadow-e2">
      <table className="w-full text-left">
        <thead className="bg-background-secondary-b">
          <tr className="text-foreground-tertiary text-2xs uppercase tracking-wide">
            <th className="px-3 py-2 font-medium">Project</th>
            <th className="px-3 py-2 font-medium">Customer</th>
            <th className="px-3 py-2 text-right font-medium">Quoted Revenue</th>
            <th className="px-3 py-2 text-right font-medium">Received</th>
            <th className="px-3 py-2 text-right font-medium">Total Spend</th>
            <th className="px-3 py-2 text-right font-medium">Margin (₹)</th>
            <th className="px-3 py-2 text-right font-medium">Margin %</th>
            <th className="px-3 py-2 text-right font-medium">BOM Variance</th>
          </tr>
        </thead>
        <tbody className="divide-border-light divide-y">
          {isLoading &&
            Array.from({ length: SKELETON_ROWS }).map((_, idx) => (
              <tr key={`skel-${idx}`}>
                {Array.from({ length: 8 }).map((__, c) => (
                  <td key={c} className="px-3 py-2.5">
                    <Skeleton className="h-4 w-full" />
                  </td>
                ))}
              </tr>
            ))}

          {!isLoading && items.length === 0 && (
            <tr>
              <td colSpan={8} className="text-foreground-tertiary px-3 py-8 text-center text-sm">
                No projects yet.
              </td>
            </tr>
          )}

          {!isLoading &&
            items.map((p) => {
              const interactive = Boolean(onRowClick);
              const tone = marginTone(p.marginPct);
              const hasBom = p.bomTarget > 0;
              return (
                <tr
                  key={p.projectId}
                  onClick={interactive ? () => onRowClick?.(p) : undefined}
                  className={
                    interactive
                      ? 'hover:bg-surface-secondary cursor-pointer transition-colors'
                      : undefined
                  }
                >
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col">
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
                  </td>
                  <td className="px-3 py-2.5">
                    <MUITypography variant="body" className="truncate">
                      {p.customerName}
                    </MUITypography>
                  </td>
                  <td className="px-3 py-2.5">
                    <AmountCell value={p.quotedRevenue} muted />
                  </td>
                  <td className="px-3 py-2.5">
                    <AmountCell value={p.receivedAmount} muted />
                  </td>
                  <td className="px-3 py-2.5">
                    <AmountCell value={p.totalSpend} muted />
                  </td>
                  <td className="px-3 py-2.5">
                    <AmountCell value={p.margin} className={`${tone} text-right tabular-nums`} />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <MUITypography variant="bodyPrimary" className={`${tone} tabular-nums`}>
                      {p.marginPct.toFixed(1)}%
                    </MUITypography>
                  </td>
                  <td className="px-3 py-2.5">
                    {hasBom ? (
                      <AmountCell value={p.bomVariance} signed />
                    ) : (
                      <AmountCell value={null} />
                    )}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}
