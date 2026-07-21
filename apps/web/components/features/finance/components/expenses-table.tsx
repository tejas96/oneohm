'use client';

import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DownloadIcon from '@mui/icons-material/Download';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import {
  Button,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_PAID_BY_LABELS,
  REIMBURSEMENT_STATUS_LABELS,
} from '@tejas96/shared/constants';
import { ExpensePaidByType, ReimbursementStatus } from '@tejas96/shared/types';
import React, { useState, type JSX } from 'react';

import { EXPENSE_CATEGORY_COLOR, REIMBURSEMENT_STATUS_COLOR } from '../constants';
import { useFinancePdf } from '../hooks/use-finance-pdf';

import {
  MUIDialog,
  MUIDialogBody,
  MUIDialogDescription,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
  MUIStatusChip,
  MUITypography,
} from '@/components/ui';
import { type ProjectExpense, useProjectExpenseMutations } from '@/lib/hooks/resources';
import { formatCurrency, formatDate } from '@/lib/utils';

interface ExpensesTableProps {
  expenses: ProjectExpense[];
  projectId: string;
  onEdit: (expense: ProjectExpense) => void;
}

interface ExpenseRowMenuProps {
  expense: ProjectExpense;
  pdfReady: boolean;
  canMarkReimbursed: boolean;
  isReimbursing: boolean;
  isDeleting: boolean;
  onDownload: () => void;
  onEdit: () => void;
  onMarkReimbursed: () => void;
  onDelete: () => void;
}

function ExpenseRowMenu({
  expense,
  pdfReady,
  canMarkReimbursed,
  isReimbursing,
  isDeleting,
  onDownload,
  onEdit,
  onMarkReimbursed,
  onDelete,
}: ExpenseRowMenuProps): JSX.Element {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const open = Boolean(anchor);
  const close = (): void => setAnchor(null);
  const isReimbursed = expense.reimbursementStatus === ReimbursementStatus.REIMBURSED;

  return (
    <>
      <IconButton
        size="small"
        aria-label={`Expense ${expense.expenseNumber} actions`}
        onClick={(e) => setAnchor(e.currentTarget)}
      >
        <MoreHorizIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={open}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          disabled={!pdfReady}
          onClick={() => {
            close();
            onDownload();
          }}
        >
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Download Voucher PDF</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            close();
            onEdit();
          }}
        >
          <ListItemIcon>
            <EditOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem
          disabled={!canMarkReimbursed || isReimbursing}
          onClick={() => {
            close();
            onMarkReimbursed();
          }}
        >
          <ListItemIcon>
            <CheckCircleOutlineIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Mark reimbursed</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem
          disabled={isDeleting || isReimbursed}
          onClick={() => {
            close();
            onDelete();
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteOutlineIcon fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}

export function ExpensesTable({ expenses, projectId, onEdit }: ExpensesTableProps): JSX.Element {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ProjectExpense | null>(null);
  const { remove, markReimbursed } = useProjectExpenseMutations(projectId);
  const { printExpenseVoucher, isReady: pdfReady } = useFinancePdf(projectId);

  return (
    <div className="rounded-lg shadow-e2 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-muted/50">
            <th className="w-6 px-2 py-2" />
            {(['Date', 'Number', 'Category', 'Vendor'] as const).map((label) => (
              <th key={label} className="text-left px-3 py-2">
                <MUITypography variant="finePrint" className="text-foreground-muted uppercase">
                  {label}
                </MUITypography>
              </th>
            ))}
            <th className="text-right px-3 py-2">
              <MUITypography variant="finePrint" className="text-foreground-muted uppercase">
                Amount
              </MUITypography>
            </th>
            {(['Paid By', 'Reimbursement'] as const).map((label) => (
              <th key={label} className="text-left px-3 py-2">
                <MUITypography variant="finePrint" className="text-foreground-muted uppercase">
                  {label}
                </MUITypography>
              </th>
            ))}
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
                        <ExpandLessIcon sx={{ fontSize: 16 }} />
                      ) : (
                        <ExpandMoreIcon sx={{ fontSize: 16 }} />
                      ))}
                  </td>
                  <td className="px-3 py-2.5">
                    <MUITypography variant="body">
                      {formatDate(expense.expenseDate, 'medium')}
                    </MUITypography>
                  </td>
                  <td className="px-3 py-2.5">
                    <MUITypography variant="body" className="font-mono">
                      {expense.expenseNumber}
                    </MUITypography>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1 flex-wrap">
                      <MUIStatusChip
                        label={EXPENSE_CATEGORY_LABELS[expense.category] ?? expense.category}
                        color={EXPENSE_CATEGORY_COLOR[expense.category]}
                        colorSeed={expense.category}
                      />
                      {expense.overrideUsed && <MUIStatusChip label="Override" color="warning" />}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    {expense.vendorName ? (
                      <MUITypography variant="body" className="text-foreground-secondary">
                        {expense.vendorName}
                      </MUITypography>
                    ) : (
                      <MUITypography variant="placeholder">—</MUITypography>
                    )}
                  </td>
                  <td className="text-right px-3 py-2.5">
                    <MUITypography variant="bodyPrimary">
                      {formatCurrency(expense.amount)}
                    </MUITypography>
                  </td>
                  <td className="px-3 py-2.5">
                    <MUITypography variant="body" className="text-foreground-secondary">
                      {EXPENSE_PAID_BY_LABELS[expense.paidBy] ?? expense.paidBy}
                    </MUITypography>
                  </td>
                  <td className="px-3 py-2.5">
                    <MUIStatusChip
                      label={
                        REIMBURSEMENT_STATUS_LABELS[expense.reimbursementStatus] ??
                        expense.reimbursementStatus
                      }
                      color={REIMBURSEMENT_STATUS_COLOR[expense.reimbursementStatus] ?? 'default'}
                      colorSeed={expense.reimbursementStatus}
                    />
                  </td>
                  <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <ExpenseRowMenu
                      expense={expense}
                      pdfReady={pdfReady}
                      canMarkReimbursed={canMarkReimbursed}
                      isReimbursing={markReimbursed.isPending}
                      isDeleting={remove.isPending}
                      onDownload={() => void printExpenseVoucher(expense)}
                      onEdit={() => onEdit(expense)}
                      onMarkReimbursed={() => markReimbursed.mutate(expense.id)}
                      onDelete={() => setPendingDelete(expense)}
                    />
                  </td>
                </tr>

                {isExpanded && hasDetails && (
                  <tr>
                    <td colSpan={9} className="bg-muted/20 px-6 py-3">
                      {expense.overrideUsed && expense.overrideReason && (
                        <MUITypography variant="finePrint" className="text-warning mb-2 block">
                          <strong>Override reason:</strong> {expense.overrideReason}
                        </MUITypography>
                      )}
                      {expense.notes && (
                        <MUITypography
                          variant="finePrint"
                          className="text-foreground-secondary mb-2 block italic"
                        >
                          {expense.notes}
                        </MUITypography>
                      )}
                      {hasLines && (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr>
                                {(['Item', 'Unit'] as const).map((l) => (
                                  <th key={l} className="text-left py-1">
                                    <MUITypography
                                      variant="finePrint"
                                      className="text-foreground-muted uppercase"
                                    >
                                      {l}
                                    </MUITypography>
                                  </th>
                                ))}
                                {(['Qty', 'Unit Price', 'Line Total'] as const).map((l) => (
                                  <th key={l} className="text-right py-1">
                                    <MUITypography
                                      variant="finePrint"
                                      className="text-foreground-muted uppercase"
                                    >
                                      {l}
                                    </MUITypography>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {expense.productLinks?.map((line) => {
                                const total =
                                  Number(line.quantity ?? 0) * Number(line.unitPrice ?? 0);
                                return (
                                  <tr key={line.id} className="border-t border-border-light/50">
                                    <td className="py-1.5">
                                      <MUITypography variant="body">
                                        {line.itemName ?? line.productId ?? '—'}
                                      </MUITypography>
                                    </td>
                                    <td className="py-1.5">
                                      <MUITypography
                                        variant="body"
                                        className="text-foreground-secondary"
                                      >
                                        {line.unit ?? '—'}
                                      </MUITypography>
                                    </td>
                                    <td className="py-1.5 text-right">
                                      <MUITypography variant="body">{line.quantity}</MUITypography>
                                    </td>
                                    <td className="py-1.5 text-right">
                                      <MUITypography variant="body">
                                        {line.unitPrice == null
                                          ? '—'
                                          : formatCurrency(line.unitPrice)}
                                      </MUITypography>
                                    </td>
                                    <td className="py-1.5 text-right">
                                      <MUITypography variant="bodyPrimary">
                                        {line.unitPrice == null ? '—' : formatCurrency(total)}
                                      </MUITypography>
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

      <MUIDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        size="sm"
      >
        <MUIDialogHeader>
          <MUIDialogTitle>
            {pendingDelete ? `Delete expense ${pendingDelete.expenseNumber}?` : 'Delete expense?'}
          </MUIDialogTitle>
          <MUIDialogDescription>
            {pendingDelete
              ? `This will permanently remove the ${formatCurrency(Number(pendingDelete.amount))} expense${pendingDelete.vendorName ? ` to ${pendingDelete.vendorName}` : ''}. Linked product procurement totals will be re-calculated.`
              : 'This action cannot be undone.'}
          </MUIDialogDescription>
        </MUIDialogHeader>
        <MUIDialogBody>
          <MUITypography variant="body" className="text-foreground-secondary">
            BOM procurement aggregates derived from this expense will refresh automatically.
          </MUITypography>
        </MUIDialogBody>
        <MUIDialogFooter>
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => setPendingDelete(null)}
            disabled={remove.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={remove.isPending}
            onClick={() => {
              if (pendingDelete) remove.mutate(pendingDelete.id);
              setPendingDelete(null);
            }}
          >
            {remove.isPending ? 'Deleting…' : 'Delete expense'}
          </Button>
        </MUIDialogFooter>
      </MUIDialog>
    </div>
  );
}
