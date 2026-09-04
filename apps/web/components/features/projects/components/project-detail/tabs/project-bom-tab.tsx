'use client';

import { PackageCheck, PackageX } from 'lucide-react';
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
} from '../primitives';
import { BillCustomerDialog } from './bom/bill-customer-dialog';
import { BomChangesPanel } from './bom/bom-changes-panel';
import { ProjectWarehouseSelector } from './overview/project-warehouse-selector';

import { ProcurementSection } from '@/components/features/projects/components/procurement/procurement-section';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useAllocateBomPending,
  useBomProcurementStatus,
  useProjectBom,
  type BomItem,
  type BomLineChangeState,
} from '@/lib/hooks/resources';
import { useGatedAction } from '@/lib/rbac';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';

interface ProjectBomTabProps {
  projectId: string;
  defaultWarehouseId?: string;
}

const CHANGE_TONE: Record<BomLineChangeState, Tone> = {
  unchanged: 'neutral',
  added: 'success',
  increased: 'warning',
  decreased: 'warning',
  removed: 'danger',
};

const CHANGE_LABEL: Record<BomLineChangeState, string> = {
  unchanged: 'As quoted',
  added: 'Added',
  increased: 'Increased',
  decreased: 'Reduced',
  removed: 'Removed',
};

type RowSource = BomItem['source'];

const SOURCE_TONE: Record<RowSource, Tone> = {
  quote: 'neutral',
  site: 'info',
  office: 'accent',
};

const SOURCE_LABEL: Record<RowSource, string> = {
  quote: 'Quote',
  site: 'Site',
  office: 'Office',
};

type RowAllocStatus = BomItem['allocationStatus'];

const ALLOC_TONE: Record<RowAllocStatus, Tone> = {
  allocated: 'success',
  partial: 'warning',
  pending: 'neutral',
};

const ALLOC_LABEL: Record<RowAllocStatus, string> = {
  allocated: 'Reserved',
  partial: 'Partial',
  pending: 'Pending',
};

const COLS = 'grid-cols-[minmax(180px,1.6fr)_84px_84px_108px_112px_112px_84px_100px]';

/** One number in the four-figure header: overline label, large mono value. */
function Stat({
  label,
  value,
  tone,
  action,
}: {
  label: string;
  value: string;
  tone?: Tone;
  /** A small control beside the value — used only by "Change since quote". */
  action?: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="min-w-0">
      <dt className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-foreground-secondary">
        {label}
      </dt>
      <dd className="mt-1.5 flex min-w-0 items-center gap-2">
        <span
          className="min-w-0 truncate text-[20px] font-bold leading-none tracking-[-0.025em] tabular-nums"
          style={{ color: tone ? TONE[tone].ink : 'var(--ds-text-primary)' }}
        >
          {value}
        </span>
        {action}
      </dd>
    </div>
  );
}

/**
 * The bill of materials: what was quoted, what the project needs now, and
 * the difference between them.
 *
 * The bill is seeded from the quote version pinned at conversion, and can be
 * edited on site from there — a quantity bumped, a product swapped, a line
 * added or taken off — with every edit reasoned and attributed in the change
 * log (`GET .../bom/changes`). A removed line is never deleted: it stays at
 * quantity zero, struck through here, so what was dropped from the quote
 * stays visible against the baseline instead of disappearing. Reserving
 * stock is still the action this tab exists for — without it nothing ever
 * leaves Pending — which is why it sits in the card header next to the
 * warehouse it draws from.
 */
export const ProjectBomTab = React.memo(
  ({ projectId, defaultWarehouseId }: ProjectBomTabProps): React.JSX.Element => {
    const { data: bom, isLoading, isError, refetch } = useProjectBom(projectId);
    const { execute: allocatePending, isPending: isAllocating } = useAllocateBomPending();
    // Same cache entry the Procurement section below reads — one network
    // call serves both, react-query dedupes the identical query key.
    const { data: procurement } = useBomProcurementStatus(projectId);
    const [billingOpen, setBillingOpen] = React.useState(false);
    // A BOM edit never moves the contract by itself — billing is the one
    // explicit human action that does, and it moves money just like the
    // money tab's own record-payment and change-order buttons.
    const billCustomer = useGatedAction(
      'finance.payments.record',
      () => setBillingOpen(true),
      'Bill customer',
    );

    const isFullyAllocated = bom?.allocationStatus === 'fully_allocated';
    const hasAnyAllocation = bom?.allocationStatus === 'partial' || isFullyAllocated;
    const actualSpend = procurement?.totals.actualSpend ?? 0;

    return (
      <div className="grid grid-cols-12 gap-4">
        <DetailCard
          label="Materials"
          aside={
            bom
              ? `${formatNumber(bom.totals.lineCount)} ${bom.totals.lineCount === 1 ? 'line' : 'lines'}`
              : undefined
          }
          isError={isError}
          onRetry={() => {
            void refetch();
          }}
          errorHeight={240}
          action={
            <div className="flex items-center gap-2">
              {isFullyAllocated ? (
                <TonePill label="Stock reserved" tone="success" dot />
              ) : bom?.id ? (
                <button
                  type="button"
                  onClick={() => void allocatePending(bom.id)}
                  // Reserving without a warehouse is rejected by the server, so
                  // the button says why up front instead of failing on click.
                  disabled={isAllocating || !defaultWarehouseId}
                  title={
                    defaultWarehouseId
                      ? "Reserves stock from the project's warehouse. A partial reservation is allowed."
                      : 'Choose the warehouse this project draws from first.'
                  }
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-pill bg-primary px-3.5 text-[12.5px] font-medium text-white transition-[filter,transform] duration-fast hover:brightness-105 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <PackageCheck className="size-3.5" strokeWidth={2} aria-hidden />
                  {isAllocating ? 'Reserving…' : 'Reserve stock'}
                </button>
              ) : null}
            </div>
          }
          className="col-span-12"
        >
          {isLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-[76px] rounded-2xl" />
              <Skeleton className="h-14 rounded-2xl" />
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-11 rounded-xl" />
              ))}
            </div>
          ) : !bom || bom.items.length === 0 ? (
            <EmptyPane
              size="page"
              icon={<PackageX className="size-4" strokeWidth={2} />}
              title="No bill of materials"
              description="The bill is seeded from the project's pinned quote version. It appears here once that quote carries line items."
            />
          ) : (
            <>
              {!bom.totals.reconciles ? (
                <p
                  className="mb-3 rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed"
                  style={{ background: TONE.danger.tint, color: TONE.danger.ink }}
                >
                  <span className="font-semibold">This BOM does not reconcile.</span> The change
                  log and the line items disagree on the total. Nothing below should be trusted
                  until this is fixed.
                </p>
              ) : null}

              <dl className="mb-4 grid gap-4 md:grid-cols-4">
                <Stat
                  label="Quoted materials"
                  value={formatCurrency(bom.totals.quotedPaise / 100)}
                />
                <Stat
                  label="Current materials"
                  value={formatCurrency(bom.totals.currentPaise / 100)}
                />
                <Stat
                  label="Change since quote"
                  value={`${bom.totals.variancePaise >= 0 ? '+' : '−'}${formatCurrency(Math.abs(bom.totals.variancePaise) / 100)}`}
                  tone={
                    bom.totals.variancePaise === 0
                      ? 'neutral'
                      : bom.totals.variancePaise > 0
                        ? 'warning'
                        : 'success'
                  }
                  action={
                    <button
                      type="button"
                      onClick={billCustomer.onGatedClick}
                      aria-disabled={!billCustomer.allowed}
                      disabled={bom.totals.variancePaise <= 0}
                      title={
                        bom.totals.variancePaise <= 0
                          ? 'Nothing to bill — material cost has not increased since the quote.'
                          : 'Raise a change order for the increase in material cost since the quote.'
                      }
                      className="inline-flex h-6 shrink-0 items-center rounded-pill bg-primary px-2.5 text-[10.5px] font-semibold text-white transition-[filter] duration-fast hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      Bill customer
                    </button>
                  }
                />
                <Stat label="Spent so far" value={formatCurrency(actualSpend)} />
              </dl>

              <ProjectWarehouseSelector
                projectId={projectId}
                defaultWarehouseId={defaultWarehouseId}
                locked={hasAnyAllocation}
              />

              {bom.allocationStatus === 'partial' ? (
                <p
                  className="mb-3 rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed"
                  style={{ background: TONE.warning.tint, color: TONE.warning.ink }}
                >
                  <span className="font-semibold">Some lines are still pending.</span> Stock ran out
                  part way through. Replenish the warehouse and reserve again.
                </p>
              ) : null}

              <div className="overflow-x-auto">
                <div className="min-w-[960px]">
                  <div className={cn('grid items-center gap-3 pb-1.5', ROW_BLEED, COLS)} aria-hidden>
                    <ColumnHeader>Product</ColumnHeader>
                    <ColumnHeader className="text-right">Quoted</ColumnHeader>
                    <ColumnHeader className="text-right">Now</ColumnHeader>
                    <ColumnHeader className="text-right">Unit price</ColumnHeader>
                    <ColumnHeader className="text-right">Line total</ColumnHeader>
                    <ColumnHeader className="text-right">Variance</ColumnHeader>
                    <ColumnHeader>Source</ColumnHeader>
                    <ColumnHeader>Stock</ColumnHeader>
                  </div>

                  {bom.items.map((item) => {
                    const removed = item.changeState === 'removed';
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'grid items-center gap-3 rounded-xl py-2.5 transition-colors duration-fast even:bg-surface-alt hover:bg-background-tertiary',
                          ROW_BLEED,
                          COLS,
                        )}
                      >
                        <div className="min-w-0">
                          <span
                            className={cn(
                              'block truncate text-[12.5px] font-medium text-foreground',
                              removed && 'text-foreground-tertiary line-through',
                            )}
                          >
                            {item.productName}
                          </span>
                          <span className="mt-0.5 flex min-w-0 items-center gap-1.5">
                            {item.brandName ? (
                              <span className="truncate text-[11px] text-foreground-tertiary">
                                {item.brandName}
                              </span>
                            ) : null}
                            <TonePill
                              label={CHANGE_LABEL[item.changeState]}
                              tone={CHANGE_TONE[item.changeState]}
                              className="h-[18px] shrink-0 px-1.5 text-[10px]"
                            />
                          </span>
                        </div>

                        <Mono className="text-right text-[12.5px] text-foreground-secondary">
                          {item.quotedQuantity != null ? (
                            <>
                              {formatNumber(item.quotedQuantity)}
                              <span className="ml-1 font-sans text-[11px] text-foreground-tertiary">
                                {item.unit}
                              </span>
                            </>
                          ) : (
                            '—'
                          )}
                        </Mono>

                        <Mono
                          className={cn(
                            'text-right text-[12.5px]',
                            removed ? 'text-foreground-tertiary line-through' : 'text-foreground',
                          )}
                        >
                          {formatNumber(item.quantity)}
                          <span className="ml-1 font-sans text-[11px] text-foreground-tertiary">
                            {item.unit}
                          </span>
                        </Mono>

                        <Mono className="text-right text-[12.5px] text-foreground-secondary">
                          {formatCurrency(item.unitPricePaise / 100)}
                        </Mono>

                        <Mono className="text-right text-[12.5px] font-medium text-foreground">
                          {formatCurrency(item.currentTotalPaise / 100)}
                        </Mono>

                        <Mono
                          className="text-right text-[12.5px] font-medium"
                          style={{
                            color:
                              item.variancePaise === 0
                                ? undefined
                                : item.variancePaise > 0
                                  ? TONE.warning.ink
                                  : TONE.success.ink,
                          }}
                        >
                          {item.variancePaise === 0
                            ? '—'
                            : `${item.variancePaise > 0 ? '+' : '−'}${formatCurrency(Math.abs(item.variancePaise) / 100)}`}
                        </Mono>

                        <div>
                          <TonePill
                            label={SOURCE_LABEL[item.source]}
                            tone={SOURCE_TONE[item.source]}
                          />
                        </div>

                        <div>
                          <TonePill
                            label={ALLOC_LABEL[item.allocationStatus]}
                            tone={ALLOC_TONE[item.allocationStatus]}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </DetailCard>

        <BomChangesPanel projectId={projectId} />

        <div className="col-span-12">
          <ProcurementSection projectId={projectId} />
        </div>

        {bom ? (
          <BillCustomerDialog
            projectId={projectId}
            variancePaise={bom.totals.variancePaise}
            open={billingOpen}
            onClose={() => setBillingOpen(false)}
          />
        ) : null}
      </div>
    );
  },
);

ProjectBomTab.displayName = 'ProjectBomTab';
