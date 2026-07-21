'use client';

import AddIcon from '@mui/icons-material/Add';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import { Button, Skeleton } from '@mui/material';
import { type JSX, useState } from 'react';

import { ExpenseDrawer } from './expense-drawer';
import { ExpenseFilters } from './expense-filters';
import { ExpensesTable } from './expenses-table';

import { EmptyState, ErrorState } from '@/components/shared/feedback/empty-state';
import { MUITypography } from '@/components/ui';
import {
  type ExpenseListFilters,
  type ProjectExpense,
  useProjectExpenseSummary,
  useProjectExpenses,
} from '@/lib/hooks/resources';
import { formatCurrency, getErrorMessage } from '@/lib/utils';

interface ExpensesSectionProps {
  projectId: string;
}

const DEFAULT_LIMIT = 25;

export function ExpensesSection({ projectId }: ExpensesSectionProps): JSX.Element {
  const [filters, setFilters] = useState<ExpenseListFilters>({ page: 1, limit: DEFAULT_LIMIT });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectExpense | null>(null);

  const { data: list, isLoading, isError, error, refetch } = useProjectExpenses(projectId, filters);
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

  const showInitialSkeleton = isLoading && !list;

  if (showInitialSkeleton) {
    return (
      <div className="space-y-3">
        <Skeleton variant="rounded" height={48} />
        <Skeleton variant="rounded" height={64} />
        <Skeleton variant="rounded" height={192} />
      </div>
    );
  }

  if (isError && !list) {
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
          <MUITypography variant="sectionTitle">Project Expenses</MUITypography>
          <MUITypography variant="finePrint" className="text-foreground-muted block">
            Money spent on this project. Materials expenses can be itemized to BOM products to keep
            procurement-status accurate.
          </MUITypography>
        </div>
        <Button
          size="small"
          variant="contained"
          startIcon={<AddIcon sx={{ fontSize: 16 }} />}
          onClick={openCreate}
        >
          Record Expense
        </Button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-lg shadow-e2 bg-background-secondary p-3">
            <MUITypography variant="finePrint" className="text-foreground-secondary block">
              Total Spent
            </MUITypography>
            <MUITypography variant="bodyPrimary" className="block mt-0.5">
              {formatCurrency(summary.total)}
            </MUITypography>
          </div>
          <div className="rounded-lg shadow-e2 bg-background-secondary p-3">
            <MUITypography variant="finePrint" className="text-foreground-secondary block">
              Pending Reimbursement
            </MUITypography>
            <MUITypography
              variant="bodyPrimary"
              className={`block mt-0.5 ${summary.pendingReimbursementAmount > 0 ? 'text-warning' : ''}`}
            >
              {formatCurrency(summary.pendingReimbursementAmount)}
            </MUITypography>
          </div>
          <div className="rounded-lg shadow-e2 bg-background-secondary p-3 col-span-2">
            <MUITypography variant="finePrint" className="text-foreground-secondary mb-1 block">
              By Category
            </MUITypography>
            <div className="flex flex-wrap gap-2">
              {summary.byCategory.length === 0 ? (
                <MUITypography variant="placeholder">No expenses yet</MUITypography>
              ) : (
                summary.byCategory.map((c) => (
                  <span
                    key={c.category}
                    className="text-foreground bg-background px-2 py-0.5 rounded shadow-e1"
                  >
                    <MUITypography variant="finePrint" component="span">
                      {c.category}: <span className="font-mono">{formatCurrency(c.amount)}</span>
                      <span className="text-foreground-muted"> · {c.count}</span>
                    </MUITypography>
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
          icon={<ReceiptLongOutlinedIcon style={{ width: '100%', height: '100%' }} />}
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
            <div className="flex items-center justify-between">
              <MUITypography variant="finePrint" className="text-foreground-muted">
                Page {page} of {totalPages} · {total} expense{total === 1 ? '' : 's'}
              </MUITypography>
              <div className="flex gap-1">
                <Button
                  size="small"
                  variant="outlined"
                  disabled={page <= 1}
                  onClick={() => setFilters({ ...filters, page: page - 1 })}
                >
                  Prev
                </Button>
                <Button
                  size="small"
                  variant="outlined"
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
