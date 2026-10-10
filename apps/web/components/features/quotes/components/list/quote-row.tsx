'use client';

import BlockIcon from '@mui/icons-material/Block';
import AlertIcon from '@mui/icons-material/ErrorOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { IconButton, ListItemIcon, Menu, MenuItem } from '@mui/material';
import { type DealStage, QuoteStatus } from '@tejas96/shared/types';
import { DEAL_STAGE_LABELS, indiaToday } from '@tejas96/shared/utils';
import { useRouter } from 'next/navigation';
import { type JSX, type MouseEvent, memo, useState } from 'react';

import { useDeleteQuote, type QuoteListItem } from '../../hooks';
import { type BadgeVariant, QuoteStatusDropdown } from '../quote-status-dropdown';
import { VoidQuoteDialog } from '../void-quote-dialog';

import { ABOVE, BONE, CalmRow, SKELETON_CARD, stopRowClick } from '@/components/shared/calm-list';
import { DeleteConfirmationDialog } from '@/components/shared/delete-confirmation-dialog';
import { MUIAvatar } from '@/components/ui/mui-avatar';
import { showToast } from '@/components/ui/sonner';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { useGatedAction } from '@/lib/rbac';
import {
  cn,
  formatBusinessDate,
  formatCurrency,
  formatSystemSize,
  getErrorMessage,
} from '@/lib/utils';

/**
 * Wide: who · stage · made by · value · ⋮ on one line. Narrow (the list itself
 * under 960px, so an open side panel counts): who and ⋮, then stage and value,
 * then made by.
 */
const ROW_GRID =
  'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 @[960px]:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,1fr)_132px_34px] @[960px]:gap-[22px]';

const WIDE = '@[960px]:col-auto @[960px]:row-auto';
const CELL = {
  who: `col-start-1 row-start-1 ${WIDE}`,
  stage: `col-start-1 row-start-2 ${WIDE}`,
  made: `col-span-2 row-start-3 ${WIDE}`,
  value: `col-start-2 row-start-2 ${WIDE}`,
  actions: `col-start-2 row-start-1 ${WIDE}`,
} as const;

/** Badge color for each deal stage, matching the dashboard's stage blocks. */
const STAGE_VARIANT: Record<DealStage, BadgeVariant> = {
  drafting: 'muted',
  waiting: 'info',
  quiet: 'error',
  won: 'success',
  lost: 'muted',
};

/** The quote row's ⋮ menu: the same items and gates the table's menu had. */
function RowActionsMenu({ quote }: { quote: QuoteListItem }): JSX.Element {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [voidOpen, setVoidOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteQuoteMutation = useDeleteQuote();

  const handleClose = (): void => setAnchorEl(null);
  const removeQuote = useGatedAction('quotes.delete', () => undefined, 'Delete quote');

  const handleDelete = (): void => {
    handleClose();
    if (!removeQuote.allowed) {
      removeQuote.onGatedClick();
      return;
    }
    setDeleteOpen(true);
  };

  const confirmDelete = (): void => {
    deleteQuoteMutation.mutate(quote.id, {
      onSuccess: () => {
        setDeleteOpen(false);
        showToast.success('Quote deleted');
      },
      onError: (err) => showToast.error(getErrorMessage(err)),
    });
  };

  const handleVoid = (): void => {
    handleClose();
    if (!removeQuote.allowed) {
      removeQuote.onGatedClick();
      return;
    }
    setVoidOpen(true);
  };

  /*
    Same split as the quote detail header: a draft is deletable because nobody
    outside the office has seen it, and anything already in front of the
    customer is voidable instead - deleting it would leave them holding a PDF
    and a notification pointing at a row that no longer answers.

    Both sit behind `quotes.delete`. Void is the gentler of the two (it keeps
    the quote), so it needs no permission of its own, and a new permission code
    would start out granted to nobody and read as a missing button.
  */
  const isVoided = Boolean(quote.voidedAt);
  const canDelete = !isVoided && quote.status === QuoteStatus.DRAFT;
  const canVoid =
    !isVoided && (quote.status === QuoteStatus.SENT || quote.status === QuoteStatus.VIEWED);

  return (
    <>
      <IconButton
        size="small"
        onClick={(e: MouseEvent) => {
          e.stopPropagation();
          setAnchorEl(e.currentTarget as HTMLElement);
        }}
        aria-label="Row actions"
        title="More actions"
        className="size-[34px] text-foreground-secondary transition-transform duration-200 ease-calm hover:scale-[1.08] hover:bg-background-tertiary motion-reduce:transition-none"
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        onClick={(e) => e.stopPropagation()}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { elevation: 2, sx: { minWidth: 180 } } }}
      >
        <MenuItem
          onClick={() => {
            handleClose();
            void router.push(buildRoute(ROUTES.QUOTES.DETAIL, { id: quote.id }));
          }}
        >
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          View Details
        </MenuItem>

        {canDelete && (
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <AlertIcon fontSize="small" sx={{ color: 'error.main' }} />
            </ListItemIcon>
            Delete
          </MenuItem>
        )}

        {canVoid && (
          <MenuItem onClick={handleVoid} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <BlockIcon fontSize="small" sx={{ color: 'error.main' }} />
            </ListItemIcon>
            Void
          </MenuItem>
        )}
      </Menu>

      <DeleteConfirmationDialog
        open={deleteOpen}
        title="Delete quote"
        itemName={quote.quoteNumber}
        permanent={false}
        isPending={deleteQuoteMutation.isPending}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
      />

      <VoidQuoteDialog
        open={voidOpen}
        onOpenChange={setVoidOpen}
        quoteId={quote.id}
        quoteNumber={quote.quoteNumber}
        customerName={quote.customerName}
      />
    </>
  );
}

export interface QuoteRowProps {
  quote: QuoteListItem;
  index: number;
  /** True only while the list makes its first entrance. */
  entering: boolean;
}

/**
 * One quote, one line: who it is for, where the deal stands, who made it, what
 * it is worth. The row opens the quote; the stage badge still changes the
 * quote's status in place, as it did in the table.
 */
function QuoteRowInner({ quote, index, entering }: QuoteRowProps): JSX.Element {
  const name = quote.customerName ?? 'Unknown';
  const meta = [quote.quoteNumber, quote.propertyName].filter(Boolean).join(' · ');
  // Same rule as the deal stage: valid through the whole of its last IST day.
  const expired = Boolean(quote.validUntil) && quote.validUntil.slice(0, 10) < indiaToday();

  return (
    <CalmRow
      rowId={quote.id}
      className={ROW_GRID}
      label={`Open quote ${quote.quoteNumber} for ${name}`}
      href={buildRoute(ROUTES.QUOTES.DETAIL, { id: quote.id })}
      index={index}
      entering={entering}
    >
      {/* Who */}
      <div className={cn(CELL.who, ABOVE, 'flex min-w-0 items-center gap-3.5')}>
        <MUIAvatar
          name={name}
          size={44}
          aria-hidden
          sx={{ flexShrink: 0, fontSize: 15, fontWeight: 600 }}
        />
        <div className="min-w-0">
          <div title={name} className="truncate text-[16px] font-semibold tracking-[-0.01em]">
            {name}
          </div>
          <div title={meta} className="truncate text-[13px] text-foreground-secondary">
            {meta}
          </div>
        </div>
      </div>

      {/* Stage. The badge reads as the deal stage; the dropdown still changes the quote's status. */}
      <div className={cn(CELL.stage, ABOVE, 'min-w-0')}>
        <div onClick={stopRowClick} className="w-max max-w-full">
          <QuoteStatusDropdown
            quoteId={quote.id}
            status={quote.status}
            voidedAt={quote.voidedAt}
            voidReason={quote.voidReason}
            size="sm"
            label={quote.dealStage ? DEAL_STAGE_LABELS[quote.dealStage] : undefined}
            variant={quote.dealStage ? STAGE_VARIANT[quote.dealStage] : undefined}
          />
        </div>
        {quote.validUntil ? (
          <div
            className={cn(
              'mt-1 truncate text-[12px]',
              expired ? 'text-error' : 'text-foreground-tertiary',
            )}
          >
            valid till {formatBusinessDate(quote.validUntil)}
          </div>
        ) : null}
      </div>

      {/* Made by */}
      <div className={cn(CELL.made, ABOVE, 'min-w-0')}>
        <div
          title={quote.createdByName ? `Made by ${quote.createdByName}` : undefined}
          className={cn(
            'truncate text-[14px]',
            quote.createdByName ? 'text-foreground' : 'text-foreground-tertiary',
          )}
        >
          {quote.createdByName ?? 'Maker not recorded'}
        </div>
        {quote.createdAt ? (
          <div className="truncate text-[12px] text-foreground-tertiary">
            made {formatBusinessDate(quote.createdAt)}
          </div>
        ) : null}
      </div>

      {/* Value */}
      <div
        className={cn(CELL.value, ABOVE, 'flex flex-col items-end whitespace-nowrap text-right')}
      >
        {quote.finalPrice != null ? (
          <span className="text-[16px] font-semibold tabular-nums">
            {formatCurrency(quote.finalPrice)}
          </span>
        ) : (
          <span className="text-[13px] text-foreground-tertiary">No price yet</span>
        )}
        <small className="block text-[12px] font-normal text-foreground-tertiary">
          {formatSystemSize(quote.systemSizeKw)} kW
        </small>
      </div>

      {/* ⋮ — a click on the menu, or on the backdrop that closes it, never opens the quote. */}
      <div className={cn(CELL.actions, ABOVE, 'flex justify-end')} onClick={stopRowClick}>
        <RowActionsMenu quote={quote} />
      </div>
    </CalmRow>
  );
}

export const QuoteRow = memo(QuoteRowInner);

/** One placeholder shaped like a quote row, so nothing jumps when data lands. */
export function QuoteRowSkeleton(): JSX.Element {
  return (
    <div className={cn(ROW_GRID, SKELETON_CARD)}>
      <div className={cn(CELL.who, 'flex items-center gap-3.5')}>
        <span className={cn(BONE, 'size-11 flex-none')} />
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <span className={cn(BONE, 'h-4 w-3/5')} />
          <span className={cn(BONE, 'h-3 w-4/5')} />
        </span>
      </div>
      <div className={cn(CELL.stage, 'flex flex-col gap-2')}>
        <span className={cn(BONE, 'h-5 w-20')} />
        <span className={cn(BONE, 'h-3 w-28')} />
      </div>
      <div className={cn(CELL.made, 'flex flex-col gap-2')}>
        <span className={cn(BONE, 'h-3.5 w-2/3')} />
        <span className={cn(BONE, 'h-3 w-1/2')} />
      </div>
      <div className={cn(CELL.value, 'flex flex-col items-end gap-2')}>
        <span className={cn(BONE, 'h-4 w-20')} />
        <span className={cn(BONE, 'h-3 w-12')} />
      </div>
      <div className={cn(CELL.actions, 'flex justify-end')}>
        <span className={cn(BONE, 'size-[34px]')} />
      </div>
    </div>
  );
}
