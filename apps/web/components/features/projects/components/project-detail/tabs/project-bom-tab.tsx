'use client';

import { PackageCheck, PackageX, Plus } from 'lucide-react';
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
import { AddBomItemDialog } from './bom/add-bom-item-dialog';
import { BillCustomerDialog } from './bom/bill-customer-dialog';
import { BomChangesPanel } from './bom/bom-changes-panel';
import { BomLineEditDialog, type BomLineEditMode } from './bom/bom-line-edit-dialog';
import { BomRowActions } from './bom/bom-row-actions';
import { ProjectWarehouseSelector } from './overview/project-warehouse-selector';

import { ProcurementSection } from '@/components/features/projects/components/procurement/procurement-section';
import { useQuoteDetail } from '@/components/features/quotes';
import { OtherCostsCard } from '@/components/features/quotes/components/quote-detail/tabs/overview/other-costs-card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useAllocateBomPending,
  useBomProcurementStatus,
  useProjectBom,
  type BomItem,
  type BomLineChangeState,
} from '@/lib/hooks/resources';
import { useProjectLedger } from '@/lib/hooks/resources/ledger';
import { useGatedAction } from '@/lib/rbac';
import { cn, formatCurrency, formatNumber, formatSystemSize } from '@/lib/utils';

interface ProjectBomTabProps {
  projectId: string;
  defaultWarehouseId?: string;
  /** The project's source quote, used only to look up the pinned baseline version's snapshot. */
  quoteId?: string;
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

// Trailing 36px column holds the per-row actions menu, on every row that has
// one. Present in the header too, empty, so header and body stay aligned.
const COLS = 'grid-cols-[minmax(180px,1.6fr)_84px_84px_108px_112px_112px_84px_100px_36px]';

/** One number in the four-figure header: overline label, large mono value. */
function Stat({
  label,
  value,
  tone,
  action,
  sub,
}: {
  label: string;
  value: string;
  tone?: Tone;
  /** A small control beside the value — used only by "Change since quote". */
  action?: React.ReactNode;
  /** A quiet line under the figure, for a fact the figure alone cannot carry. */
  sub?: React.ReactNode;
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
      {sub ? (
        <dd className="mt-1.5 text-[11px] leading-snug text-foreground-tertiary">{sub}</dd>
      ) : null}
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
  ({ projectId, defaultWarehouseId, quoteId }: ProjectBomTabProps): React.JSX.Element => {
    const { data: bom, isLoading, isError, refetch } = useProjectBom(projectId);
    const { execute: allocatePending, isPending: isAllocating } = useAllocateBomPending();
    // Same cache entry the Procurement section below reads — one network
    // call serves both, react-query dedupes the identical query key.
    const { data: procurement } = useBomProcurementStatus(projectId);
    // What has been agreed with the customer since signing. The BOM knows how
    // much the PLAN moved; only the ledger knows how much of that has been
    // turned into money owed, and the tab needs both to stop offering the whole
    // variance again on a project already billed for most of it.
    const { data: ledger } = useProjectLedger(projectId);
    const [billingOpen, setBillingOpen] = React.useState(false);
    const [addOpen, setAddOpen] = React.useState(false);
    // One piece of state drives the shared edit dialog: the row it acts on
    // (null closes it) and which of the three edits it is performing. The mode
    // is kept while closing so the dialog does not flicker to another title on
    // its way out.
    const [editing, setEditing] = React.useState<BomItem | null>(null);
    const [editMode, setEditMode] = React.useState<BomLineEditMode>('quantity');

    // The "Other costs" card needs the quote's base price and installation
    // breakdown as they stood when the contract was struck — not today's
    // quote, which may have moved on to later versions. `bom.baselineQuoteVersionId`
    // pins the exact version; fetching the whole quote and finding it
    // client-side reuses the existing `GET /quotes/:id` route (which already
    // returns every version's full snapshot) instead of adding a new one.
    const { data: baselineQuote } = useQuoteDetail(quoteId ?? '', { enabled: !!quoteId });
    const baselineVersion = baselineQuote?.versions?.find(
      (version) => version.id === bom?.baselineQuoteVersionId,
    );
    const baselineInstallation = baselineVersion?.quoteSnapshot?.calculation?.installation;
    const baselineBasePrice = baselineVersion?.quoteSnapshot?.pricing?.basePrice ?? 0;
    const baselineProfitabilityAmount =
      baselineVersion?.quoteSnapshot?.calculation?.profitabilityAmount;
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
    // Ledger expenses categorised `materials` for this project. Project-level:
    // the ledger records the money and its category, not which product it
    // bought, so this cannot be split per line.
    const materialSpend = procurement?.totals.materialSpend ?? 0;

    /*
     * Panel capacity as quoted versus as the bill now stands. Both are null
     * when the bill has no panels, or none carrying a rated wattage — in which
     * case the shortfall is unknown, not zero, and nothing is claimed.
     */
    /*
     * The variance is a fact about the material PLAN and never moves when the
     * customer is billed — billing does not take material back off the project,
     * and zeroing it here would destroy the answer to "what did we add after
     * the quote?", which is the question this tab exists for.
     *
     * But the button beside it acts on money, and offering the full variance on
     * a project already billed for most of it is how the same material gets
     * charged twice. So the figure stays and the line beneath says how much of
     * it is actually still unbilled; the button follows that remainder.
     *
     * `changeOrderPaise` is everything agreed after signing, not only what was
     * raised from this button — the change-order endpoint takes any amount for
     * any reason. So the remainder is a floor, clamped at zero, and the wording
     * says "in change orders" rather than claiming a precise BOM linkage that
     * does not exist in the data.
     */
    const variancePaise = bom?.totals.variancePaise ?? 0;
    const billedPaise = ledger?.changeOrderPaise ?? 0;
    const unbilledPaise = Math.max(0, variancePaise - billedPaise);

    const quotedWp = bom?.totals.quotedSystemWp ?? null;
    const currentWp = bom?.totals.currentSystemWp ?? null;
    const shortfallWp = quotedWp !== null && currentWp !== null ? quotedWp - currentWp : 0;
    const quotedKw = (quotedWp ?? 0) / 1000;
    const currentKw = (currentWp ?? 0) / 1000;

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
              {bom ? (
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  title="Add a product the quote did not carry."
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-pill border border-border px-3 text-[12.5px] font-medium text-foreground-secondary transition-colors duration-fast hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <Plus className="size-3.5" strokeWidth={2} aria-hidden />
                  Add material
                </button>
              ) : null}
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
                  <span className="font-semibold">This BOM does not reconcile.</span> The change log
                  and the line items disagree on the total. Nothing below should be trusted until
                  this is fixed.
                </p>
              ) : null}

              {/*
               * A falling material cost means one of two opposite things, and
               * the money cannot tell them apart. Swapping to a cheaper
               * structure leaves the customer with the system they signed for
               * and the saving is the company's. Dropping a panel does not —
               * and nothing on this project said so, because the system card
               * reads its size from the quote snapshot and never looks at the
               * bill, so it went on advertising 10 panels while this tab
               * carried 9.
               *
               * Shown whenever capacity has fallen, at any variance: a bill
               * can lose a panel and still cost MORE than quoted, and that is
               * the case most worth catching — the money looks like ordinary
               * extra scope while the customer quietly gets less.
               */}
              {shortfallWp > 0 ? (
                <p
                  className="mb-3 rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed"
                  style={{ background: TONE.warning.tint, color: TONE.warning.ink }}
                >
                  <span className="font-semibold">
                    This bill builds a smaller system than the quote sold.
                  </span>{' '}
                  {formatSystemSize(currentKw)} kW of panels against {formatSystemSize(quotedKw)} kW
                  quoted — {formatSystemSize(shortfallWp / 1000)} kW short. The customer signed for
                  the larger system, so either restore the panels or agree the smaller one with
                  them.
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
                  sub={
                    billedPaise > 0
                      ? `${formatCurrency(billedPaise / 100)} already in change orders · ${formatCurrency(unbilledPaise / 100)} not yet billed`
                      : undefined
                  }
                  action={
                    <button
                      type="button"
                      onClick={billCustomer.onGatedClick}
                      aria-disabled={!billCustomer.allowed}
                      // Follows what is UNBILLED, not the variance. The variance
                      // is a plan fact and stays put once billed; the button is
                      // about money, and on a project already billed for most of
                      // its change it was still offering the whole amount again.
                      disabled={unbilledPaise <= 0}
                      title={
                        bom.totals.variancePaise <= 0
                          ? 'Nothing to bill — material cost has not increased since the quote.'
                          : unbilledPaise <= 0
                            ? 'Already covered by change orders on this contract.'
                            : 'Raise a change order for the material cost not yet billed.'
                      }
                      className="inline-flex h-6 shrink-0 items-center rounded-pill bg-primary px-2.5 text-[10.5px] font-semibold text-white transition-[filter] duration-fast hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      Bill customer
                    </button>
                  }
                />
                <Stat
                  label="Spent on materials"
                  value={formatCurrency(materialSpend)}
                  tone={materialSpend > bom.totals.currentPaise / 100 ? 'warning' : undefined}
                />
              </dl>

              {baselineInstallation ? (
                <OtherCostsCard
                  installation={baselineInstallation}
                  bomTotal={bom.totals.quotedPaise / 100}
                  quoteBasePrice={baselineBasePrice}
                  profitabilityAmount={baselineProfitabilityAmount}
                  title="Other costs (as quoted)"
                  className="mb-4"
                />
              ) : null}

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
                  <div
                    className={cn('grid items-center gap-3 pb-1.5', ROW_BLEED, COLS)}
                    aria-hidden
                  >
                    {/* Indented to match the rows below, which carry the same
                        pl-1 so the product name is not flush against the card's
                        edge. Header and body must move together or the column
                        stops reading as one. */}
                    <ColumnHeader className="pl-1">Product</ColumnHeader>
                    <ColumnHeader className="text-right">Quoted</ColumnHeader>
                    <ColumnHeader className="text-right">Now</ColumnHeader>
                    <ColumnHeader className="text-right">Unit price</ColumnHeader>
                    <ColumnHeader className="text-right">Line total</ColumnHeader>
                    <ColumnHeader className="text-right">Variance</ColumnHeader>
                    <ColumnHeader>Source</ColumnHeader>
                    <ColumnHeader>Stock</ColumnHeader>
                    <span />
                  </div>

                  {bom.items.map((item) => {
                    const removed = item.changeState === 'removed';
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'group grid items-center gap-3 rounded-xl py-2.5 transition-colors duration-fast even:bg-surface-alt hover:bg-background-tertiary',
                          ROW_BLEED,
                          COLS,
                        )}
                      >
                        <div className="min-w-0 pl-1">
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

                        <BomRowActions
                          productName={item.productName}
                          removed={removed}
                          onPick={(mode) => {
                            setEditMode(mode);
                            setEditing(item);
                          }}
                        />
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

        <AddBomItemDialog projectId={projectId} open={addOpen} onClose={() => setAddOpen(false)} />

        <BomLineEditDialog
          projectId={projectId}
          item={editing}
          mode={editMode}
          onClose={() => setEditing(null)}
        />
      </div>
    );
  },
);

ProjectBomTab.displayName = 'ProjectBomTab';
