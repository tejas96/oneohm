'use client';

import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import { CircularProgress, SpeedDial, SpeedDialAction, SpeedDialIcon } from '@mui/material';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { ProjectPickerDialog } from './project-picker-dialog';
import { ExpenseDrawer } from '../components/expense-drawer';
import { RecordReceiptDialog } from '../components/record-receipt-dialog';

import { ROUTES } from '@/lib/config/routes';
import { usePaymentTerms } from '@/lib/hooks/resources';

/**
 * Quick-action FAB for the Finance dashboard.
 *
 * Workflow:
 *   1. User taps the SpeedDial -> picks an action.
 *   2. ProjectPickerDialog opens (every action needs a project context).
 *   3. After picking, the appropriate downstream UI opens — for
 *      Record Receipt we wait for usePaymentTerms to load (the dialog
 *      requires a `terms` array); for Add Expense we go straight to
 *      ExpenseDrawer; for "Add Payment Term" we deep-link to the
 *      project page (the dialog lives under the project's finance tab
 *      and can't be hosted standalone today without surgery — the
 *      deep-link is intentional V1 scope).
 *
 * The FAB is hidden on small screens to avoid blocking ledger content;
 * the same actions remain reachable via the project page.
 */
type Action = 'receipt' | 'expense' | 'term' | null;

export function SpeedDialActions(): React.JSX.Element {
  const router = useRouter();
  const [pendingAction, setPendingAction] = React.useState<Action>(null);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [chosenProjectId, setChosenProjectId] = React.useState<string | null>(null);
  const [receiptOpen, setReceiptOpen] = React.useState(false);
  const [expenseOpen, setExpenseOpen] = React.useState(false);

  const termsQuery = usePaymentTerms(chosenProjectId ?? '', {
    enabled: pendingAction === 'receipt' && Boolean(chosenProjectId),
  });

  const startAction = (action: Exclude<Action, null>): void => {
    setPendingAction(action);
    setChosenProjectId(null);
    setPickerOpen(true);
  };

  const handlePicked = (projectId: string): void => {
    setChosenProjectId(projectId);
    setPickerOpen(false);
    if (pendingAction === 'expense') setExpenseOpen(true);
    else if (pendingAction === 'receipt') setReceiptOpen(true);
    else if (pendingAction === 'term') {
      router.push(`${ROUTES.PROJECTS.DETAIL.replace('[id]', projectId)}?tab=finance&sub=terms`);
      setPendingAction(null);
    }
  };

  const handleReceiptClose = (open: boolean): void => {
    setReceiptOpen(open);
    if (!open) {
      setPendingAction(null);
      setChosenProjectId(null);
    }
  };

  const handleExpenseClose = (open: boolean): void => {
    setExpenseOpen(open);
    if (!open) {
      setPendingAction(null);
      setChosenProjectId(null);
    }
  };

  return (
    <>
      <SpeedDial
        ariaLabel="Quick finance actions"
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          display: { xs: 'none', md: 'flex' },
          zIndex: (t) => t.zIndex.fab,
        }}
        icon={<SpeedDialIcon icon={<AddBoxOutlinedIcon />} />}
      >
        <SpeedDialAction
          icon={<ReceiptLongOutlinedIcon />}
          tooltipTitle="Record Receipt"
          onClick={() => startAction('receipt')}
        />
        <SpeedDialAction
          icon={<PaymentsOutlinedIcon />}
          tooltipTitle="Add Expense"
          onClick={() => startAction('expense')}
        />
        <SpeedDialAction
          icon={<EventNoteOutlinedIcon />}
          tooltipTitle="Open project payment terms"
          onClick={() => startAction('term')}
        />
      </SpeedDial>

      <ProjectPickerDialog
        open={pickerOpen}
        onOpenChange={(open) => {
          setPickerOpen(open);
          if (!open && !receiptOpen && !expenseOpen) setPendingAction(null);
        }}
        title={
          pendingAction === 'receipt'
            ? 'Pick project for receipt'
            : pendingAction === 'expense'
              ? 'Pick project for expense'
              : 'Pick project to open'
        }
        onPick={(id) => handlePicked(id)}
      />

      {chosenProjectId && pendingAction === 'expense' && (
        <ExpenseDrawer
          open={expenseOpen}
          onOpenChange={handleExpenseClose}
          projectId={chosenProjectId}
        />
      )}

      {chosenProjectId && pendingAction === 'receipt' && (
        <RecordReceiptDialog
          open={receiptOpen}
          onOpenChange={handleReceiptClose}
          projectId={chosenProjectId}
          terms={termsQuery.data ?? []}
        />
      )}

      {/* Receipt dialog needs term list — show a tiny spinner overlay while loading */}
      {pendingAction === 'receipt' && receiptOpen && termsQuery.isLoading && (
        <div
          aria-hidden
          className="pointer-events-none fixed bottom-24 right-24 z-50 flex items-center gap-2 rounded-md bg-surface px-3 py-1.5 text-xs shadow-card"
        >
          <CircularProgress size={12} />
          <span className="text-foreground-secondary">Loading payment terms…</span>
        </div>
      )}

      {/* Deep-link helper hint when navigating to add a payment term */}
      <div aria-hidden className="hidden">
        <OpenInNewRoundedIcon />
      </div>
    </>
  );
}
