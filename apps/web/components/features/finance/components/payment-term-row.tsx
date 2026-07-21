'use client';

import AddIcon from '@mui/icons-material/Add';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import PanToolOutlinedIcon from '@mui/icons-material/PanToolOutlined';
import {
  Button,
  IconButton,
  LinearProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import { PAYMENT_TERM_SOURCE_LABELS, PAYMENT_TERM_STATUS_LABELS } from '@tejas96/shared/constants';
import { PaymentTermStatus } from '@tejas96/shared/types';
import { type JSX, useState } from 'react';

import { PAYMENT_TERM_STATUS_COLOR } from '../constants';

import {
  MUIDialog,
  MUIDialogBody,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
  MUIDialogDescription,
  MUIStatusChip,
  MUITypography,
} from '@/components/ui';
import { type PaymentTerm, usePaymentTermMutations } from '@/lib/hooks/resources';
import { formatCurrency, formatDate } from '@/lib/utils';

interface PaymentTermRowProps {
  term: PaymentTerm;
  projectId: string;
  onRecordReceipt: (termId: string) => void;
  onWaive: (term: PaymentTerm) => void;
}

const TERMINAL_STATUSES: ReadonlySet<PaymentTermStatus> = new Set([
  PaymentTermStatus.PAID,
  PaymentTermStatus.WAIVED,
  PaymentTermStatus.CANCELLED,
]);

export function PaymentTermRow({
  term,
  projectId,
  onRecordReceipt,
  onWaive,
}: PaymentTermRowProps): JSX.Element {
  const { remove } = usePaymentTermMutations(projectId);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const menuOpen = Boolean(menuAnchor);

  const expected = Number(term.expectedAmount);
  const paid = Number(term.paidAmount);
  const remaining = Math.max(0, expected - paid);
  const progress = expected > 0 ? Math.min(100, Math.round((paid / expected) * 100)) : 0;

  const isTerminal = TERMINAL_STATUSES.has(term.status);
  const canWaive = !isTerminal;
  const canDelete = paid === 0 && !isTerminal;
  const isOverdue =
    term.dueDate != null &&
    !isTerminal &&
    new Date(term.dueDate).getTime() < Date.now() &&
    remaining > 0;

  const closeMenu = (): void => setMenuAnchor(null);

  const handleConfirmDelete = (): void => {
    remove.mutate(term.id);
    setDeleteOpen(false);
  };

  const progressColor = isOverdue ? 'error' : progress >= 100 ? 'success' : 'primary';

  return (
    <div className="rounded-lg shadow-e2 bg-background p-4 hover:border-border transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <MUITypography variant="finePrint" className="font-mono text-foreground-muted">
              #{term.displayOrder}
            </MUITypography>
            <MUITypography variant="bodyPrimary" className="truncate">
              {term.name}
            </MUITypography>
            <MUIStatusChip
              label={PAYMENT_TERM_STATUS_LABELS[term.status] ?? term.status}
              color={PAYMENT_TERM_STATUS_COLOR[term.status] ?? 'default'}
              colorSeed={term.status}
            />
            {isOverdue && <MUIStatusChip label="Overdue" color="error" />}
            <MUITypography variant="finePrint" className="text-foreground-muted">
              {PAYMENT_TERM_SOURCE_LABELS[term.source] ?? term.source}
            </MUITypography>
          </div>

          {term.stage && (
            <MUITypography variant="finePrint" className="text-foreground-secondary mt-1 block">
              {term.stage}
            </MUITypography>
          )}

          {term.dueDate && (
            <MUITypography
              variant="finePrint"
              className="text-foreground-muted mt-1 flex items-center gap-1"
            >
              <CalendarTodayIcon sx={{ fontSize: 12 }} />
              Due {formatDate(term.dueDate, 'medium')}
            </MUITypography>
          )}

          {term.status === PaymentTermStatus.WAIVED && term.waivedReason && (
            <MUITypography variant="finePrint" className="text-foreground-muted mt-1 block italic">
              Waived: {term.waivedReason}
            </MUITypography>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isTerminal && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddIcon sx={{ fontSize: 16 }} />}
              onClick={() => onRecordReceipt(term.id)}
            >
              Receipt
            </Button>
          )}
          <IconButton
            size="small"
            aria-label="More actions"
            onClick={(e) => setMenuAnchor(e.currentTarget)}
          >
            <MoreHorizIcon fontSize="small" />
          </IconButton>
          <Menu
            anchorEl={menuAnchor}
            open={menuOpen}
            onClose={closeMenu}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem
              disabled={!canWaive}
              onClick={() => {
                closeMenu();
                onWaive(term);
              }}
            >
              <ListItemIcon>
                <PanToolOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Waive…</ListItemText>
            </MenuItem>
            <Divider />
            <MenuItem
              disabled={!canDelete || remove.isPending}
              onClick={() => {
                closeMenu();
                setDeleteOpen(true);
              }}
              sx={{ color: 'error.main' }}
            >
              <ListItemIcon>
                <DeleteOutlineIcon fontSize="small" sx={{ color: 'error.main' }} />
              </ListItemIcon>
              <ListItemText>Delete</ListItemText>
            </MenuItem>
          </Menu>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <div>
          <MUITypography variant="finePrint" className="text-foreground-muted uppercase block">
            Expected
          </MUITypography>
          <MUITypography variant="bodyPrimary">{formatCurrency(expected)}</MUITypography>
        </div>
        <div>
          <MUITypography variant="finePrint" className="text-foreground-muted uppercase block">
            Paid
          </MUITypography>
          <MUITypography variant="bodyPrimary" className="text-success">
            {formatCurrency(paid)}
          </MUITypography>
        </div>
        <div>
          <MUITypography variant="finePrint" className="text-foreground-muted uppercase block">
            Remaining
          </MUITypography>
          <MUITypography variant="bodyPrimary">{formatCurrency(remaining)}</MUITypography>
        </div>
      </div>

      <LinearProgress
        variant="determinate"
        value={progress}
        color={progressColor}
        sx={{ mt: 1, height: 6, borderRadius: 1 }}
      />

      <MUIDialog open={deleteOpen} onOpenChange={setDeleteOpen} size="sm">
        <MUIDialogHeader>
          <MUIDialogTitle>Delete &quot;{term.name}&quot;?</MUIDialogTitle>
          <MUIDialogDescription>
            This payment term will be removed permanently. Receipts already linked to it (if any)
            are unaffected, but you cannot undo this action.
          </MUIDialogDescription>
        </MUIDialogHeader>
        <MUIDialogBody>
          <MUITypography variant="body" className="text-foreground-secondary">
            Expected: <span className="font-mono">{formatCurrency(expected)}</span>
          </MUITypography>
        </MUIDialogBody>
        <MUIDialogFooter>
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => setDeleteOpen(false)}
            disabled={remove.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
            disabled={remove.isPending}
          >
            {remove.isPending ? 'Deleting…' : 'Delete term'}
          </Button>
        </MUIDialogFooter>
      </MUIDialog>
    </div>
  );
}
