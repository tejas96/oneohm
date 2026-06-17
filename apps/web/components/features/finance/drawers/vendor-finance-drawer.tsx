'use client';

import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Alert } from '@mui/material';
import { EXPENSE_CATEGORY_LABELS } from '@tejas96/shared/constants';
import { type ExpenseCategory } from '@tejas96/shared/types';
import { formatDate } from '@tejas96/shared/utils';
import * as React from 'react';

import { AmountCell } from '../shared';
import { DrawerShell } from './drawer-shell';
import { ProjectFinanceDrawer } from './project-finance-drawer';

import { MUITypography } from '@/components/ui';
import { Skeleton } from '@/components/ui/skeleton';
import { type VendorSpend, useOrgExpenses } from '@/lib/hooks/resources';
import { formatCurrency } from '@/lib/utils';

export interface VendorFinanceDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Cached vendor row from the parent table. */
  vendor: VendorSpend | null;
  /** Mirror the parent page's date filter when fetching recent expenses. */
  dateFrom?: string;
  dateTo?: string;
}

const RECENT_LIMIT = 8;

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

function categoryLabel(raw: string): string {
  return (EXPENSE_CATEGORY_LABELS as Record<string, string>)[raw] ?? raw;
}

/**
 * Vendor drilldown drawer — opened from the Vendors & Spend table.
 *
 * Composition:
 *   - Caveat banner: name-based grouping caveat (per plan §self-review).
 *   - Summary tiles: total spend / expense count / % reimbursed / last expense.
 *   - By-category breakdown: simple horizontal bar list (no recharts).
 *   - Recent expenses list: pulled fresh via `useOrgExpenses({vendorSearch: vendorKey})`,
 *     filtered by the same date range as the parent page so totals match.
 *   - Each expense row deep-links into ProjectFinanceDrawer (stacked).
 */
export function VendorFinanceDrawer({
  open,
  onClose,
  vendor,
  dateFrom,
  dateTo,
}: VendorFinanceDrawerProps): React.JSX.Element {
  const enabled = open && !!vendor?.vendorKey;

  const expensesQ = useOrgExpenses(
    {
      vendorSearch: vendor?.vendorKey,
      dateFrom,
      dateTo,
      page: 1,
      limit: RECENT_LIMIT,
    },
    { enabled },
  );

  const [projectDrawer, setProjectDrawer] = React.useState<{
    projectId: string;
    projectNumber?: string;
    projectName?: string;
  } | null>(null);

  const recentExpenses = expensesQ.data?.data ?? [];

  const maxCategoryTotal = React.useMemo(
    () => vendor?.byCategory.reduce((max, c) => Math.max(max, c.total), 0) ?? 0,
    [vendor],
  );

  return (
    <>
      <DrawerShell
        open={open && projectDrawer === null}
        onClose={onClose}
        title={vendor?.vendorName || 'Vendor'}
        subtitle={
          vendor
            ? `${vendor.expenseCount} expense${vendor.expenseCount === 1 ? '' : 's'} · key: ${vendor.vendorKey}`
            : undefined
        }
        variant="outer"
      >
        {!vendor ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <>
            <Alert
              severity="info"
              variant="outlined"
              icon={<InfoOutlinedIcon fontSize="small" />}
              sx={{ mb: 2, py: 0.5 }}
            >
              Vendor matching is by name (case-insensitive). Two slightly different spellings will
              appear as separate vendors.
            </Alert>

            <section className="grid grid-cols-2 gap-2">
              <StatTile label="Total Spend" value={formatCurrency(vendor.totalSpend)} />
              <StatTile label="Expenses" value={String(vendor.expenseCount)} />
              <StatTile
                label="% Reimbursed"
                value={`${Math.round(vendor.reimbursedPercentage)}%`}
                tone={vendor.reimbursedPercentage >= 100 ? 'success' : 'default'}
              />
              <StatTile
                label="Last Expense"
                value={vendor.lastExpenseDate ? formatDate(vendor.lastExpenseDate, 'medium') : '—'}
              />
            </section>

            <div className="mb-2 mt-4">
              <MUITypography variant="sectionTitle">Spend by Category</MUITypography>
            </div>
            <div className="border-border-light bg-surface space-y-2 rounded-md border p-3">
              {vendor.byCategory.length === 0 && (
                <MUITypography variant="body" className="text-foreground-tertiary">
                  No category breakdown.
                </MUITypography>
              )}
              {vendor.byCategory
                .slice()
                .sort((a, b) => b.total - a.total)
                .map((c) => {
                  const pct = maxCategoryTotal > 0 ? (c.total / maxCategoryTotal) * 100 : 0;
                  return (
                    <div key={c.category}>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <MUITypography variant="body" className="truncate">
                          {categoryLabel(c.category)}
                        </MUITypography>
                        <MUITypography variant="body" className="tabular-nums">
                          {formatCurrency(c.total)}
                        </MUITypography>
                      </div>
                      <div className="bg-background-secondary border-border-light h-1.5 w-full overflow-hidden rounded border">
                        <div className="bg-primary h-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="mb-2 mt-4 flex items-center justify-between">
              <MUITypography variant="sectionTitle">Recent Expenses</MUITypography>
              <MUITypography variant="finePrint" className="text-foreground-tertiary">
                {dateFrom || dateTo ? 'In selected range' : 'Most recent'}
              </MUITypography>
            </div>
            <ul className="border-border-light divide-border-light divide-y rounded-md border">
              {expensesQ.isLoading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <li key={`xskel-${i}`} className="px-3 py-2.5">
                    <Skeleton className="h-4 w-full" />
                  </li>
                ))}
              {!expensesQ.isLoading && recentExpenses.length === 0 && (
                <li className="text-foreground-tertiary px-3 py-3 text-center text-sm">
                  No expenses found for this vendor in the selected range.
                </li>
              )}
              {!expensesQ.isLoading &&
                recentExpenses.map((e) => (
                  <li
                    key={e.id}
                    onClick={() =>
                      setProjectDrawer({
                        projectId: e.projectId,
                        projectNumber: e.projectNumber,
                        projectName: e.projectName,
                      })
                    }
                    className="hover:bg-surface-secondary flex cursor-pointer items-center justify-between gap-2 px-3 py-2 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <MUITypography variant="bodyPrimary" className="truncate">
                        {e.expenseNumber}
                      </MUITypography>
                      <MUITypography
                        variant="finePrint"
                        className="text-foreground-tertiary truncate"
                      >
                        {formatDate(e.expenseDate, 'medium')} · {e.projectNumber} ·{' '}
                        {categoryLabel(e.category as ExpenseCategory)}
                      </MUITypography>
                    </div>
                    <AmountCell value={Number(e.amount)} />
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
          stacked
        />
      )}
    </>
  );
}
