'use client';

import MoreVertIcon from '@mui/icons-material/MoreVert';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { IconButton, ListItemIcon, Menu, MenuItem } from '@mui/material';
import { type JSX, memo, useState } from 'react';

import { ABOVE, BONE, CalmRow, SKELETON_CARD, stopRowClick } from '@/components/shared/calm-list';
import { CrmStatusPill } from '@/components/shared/crm-table';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import type { ResellerSummary } from '@/lib/hooks/resources/resellers';
import { color } from '@/lib/theme/tokens';
import { cn } from '@/lib/utils';
import { formatPaise } from '@/lib/utils/paise';

const NOTE = 'block truncate text-[12px] text-foreground-tertiary';

/** One of the five money figures: the amount (a dash for none) over its name. */
function Money({
  paise,
  label,
  danger,
}: {
  paise: number;
  label: string;
  danger?: boolean;
}): JSX.Element {
  return (
    <>
      <span
        className="block whitespace-nowrap text-[14px] tabular-nums"
        style={{
          color: paise === 0 ? color['text-tertiary'] : danger ? color.danger : undefined,
        }}
      >
        {paise === 0 ? '—' : formatPaise(paise)}
      </span>
      <span className={NOTE}>{label}</span>
    </>
  );
}

/** Always visible `⋮` — never a hover reveal. */
function RowMenu({
  row,
  onOpen,
}: {
  row: ResellerSummary;
  onOpen: (r: ResellerSummary) => void;
}): JSX.Element {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <IconButton
        size="small"
        aria-label={`Actions for ${row.name}`}
        onClick={(e) => {
          e.stopPropagation();
          setAnchor(e.currentTarget);
        }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        onClick={(e) => e.stopPropagation()}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            setAnchor(null);
            onOpen(row);
          }}
        >
          <ListItemIcon>
            <OpenInNewIcon fontSize="small" />
          </ListItemIcon>
          Open
        </MenuItem>
      </Menu>
    </>
  );
}

/**
 * Wide: reseller · rate · funnel · revenue · pending · owed · paid · to
 * recover · ⋮ on one line. Nine facts need room, so this row goes wide late
 * (the list itself at 1080px); each amount has its own track and is never cut
 * short. Narrow: the reseller and ⋮, then rate beside the funnel, then the
 * five amounts three to a line (two on a phone, under 460px).
 */
const ROW_GRID =
  'grid grid-cols-2 items-center gap-x-4 gap-y-2.5 @[460px]:grid-cols-3 @[1080px]:grid-cols-[minmax(0,1fr)_60px_136px_132px_108px_108px_108px_108px_34px] @[1080px]:gap-4';

const WIDE = '@[1080px]:col-auto @[1080px]:row-auto';
const CELL = {
  who: `col-start-1 row-start-1 @[460px]:col-span-2 ${WIDE}`,
  actions: `col-start-2 row-start-1 @[460px]:col-start-3 ${WIDE}`,
  rate: `col-start-1 row-start-2 ${WIDE}`,
  funnel: `col-start-2 row-start-2 @[460px]:col-span-2 ${WIDE}`,
  revenue: `col-start-1 row-start-3 @[1080px]:text-right ${WIDE}`,
  pending: `col-start-2 row-start-3 @[1080px]:text-right ${WIDE}`,
  owed: `col-start-1 row-start-4 @[460px]:col-start-3 @[460px]:row-start-3 @[1080px]:text-right ${WIDE}`,
  paid: `col-start-2 row-start-4 @[460px]:col-start-1 @[1080px]:text-right ${WIDE}`,
  recover: `col-start-1 row-start-5 @[460px]:col-start-2 @[460px]:row-start-4 @[1080px]:text-right ${WIDE}`,
} as const;

export interface ResellerRowProps {
  row: ResellerSummary;
  index: number;
  /** True only while the list makes its first entrance. */
  entering: boolean;
  onOpen: (r: ResellerSummary) => void;
}

/**
 * One reseller, one line: who, at what rate, how their leads convert, and the
 * five money figures. The row opens the reseller.
 */
function ResellerRowInner({ row: r, index, entering, onOpen }: ResellerRowProps): JSX.Element {
  return (
    <CalmRow
      rowId={r.resellerId}
      className={ROW_GRID}
      label={`Open reseller ${r.name}`}
      href={buildRoute(ROUTES.ORG.RESELLER_DETAIL, { id: r.resellerId })}
      index={index}
      entering={entering}
    >
      {/* Reseller — dimmed when no longer active. */}
      <div
        className={cn(CELL.who, ABOVE, 'min-w-0')}
        style={{ opacity: r.status === 'active' ? 1 : 0.55 }}
      >
        <span
          title={r.name}
          className="block truncate text-[15px] font-semibold tracking-[-0.01em]"
        >
          {r.name}
        </span>
        <span className="block truncate text-[13px] text-foreground-secondary">
          {[r.code, r.status !== 'active' ? r.status : null].filter(Boolean).join(' · ') || '—'}
        </span>
      </div>

      {/* Rate */}
      <div className={cn(CELL.rate, ABOVE, 'min-w-0')}>
        {r.ratePercent === null ? (
          <CrmStatusPill tone="warning" label="Not set" />
        ) : (
          <span className="block text-[14px] tabular-nums">{`${r.ratePercent}%`}</span>
        )}
        <span className={NOTE}>Rate</span>
      </div>

      {/* Leads → quoted → won, and the win rate */}
      <div className={cn(CELL.funnel, ABOVE, 'min-w-0')}>
        <span className="block whitespace-nowrap text-[14px] tabular-nums">
          {r.leads} → {r.quoted} → {r.won}
          <span className="ml-2 text-foreground-tertiary">
            {r.winRate === null ? '—' : `${r.winRate}%`}
          </span>
        </span>
        <span className={NOTE}>Leads → quoted → won</span>
      </div>

      <div className={cn(CELL.revenue, ABOVE, 'min-w-0')}>
        <Money paise={r.revenuePaise} label="Revenue" />
      </div>
      <div className={cn(CELL.pending, ABOVE, 'min-w-0')}>
        <Money paise={r.pendingPaise} label="Pending" />
      </div>
      <div className={cn(CELL.owed, ABOVE, 'min-w-0')}>
        <Money paise={r.owedPaise} label="Owed" />
      </div>
      <div className={cn(CELL.paid, ABOVE, 'min-w-0')}>
        <Money paise={r.paidPaise} label="Paid" />
      </div>
      <div className={cn(CELL.recover, ABOVE, 'min-w-0')}>
        <Money paise={r.toRecoverPaise} label="To recover" danger />
      </div>

      {/* ⋮ — a click here never opens the row. */}
      <div className={cn(CELL.actions, ABOVE, 'flex justify-end')} onClick={stopRowClick}>
        <RowMenu row={r} onOpen={onOpen} />
      </div>
    </CalmRow>
  );
}

export const ResellerRow = memo(ResellerRowInner);

/** One placeholder shaped like a reseller row, so nothing jumps when data lands. */
export function ResellerRowSkeleton(): JSX.Element {
  const money = (cell: string): JSX.Element => (
    <div className={cn(cell, 'flex flex-col gap-2 @[1080px]:items-end')}>
      <span className={cn(BONE, 'h-3.5 w-20')} />
      <span className={cn(BONE, 'h-3 w-12')} />
    </div>
  );
  return (
    <div className={cn(ROW_GRID, SKELETON_CARD)}>
      <div className={cn(CELL.who, 'flex flex-col gap-2')}>
        <span className={cn(BONE, 'h-4 w-3/5')} />
        <span className={cn(BONE, 'h-3 w-2/5')} />
      </div>
      <div className={cn(CELL.rate, 'flex flex-col gap-2')}>
        <span className={cn(BONE, 'h-3.5 w-8')} />
        <span className={cn(BONE, 'h-3 w-8')} />
      </div>
      <div className={cn(CELL.funnel, 'flex flex-col gap-2')}>
        <span className={cn(BONE, 'h-3.5 w-24')} />
        <span className={cn(BONE, 'h-3 w-28')} />
      </div>
      {money(CELL.revenue)}
      {money(CELL.pending)}
      {money(CELL.owed)}
      {money(CELL.paid)}
      {money(CELL.recover)}
      <div className={cn(CELL.actions, 'flex justify-end')}>
        <span className={cn(BONE, 'size-[34px]')} />
      </div>
    </div>
  );
}
