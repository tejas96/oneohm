'use client';

import { Receipt as ReceiptIcon, Plus } from 'lucide-react';
import { type JSX, useState } from 'react';

import { EmptyState, ErrorState } from '@/components/shared/feedback/empty-state';
import { Button, Skeleton } from '@/components/ui';
import {
  type ExpenseListFilters,
  type ProjectExpense,
  useProjectExpenseSummary,
  useProjectExpenses,
} from '@/lib/hooks/resources';
import { formatCurrency, getErrorMessage } from '@/lib/utils';

import { ExpenseDrawer } from './expense-drawer';
import { ExpenseFilters } from './expense-filters';
import { ExpensesTable } from './expenses-table';

interface ExpensesSectionProps {
  projectId: string;
}

const DEFAULT_LIMIT = 25;

export function ExpensesSection({ projectId }: ExpensesSectionProps): JSX.Element {
  const [filters, setFilters] = useState<ExpenseListFilters>({ page: 1, limit: DEFAULT_LIMIT });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectExpense | null>(null);

  const {
    data: list,
    isLoading,
    isError,
    error,
    refetch,
  } = useProjectExpenses(projectId, filters);
  const { data: summary } = useProjectExpenseSummary(projectId);

  const expenses = list?.data ?? [];
  const total = list?.total ?? 0;
  const page = list?.page ?? 1;
  const limit = list?.limit ?? DEFAULT_LIMIT;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const openCreate = (): void => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (exp: ProjectExpense): void => {
    setEditing(exp);
    setDrawerOpen(true);
  };

  const filtersActive =
    Boolean(filters.category) ||
    Boolean(filters.paidBy) ||
    Boolean(filters.reimbursementStatus) ||
    Boolean(filters.vendorSearch) ||
    Boolean(filters.dateFrom) ||
    Boolean(filters.dateTo);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load expenses"
        description={getErrorMessage(error)}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Project Expenses</h3>
          <p className="text-2xs text-foreground-muted">
            Money spent on this project. Materials expenses can be itemized to BOM products to
            keep procurement-status accurate.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-3.5 mr-1" />
          Record Expense
        </Button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-lg border border-border-light bg-background-secondary p-3">
            <p className="text-2xs text-foreground-secondary">Total Spent</p>
            <p className="text-sm font-semibold text-foreground mt-0.5">
              {formatCurrency(summary.total)}
            </p>
          </div>
          <div className="rounded-lg border border-border-light bg-background-secondary p-3">
            <p className="text-2xs text-foreground-secondary">Pending Reimbursement</p>
            <p
              className={`text-sm font-semibold mt-0.5 ${
                summary.pendingReimbursementAmount > 0 ? 'text-warning' : 'text-foreground'
              }`}
            >
              {formatCurrency(summary.pendingReimbursementAmount)}
            </p>
          </div>
          <div className="rounded-lg border border-border-light bg-background-secondary p-3 col-span-2">
            <p className="text-2xs text-foreground-secondary mb-1">By Category</p>
            <div className="flex flex-wrap gap-2">
              {summary.byCategory.length === 0 ? (
                <span className="text-xs text-foreground-muted">No expenses yet</span>
              ) : (
                summary.byCategory.map((c) => (
                  <span
                    key={c.category}
                    className="text-2xs text-foreground bg-background px-2 py-0.5 rounded border border-border-light"
                  >
                    {c.category}: <span className="font-mono">{formatCurrency(c.amount)}</span>
                    <span className="text-foreground-muted"> · {c.count}</span>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <ExpenseFilters value={filters} onChange={setFilters} />

      {expenses.length === 0 ? (
        <EmptyState
          icon={<ReceiptIcon className="w-full h-full" />}
          iconColor="muted"
          title={filtersActive ? 'No expenses match these filters' : 'No expenses recorded'}
          description={
            filtersActive
              ? 'Adjust the filters above or clear them to see more results.'
              : 'Recording expenses keeps spend visible alongside planned receivables.'
          }
          action={
            filtersActive
              ? {
                  label: 'Clear filters',
                  onClick: () => setFilters({ page: 1, limit: DEFAULT_LIMIT }),
                }
              : { label: 'Record Expense', onClick: openCreate }
          }
        />
      ) : (
        <>
          <ExpensesTable expenses={expenses} projectId={projectId} onEdit={openEdit} />

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-foreground-muted">
              <span>
                Page {page} of {totalPages} · {total} expense{total === 1 ? '' : 's'}
              </span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setFilters({ ...filters, page: page - 1 })}
                >
                  Prev
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setFilters({ ...filters, page: page + 1 })}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <ExpenseDrawer
        open={drawerOpen}
        onOpenChange={(o) => {
          setDrawerOpen(o);
          if (!o) setEditing(null);
        }}
        projectId={projectId}
        expense={editing}
      />
    </div>
  );
}
