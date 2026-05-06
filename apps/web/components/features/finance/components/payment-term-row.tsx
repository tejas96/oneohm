'use client';

import {
  PAYMENT_TERM_SOURCE_LABELS,
  PAYMENT_TERM_STATUS_LABELS,
} from '@oneohm-epc/shared/constants';
import { PaymentTermStatus } from '@oneohm-epc/shared/types';
import { CalendarDays, Hand, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import { type JSX, useState } from 'react';

import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Progress,
} from '@/components/ui';
import { type PaymentTerm, usePaymentTermMutations } from '@/lib/hooks/resources';
import { formatCurrency, formatDate } from '@/lib/utils';

import { PAYMENT_TERM_STATUS_BADGE_VARIANT } from '../constants';

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
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  const handleDelete = (): void => {
    if (confirmDelete) {
      remove.mutate(term.id);
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
      window.setTimeout(() => setConfirmDelete(false), 4000);
    }
  };

  return (
    <div className="rounded-lg border border-border-light bg-background p-4 hover:border-border transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-2xs font-mono text-foreground-muted">#{term.displayOrder}</span>
            <span className="text-sm font-semibold text-foreground truncate">{term.name}</span>
            <Badge
              variant={
                (PAYMENT_TERM_STATUS_BADGE_VARIANT[term.status] ?? 'secondary') as 'success'
              }
              size="xs"
            >
              {PAYMENT_TERM_STATUS_LABELS[term.status] ?? term.status}
            </Badge>
            {isOverdue && (
              <Badge variant="error" size="xs">
                Overdue
              </Badge>
            )}
            <span className="text-2xs text-foreground-muted">
              {PAYMENT_TERM_SOURCE_LABELS[term.source] ?? term.source}
            </span>
          </div>

          {term.stage && (
            <p className="text-2xs text-foreground-secondary mt-1">{term.stage}</p>
          )}

          {term.dueDate && (
            <p className="text-2xs text-foreground-muted mt-1 flex items-center gap-1">
              <CalendarDays className="size-3" />
              Due {formatDate(term.dueDate, 'medium')}
            </p>
          )}

          {term.status === PaymentTermStatus.WAIVED && term.waivedReason && (
            <p className="text-2xs text-foreground-muted mt-1 italic">
              Waived: {term.waivedReason}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isTerminal && (
            <Button size="sm" variant="outline" onClick={() => onRecordReceipt(term.id)}>
              <Plus className="size-3.5 mr-1" />
              Receipt
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" aria-label="More actions">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onWaive(term)} disabled={!canWaive}>
                <Hand className="size-3.5 mr-2" />
                Waive…
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                disabled={!canDelete || remove.isPending}
                className="text-error"
              >
                <Trash2 className="size-3.5 mr-2" />
                {confirmDelete ? 'Click again to confirm' : 'Delete'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
        <div>
          <p className="text-2xs text-foreground-muted uppercase">Expected</p>
          <p className="font-medium text-foreground">{formatCurrency(expected)}</p>
        </div>
        <div>
          <p className="text-2xs text-foreground-muted uppercase">Paid</p>
          <p className="font-medium text-success">{formatCurrency(paid)}</p>
        </div>
        <div>
          <p className="text-2xs text-foreground-muted uppercase">Remaining</p>
          <p className="font-medium text-foreground">{formatCurrency(remaining)}</p>
        </div>
      </div>

      <div className="mt-2">
        <Progress value={progress} variant={isOverdue ? 'error' : progress >= 100 ? 'success' : 'primary'} />
      </div>
    </div>
  );
}
