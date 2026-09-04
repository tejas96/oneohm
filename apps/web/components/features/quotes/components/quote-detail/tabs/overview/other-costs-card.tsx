'use client';

import React from 'react';

import type { CalculatedInstallation } from '@/components/features/quotes/types/calculator.types';
import { useCan } from '@/lib/rbac';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/format';

/**
 * Costs that are not things: labour, statutory fees, transport, supervision.
 *
 * The BOM holds physical items only (panels, inverters, structure, cables,
 * kits), so without this card the quote's base price is larger than the BOM
 * total and nothing on screen says why. The reconciliation line at the
 * bottom is the point of the component.
 *
 * Keys come from `installation.breakdown`, built server-side from
 * installation_pricing.cost_components — JSONB, operator-editable — so this
 * renders whatever it finds rather than a fixed list. `variable_floor` is
 * skipped in favour of `variable_floor_adjusted`, which is the value
 * actually charged when the floor is above ground; `profitability_percent`
 * is not a cost at all. Both are already dropped server-side when
 * `breakdown` is built, but are re-skipped here defensively in case an
 * older stored snapshot predates that filtering.
 */
const SKIP_KEYS = new Set(['variable_floor', 'profitability_percent']);

const LABELS: Record<string, string> = {
  electrical_work: 'Electrical work',
  fixed_material: 'Cables, connectors & earthing kit',
  installation_labor: 'Installation labour',
  loading_unloading: 'Loading & unloading',
  msedcl_charges: 'MSEDCL charges',
  supervision: 'Supervision',
  transport: 'Transport',
  variable_floor_adjusted: 'Floor access',
  crane_charges: 'Crane charges',
  permit_fees: 'Permit & approval fees',
  insurance: 'Insurance',
  safety_equipment: 'Safety equipment',
  documentation: 'Documentation',
};

/** An unmapped key still renders — as its own name, humanised. */
const labelFor = (key: string): string =>
  LABELS[key] ?? key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

function Row({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className={emphasis ? 'font-semibold text-foreground' : 'text-foreground-secondary'}>
        {label}
      </span>
      <span className={emphasis ? 'text-sm font-bold text-primary-dark' : 'font-medium text-foreground'}>
        {value}
      </span>
    </div>
  );
}

export interface OtherCostsCardProps {
  /** The installation cost breakdown from the relevant quote snapshot's calculation. */
  installation: CalculatedInstallation | undefined | null;
  /** Sum of the BOM's physical-item lines, in rupees (not paise). */
  bomTotal: number;
  /** `pricing.basePrice` from the same snapshot, in rupees. */
  quoteBasePrice: number;
  /**
   * `calculation.profitabilityAmount` from the same snapshot, in rupees —
   * the margin `calculatePricing` adds on top of raw component costs before
   * GST (`basePrice = rawBasePrice + profitabilityAmount`). Without this,
   * "Materials + Other costs" can never reach `quoteBasePrice`: that gap
   * *is* the margin, not a sign of a missing cost component. Only read when
   * the viewer can see margin — see `canSeeMargin` below.
   */
  profitabilityAmount?: number | null;
  /**
   * Card header, and the reconciliation row's label for this card's own
   * total. Defaults to "Other costs". The project BOM tab passes
   * "Other costs (as quoted)" so nobody mistakes these for figures
   * re-derived live from today's BOM — they are frozen at the quote that
   * was signed.
   */
  title?: string;
  className?: string;
}

/**
 * Reconciles the BOM total against the quote's base price by showing
 * everything the BOM deliberately excludes — labour, statutory fees,
 * transport, supervision, floor access — whatever
 * installation_pricing.cost_components happens to hold for this quote.
 *
 * The reconciliation itself (Materials + Other costs + Margin = Quote base
 * price) is gated on `quotes.profitability`, the same permission
 * `quote-pricing-card.tsx` uses to narrow its own cost/margin rows — margin
 * is exactly the kind of figure that gate exists to protect, and showing a
 * partial sum that looks wrong (without margin, the three numbers never
 * balance) is worse than not showing the sum at all. Anyone can still see
 * the itemised cost components and their subtotal; only the tie-out to the
 * quote's base price is restricted.
 */
export function OtherCostsCard({
  installation,
  bomTotal,
  quoteBasePrice,
  profitabilityAmount,
  title = 'Other costs',
  className,
}: OtherCostsCardProps): React.JSX.Element | null {
  const { can } = useCan();
  const canSeeMargin = can('quotes.profitability');

  const breakdown = installation?.breakdown;
  const entries = breakdown
    ? Object.entries(breakdown).filter(([key]) => !SKIP_KEYS.has(key))
    : [];

  if (entries.length === 0) return null;

  const otherTotal = entries.reduce((sum, [, value]) => sum + (Number(value) || 0), 0);
  const margin = profitabilityAmount ?? 0;
  const diff = bomTotal + otherTotal + margin - quoteBasePrice;
  const reconciles = Math.abs(diff) <= 1;

  return (
    <div className={cn('rounded-2xl border border-border bg-white p-5 shadow-sm', className)}>
      <h3 className="mb-3 flex items-center justify-between border-b border-border pb-3 text-sm font-bold text-foreground">
        <span>{title}</span>
        <span className="text-[10px] font-normal text-foreground-tertiary">Excl. GST</span>
      </h3>

      <div className="space-y-2">
        {entries.map(([key, value]) => (
          <Row key={key} label={labelFor(key)} value={formatCurrency(Number(value) || 0)} />
        ))}
      </div>

      {installation?.gstAmount != null && (
        <div className="mt-3 border-t border-border pt-3">
          <Row
            label={`GST on other costs (${installation.gstRate ?? 18}%)`}
            value={formatCurrency(installation.gstAmount)}
          />
        </div>
      )}

      {canSeeMargin ? (
        <div className="mt-3 space-y-1.5 border-t border-border pt-3">
          <Row label="Materials (BOM)" value={formatCurrency(bomTotal)} />
          <Row label={title} value={formatCurrency(otherTotal)} />
          <Row label="Margin" value={formatCurrency(margin)} />
          <Row label="Quote base price" value={formatCurrency(quoteBasePrice)} emphasis />
          {!reconciles && (
            <p className="pt-1 text-xs text-amber-600">
              Materials, other costs and margin differ from the base price by{' '}
              {formatCurrency(Math.abs(diff))}. The breakdown may be incomplete.
            </p>
          )}
        </div>
      ) : (
        // No `quotes.profitability`: margin is invisible, so the three-way
        // tie-out cannot be shown without either leaking margin or showing a
        // sum that looks broken. Component list and this subtotal only.
        <div className="mt-3 border-t border-border pt-3">
          <Row label={title} value={formatCurrency(otherTotal)} />
        </div>
      )}
    </div>
  );
}
