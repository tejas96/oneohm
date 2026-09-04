'use client';

import { History } from 'lucide-react';
import React from 'react';

import {
  ColumnHeader,
  DetailCard,
  EmptyPane,
  Mono,
  ROW_BLEED,
  TONE,
  TonePill,
  type Tone,
} from '../../primitives';

import { Skeleton } from '@/components/ui/skeleton';
import {
  useBomChanges,
  useProjectBom,
  type BomChange,
  type BomChangeType,
} from '@/lib/hooks/resources';
import { cn, formatCurrency, formatDate, formatFollowupClockTime, formatNumber } from '@/lib/utils';

interface BomChangesPanelProps {
  projectId: string;
}

const TYPE_LABEL: Record<BomChangeType, string> = {
  add: 'Added',
  quantity: 'Quantity changed',
  remove: 'Removed',
  replace: 'Replaced',
};

const TYPE_TONE: Record<BomChangeType, Tone> = {
  add: 'success',
  quantity: 'warning',
  remove: 'danger',
  replace: 'info',
};

const COLS = 'grid-cols-[128px_minmax(180px,1.2fr)_110px_130px_150px_minmax(260px,2fr)]';

/**
 * `createdByName` is resolved server-side — the same shape as the ledger's
 * `recordedByName` / `approvedByName` (a `NULLIF(TRIM(CONCAT_WS(...)))` join
 * onto `users`, null rather than guessed when it doesn't resolve). Falling
 * back to the viewer's own session here would produce a plausible-looking
 * WRONG name on anyone else's edit, which is worse than an id — so the only
 * fallback is the durable `createdBy` uuid, shortened for legibility.
 */
function creatorLabel(change: BomChange): string {
  return change.createdByName ?? `${change.createdBy.slice(0, 8)}…`;
}

interface ProductInfo {
  name: string;
  unit: string;
}

/**
 * The BOM's append-only change log, newest first — every add, quantity
 * change, product swap and removal, with who made it, when, and why.
 *
 * `reason` is the column this panel exists for. Nothing here truncates it: a
 * change log nobody can read the reason on is no more legible than the raw
 * diff it replaces.
 */
export function BomChangesPanel({ projectId }: BomChangesPanelProps): React.JSX.Element {
  const { data: changes, isLoading, isError, refetch } = useBomChanges(projectId);
  // Same cache entry project-bom-tab.tsx already holds for this project — this
  // costs no extra request, and is how a row resolves a productId into a name
  // instead of showing a bare id.
  const { data: bom } = useProjectBom(projectId);

  const productInfo = React.useMemo(() => {
    const map = new Map<string, ProductInfo>();
    for (const item of bom?.items ?? []) {
      map.set(item.productId, { name: item.productName, unit: item.unit });
    }
    return map;
  }, [bom?.items]);

  const resolveProduct = React.useCallback(
    (id: string): ProductInfo => productInfo.get(id) ?? { name: id, unit: '' },
    [productInfo],
  );

  return (
    <DetailCard
      label="Change log"
      aside={
        changes && changes.length > 0
          ? `${formatNumber(changes.length)} ${changes.length === 1 ? 'change' : 'changes'}`
          : undefined
      }
      isError={isError}
      onRetry={() => {
        void refetch();
      }}
      errorHeight={200}
      className="col-span-12"
    >
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : !changes || changes.length === 0 ? (
        <EmptyPane
          icon={<History className="size-4" strokeWidth={2} />}
          title="No changes yet"
          description="Every add, quantity change, product swap and removal on this BOM appears here with who made it, when, and why."
        />
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[980px]">
            <div className={cn('grid items-center gap-3 pb-1.5', ROW_BLEED, COLS)} aria-hidden>
              <ColumnHeader>Change</ColumnHeader>
              <ColumnHeader>Product</ColumnHeader>
              <ColumnHeader className="text-right">Quantity</ColumnHeader>
              <ColumnHeader className="text-right">Cost impact</ColumnHeader>
              <ColumnHeader>Who &amp; when</ColumnHeader>
              <ColumnHeader>Reason</ColumnHeader>
            </div>

            {changes.map((change) => (
              <ChangeRow
                key={change.id}
                change={change}
                resolveProduct={resolveProduct}
                creatorName={creatorLabel(change)}
              />
            ))}
          </div>
        </div>
      )}
    </DetailCard>
  );
}

function ChangeRow({
  change,
  resolveProduct,
  creatorName,
}: {
  change: BomChange;
  resolveProduct: (id: string) => ProductInfo;
  creatorName: string;
}): React.JSX.Element {
  const product = resolveProduct(change.productId);
  const productLabel =
    change.changeType === 'replace' && change.replacedProductId
      ? `${resolveProduct(change.replacedProductId).name} → ${product.name}`
      : product.name;

  // A replace moves no quantity — before and after are the same number, only
  // the product differs. Showing "12 → 12" would read as "nothing happened"
  // for the one change type where the quantity column's job is to say
  // "nothing happened here, look at Product instead".
  const sameQuantity =
    change.quantityBefore != null &&
    change.quantityAfter != null &&
    change.quantityBefore === change.quantityAfter;

  const quantityLabel = sameQuantity
    ? formatNumber(change.quantityAfter as number)
    : `${change.quantityBefore == null ? '—' : formatNumber(change.quantityBefore)} → ${
        change.quantityAfter == null ? '—' : formatNumber(change.quantityAfter)
      }`;

  return (
    <div
      className={cn(
        'grid items-start gap-3 rounded-xl py-3 transition-colors duration-fast even:bg-surface-alt hover:bg-background-tertiary',
        ROW_BLEED,
        COLS,
      )}
    >
      <div>
        <TonePill label={TYPE_LABEL[change.changeType]} tone={TYPE_TONE[change.changeType]} />
      </div>

      <div
        className="min-w-0 whitespace-normal break-words text-[12.5px] font-medium text-foreground"
        title={productLabel}
      >
        {productLabel}
      </div>

      <Mono className="text-right text-[12.5px] text-foreground-secondary">
        {quantityLabel}
        {product.unit ? (
          <span className="ml-1 font-sans text-[11px] text-foreground-tertiary">
            {product.unit}
          </span>
        ) : null}
      </Mono>

      <Mono
        className="text-right text-[12.5px] font-medium"
        style={{
          color:
            change.costImpactPaise === 0
              ? undefined
              : change.costImpactPaise > 0
                ? TONE.warning.ink
                : TONE.success.ink,
        }}
      >
        {change.costImpactPaise === 0
          ? '—'
          : `${change.costImpactPaise > 0 ? '+' : '−'}${formatCurrency(Math.abs(change.costImpactPaise) / 100)}`}
      </Mono>

      <div className="min-w-0 text-[11.5px] leading-snug text-foreground-secondary">
        <div className="truncate">{creatorName}</div>
        <div className="text-foreground-tertiary">
          {formatDate(change.createdAt)} · {formatFollowupClockTime(change.createdAt)}
        </div>
      </div>

      <p className="whitespace-normal break-words text-[12.5px] leading-relaxed text-foreground">
        {change.reason}
      </p>
    </div>
  );
}
