'use client';

import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import { Skeleton } from '@mui/material';
import { type JSX } from 'react';

import { EmptyState, ErrorState } from '@/components/shared/feedback/empty-state';
import { MUITypography } from '@/components/ui';
import { useBomProcurementStatus } from '@/lib/hooks/resources';
import { formatCurrency, getErrorMessage } from '@/lib/utils';

interface ProcurementSectionProps {
  projectId: string;
}

function SummaryCard({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  tone?: 'default' | 'success' | 'warning' | 'error';
}): JSX.Element {
  const toneClasses: Record<string, string> = {
    default: 'text-foreground',
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error',
  };
  return (
    <div className="rounded-lg shadow-e2 bg-background-secondary p-3">
      <MUITypography variant="finePrint" className="text-foreground-secondary block">
        {label}
      </MUITypography>
      <MUITypography variant="bodyPrimary" className={`block mt-0.5 ${toneClasses[tone]}`}>
        {String(value)}
      </MUITypography>
    </div>
  );
}

/**
 * What the project's materials are budgeted to cost, per product, and what has
 * been spent on materials in total.
 *
 * THE PER-PRODUCT SPEND COLUMNS USED TO BE HERE AND WERE ALWAYS ZERO.
 *
 * This panel previously showed Spent, Remaining, Progress and a per-product
 * Status chip, sourced from `expense_product_links`. That table has no writer —
 * `ProjectExpenseService` was replaced by the ledger and the product links were
 * never ported — so every row read 0 / target / 0% / Pending on every project,
 * forever, beneath a caption promising it "Updates live as materials expenses
 * are recorded".
 *
 * The ledger records what was spent and its category, not which product it
 * bought, so those columns cannot be filled today by any means. They are gone
 * rather than left showing a zero a reader would take for a real measurement.
 * What survives is the half that is true: the per-product target, and one
 * project-level figure for material spend against it.
 */
export function ProcurementSection({ projectId }: ProcurementSectionProps): JSX.Element {
  const {
    data: procurement,
    isLoading,
    isError,
    error,
    refetch,
  } = useBomProcurementStatus(projectId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton variant="rounded" height={64} />
        <Skeleton variant="rounded" height={192} />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load procurement status"
        description={getErrorMessage(error)}
        onRetry={() => refetch()}
      />
    );
  }

  if (!procurement || procurement.items.length === 0) {
    return (
      <EmptyState
        icon={<Inventory2OutlinedIcon style={{ width: '100%', height: '100%' }} />}
        iconColor="muted"
        title="No materials budget yet"
        description="This appears once the bill of materials contains items."
      />
    );
  }

  const { items, totals } = procurement;
  const overBudget = totals.materialSpend > totals.targetSpend;

  return (
    <div className="space-y-4">
      <div>
        <MUITypography variant="sectionTitle">Materials budget</MUITypography>
        <MUITypography variant="finePrint" className="text-foreground-muted block">
          What each product should cost at the current bill, and what has been spent on materials
          across the project.
        </MUITypography>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <SummaryCard label="Products" value={totals.totalProducts} />
        <SummaryCard label="Budget" value={formatCurrency(totals.targetSpend)} />
        <SummaryCard
          label="Spent on materials"
          value={formatCurrency(totals.materialSpend)}
          tone={overBudget ? 'error' : 'default'}
        />
      </div>

      <div className="rounded-lg shadow-e2 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left px-3 py-2">
                <MUITypography variant="finePrint" className="text-foreground-muted uppercase">
                  Product
                </MUITypography>
              </th>
              <th className="text-right px-3 py-2">
                <MUITypography variant="finePrint" className="text-foreground-muted uppercase">
                  Quantity
                </MUITypography>
              </th>
              <th className="text-right px-3 py-2">
                <MUITypography variant="finePrint" className="text-foreground-muted uppercase">
                  Unit price
                </MUITypography>
              </th>
              <th className="text-right px-3 py-2">
                <MUITypography variant="finePrint" className="text-foreground-muted uppercase">
                  Budget
                </MUITypography>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {items.map((item) => (
              <tr key={item.productId} className="hover:bg-muted/30 transition-colors">
                <td className="px-3 py-2.5">
                  <MUITypography variant="bodyPrimary">{item.name}</MUITypography>
                </td>
                <td className="text-right px-3 py-2.5">
                  <MUITypography variant="body">
                    {item.targetQty}
                    {item.unit ? ` ${item.unit}` : ''}
                  </MUITypography>
                </td>
                <td className="text-right px-3 py-2.5">
                  <MUITypography variant="body" className="font-mono">
                    {item.unitPrice != null ? formatCurrency(item.unitPrice) : '—'}
                  </MUITypography>
                </td>
                <td className="text-right px-3 py-2.5">
                  <MUITypography variant="body" className="font-mono">
                    {item.targetSpend != null ? formatCurrency(item.targetSpend) : '—'}
                  </MUITypography>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <MUITypography variant="finePrint" className="text-foreground-muted flex items-center gap-1">
        <ShoppingBagOutlinedIcon sx={{ fontSize: 12 }} />
        Spend is the total of expenses categorised Materials on the Finance tab. It is not split
        per product — the ledger records what was paid, not what it bought.
      </MUITypography>
    </div>
  );
}
