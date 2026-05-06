'use client';

import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_PAID_BY_LABELS,
  REIMBURSEMENT_STATUS_LABELS,
} from '@oneohm-epc/shared/constants';
import { ExpensePaidByType, ReimbursementStatus } from '@oneohm-epc/shared/types';
import {
  CheckCheck,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';
import React, { useState, type JSX } from 'react';

import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui';
import {
  type ProjectExpense,
  useProjectExpenseMutations,
} from '@/lib/hooks/resources';
import { formatCurrency, formatDate } from '@/lib/utils';

import {
  EXPENSE_CATEGORY_BADGE_VARIANT,
  REIMBURSEMENT_STATUS_BADGE_VARIANT,
} from '../constants';

interface ExpensesTableProps {
  expenses: ProjectExpense[];
  projectId: string;
  onEdit: (expense: ProjectExpense) => void;
}

export function ExpensesTable({ expenses, projectId, onEdit }: ExpensesTableProps): JSX.Element {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const { remove, markReimbursed } = useProjectExpenseMutations(projectId);

  const handleDelete = (id: string): void => {
    if (confirmDeleteId === id) {
      remove.mutate(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      window.setTimeout(() => setConfirmDeleteId((c) => (c === id ? null : c)), 4000);
    }
  };

  return (
    <div className="rounded-lg border border-border-light overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-muted/50">
            <th className="w-6 px-2 py-2" />
            <th className="text-2xs font-medium text-foreground-muted uppercase text-left px-3 py-2">
              Date
            </th>
            <th className="text-2xs font-medium text-foreground-muted uppercase text-left px-3 py-2">
              Number
            </th>
            <th className="text-2xs font-medium text-foreground-muted uppercase text-left px-3 py-2">
              Category
            </th>
            <th className="text-2xs font-medium text-foreground-muted uppercase text-left px-3 py-2">
              Vendor
            </th>
            <th className="text-2xs font-medium text-foreground-muted uppercase text-right px-3 py-2">
              Amount
            </th>
            <th className="text-2xs font-medium text-foreground-muted uppercase text-left px-3 py-2">
              Paid By
            </th>
            <th className="text-2xs font-medium text-foreground-muted uppercase text-left px-3 py-2">
              Reimbursement
            </th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border-light">
          {expenses.map((expense) => {
            const isExpanded = expandedId === expense.id;
            const hasLines = (expense.productLinks?.length ?? 0) > 0;
            const hasDetails = hasLines || Boolean(expense.notes) || expense.overrideUsed;
            const canMarkReimbursed =
              expense.paidBy === ExpensePaidByType.EMPLOYEE &&
              expense.reimbursementStatus === ReimbursementStatus.PENDING;

            return (
              <React.Fragment key={expense.id}>
                <tr
                  className="hover:bg-muted/30 transition-colors"
                  onClick={() => hasDetails && setExpandedId(isExpanded ? null : expense.id)}
                  style={{ cursor: hasDetails ? 'pointer' : 'default' }}
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
                    {formatDate(expense.expenseDate, 'medium')}
                  </td>
                  <td className="text-xs text-foreground font-mono px-3 py-2.5">
                    {expense.expenseNumber}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge
                      variant={
                        (EXPENSE_CATEGORY_BADGE_VARIANT[expense.category] ??
                          'secondary') as 'success'
                      }
                      size="xs"
                    >
                      {EXPENSE_CATEGORY_LABELS[expense.category] ?? expense.category}
                    </Badge>
                    {expense.overrideUsed && (
                      <Badge variant="warning" size="xs" className="ml-1">
                        Override
                      </Badge>
                    )}
                  </td>
                  <td className="text-xs text-foreground-secondary px-3 py-2.5">
                    {expense.vendorName || <span className="italic text-foreground-muted">—</span>}
                  </td>
                  <td className="text-xs text-foreground font-medium text-right px-3 py-2.5">
                    {formatCurrency(expense.amount)}
                  </td>
                  <td className="text-xs text-foreground-secondary px-3 py-2.5">
                    {EXPENSE_PAID_BY_LABELS[expense.paidBy] ?? expense.paidBy}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge
                      variant={
                        (REIMBURSEMENT_STATUS_BADGE_VARIANT[expense.reimbursementStatus] ??
                          'secondary') as 'success'
                      }
                      size="xs"
                    >
                      {REIMBURSEMENT_STATUS_LABELS[expense.reimbursementStatus] ??
                        expense.reimbursementStatus}
                    </Badge>
                  </td>
                  <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost" aria-label="Expense actions">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(expense)}>
                          <Pencil className="size-3.5 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => markReimbursed.mutate(expense.id)}
                          disabled={!canMarkReimbursed || markReimbursed.isPending}
                        >
                          <CheckCheck className="size-3.5 mr-2" />
                          Mark reimbursed
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(expense.id)}
                          disabled={
                            remove.isPending ||
                            expense.reimbursementStatus === ReimbursementStatus.REIMBURSED
                          }
                          className="text-error"
                        >
                          <Trash2 className="size-3.5 mr-2" />
                          {confirmDeleteId === expense.id ? 'Click again to confirm' : 'Delete'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>

                {isExpanded && hasDetails && (
                  <tr>
                    <td colSpan={9} className="bg-muted/20 px-6 py-3">
                      {expense.overrideUsed && expense.overrideReason && (
                        <p className="text-2xs text-warning mb-2">
                          <strong>Override reason:</strong> {expense.overrideReason}
                        </p>
                      )}
                      {expense.notes && (
                        <p className="text-2xs text-foreground-secondary mb-2 italic">
                          {expense.notes}
                        </p>
                      )}
                      {hasLines && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-foreground-muted text-2xs uppercase">
                                <th className="text-left py-1">Item</th>
                                <th className="text-left py-1">Unit</th>
                                <th className="text-right py-1">Qty</th>
                                <th className="text-right py-1">Unit Price</th>
                                <th className="text-right py-1">Line Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {expense.productLinks?.map((line) => {
                                const total =
                                  Number(line.quantity ?? 0) * Number(line.unitPrice ?? 0);
                                return (
                                  <tr key={line.id} className="border-t border-border-light/50">
                                    <td className="py-1.5">
                                      {line.itemName ?? line.productId ?? '—'}
                                    </td>
                                    <td className="py-1.5 text-foreground-secondary">
                                      {line.unit ?? '—'}
                                    </td>
                                    <td className="py-1.5 text-right">{line.quantity}</td>
                                    <td className="py-1.5 text-right">
                                      {line.unitPrice == null
                                        ? '—'
                                        : formatCurrency(line.unitPrice)}
                                    </td>
                                    <td className="py-1.5 text-right font-medium">
                                      {line.unitPrice == null ? '—' : formatCurrency(total)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
