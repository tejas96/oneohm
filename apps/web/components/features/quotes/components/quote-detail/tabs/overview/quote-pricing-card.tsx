'use client';

import { Paper } from '@mui/material';
import React from 'react';

import { useCan } from '@/lib/rbac';
import { formatCurrency } from '@/lib/utils/format';

interface PricingBreakdown {
  basePrice?: number | null;
  discountAmount?: number | null;
  gst5OnEquipment?: number | null;
  gst18OnServices?: number | null;
  totalGst?: number | null;
  totalPrice?: number | null;
  subsidyAmount?: number | null;
}

interface QuotePricingCardProps {
  breakdown?: PricingBreakdown | null;
  effectivePrice?: number | null;
  profitPercent?: number | null;
  profitAmount?: number | null;
}

/**
 * What the customer pays, plus — for whoever is allowed to see it — how that
 * number was built.
 *
 * The card used to be wrapped whole in `<Can permission="quotes.profitability">`,
 * which hid the contract value from anyone without it. That is the wrong cut:
 * a salesperson has to be able to quote a price. What must stay private is the
 * cost and margin underneath it, so the gate moved in here and now covers only
 * the rows above the total.
 */
export function QuotePricingCard({
  breakdown,
  profitPercent,
  profitAmount,
}: QuotePricingCardProps): React.JSX.Element {
  const { can } = useCan();
  const canSeeBreakdown = can('quotes.profitability');

  const finalPrice = breakdown?.totalPrice ?? 0;
  const basePrice = breakdown?.basePrice ?? 0;
  const hasProfit = profitAmount != null && profitPercent != null && profitAmount > 0;
  const rawComponentCost = basePrice - (profitAmount ?? 0);
  const discountedBasePrice = basePrice - (breakdown?.discountAmount ?? 0);

  return (
    <Paper
      variant="outlined"
      className="p-5 rounded-xl border border-border bg-white shadow-sm space-y-4"
    >
      <div className="border-b border-border pb-3 flex justify-between items-center">
        {/* Calling it a breakdown while showing no breakdown just reads as a
            bug, so the heading follows what is actually on screen. */}
        <h3 className="text-sm font-bold text-foreground">
          {canSeeBreakdown ? 'Investment Breakdown' : 'Quote Total'}
        </h3>
        {canSeeBreakdown && (
          <span className="text-[10px] text-foreground-tertiary font-medium">
            Deemed 70:30 Split
          </span>
        )}
      </div>
      <div className="space-y-3">
        {canSeeBreakdown && hasProfit && (
          <>
            <div className="flex justify-between items-center text-xs text-foreground-secondary">
              <span>Component Cost (Raw)</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(rawComponentCost)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs text-foreground-secondary">
              <span>Profit Margin Markup ({profitPercent}%)</span>
              <span className="font-semibold text-foreground">+{formatCurrency(profitAmount)}</span>
            </div>
          </>
        )}
        {canSeeBreakdown && breakdown?.basePrice != null && (
          <div className="flex justify-between items-center text-xs text-foreground-secondary pt-0.5">
            <span className={hasProfit ? 'font-medium text-foreground' : ''}>
              Base Quote Pricing
            </span>
            <span className="font-semibold text-foreground">
              {formatCurrency(breakdown.basePrice)}
            </span>
          </div>
        )}
        {canSeeBreakdown && breakdown?.discountAmount != null && breakdown.discountAmount > 0 && (
          <>
            <div className="flex justify-between items-center text-xs text-success">
              <span>Discounts Applied</span>
              <span className="font-semibold">-{formatCurrency(breakdown.discountAmount)}</span>
            </div>
            {breakdown.basePrice != null && (
              <div className="flex justify-between items-center text-xs text-foreground-secondary">
                <span>Discounted Base Price</span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(discountedBasePrice)}
                </span>
              </div>
            )}
          </>
        )}
        {canSeeBreakdown && breakdown?.gst5OnEquipment != null && (
          <div className="flex justify-between items-center text-xs text-foreground-secondary">
            <span>GST 5% on Solar Equipment (70% of Base)</span>
            <span className="font-semibold text-foreground">
              {formatCurrency(breakdown.gst5OnEquipment)}
            </span>
          </div>
        )}
        {canSeeBreakdown && breakdown?.gst18OnServices != null && (
          <div className="flex justify-between items-center text-xs text-foreground-secondary">
            <span>GST 18% on Services & Labor (30% of Base)</span>
            <span className="font-semibold text-foreground">
              {formatCurrency(breakdown.gst18OnServices)}
            </span>
          </div>
        )}
        {canSeeBreakdown && breakdown?.totalGst != null && (
          <div className="flex justify-between items-center text-xs text-foreground-secondary">
            <span>Total GST Liability</span>
            <span className="font-semibold text-foreground">
              {formatCurrency(breakdown.totalGst)}
            </span>
          </div>
        )}
        {breakdown?.totalPrice != null && (
          <>
            {/* The divider separates the total from the rows that build it. With
                the breakdown hidden there are no such rows, so it would sit at
                the top of the card dividing nothing. */}
            {canSeeBreakdown && <div className="h-px bg-border my-2" />}
            <div className="flex justify-between items-center text-xs">
              <span className="text-foreground font-semibold">Gross Total Price (GST Incl.)</span>
              <span className="font-bold text-foreground">
                {formatCurrency(breakdown.totalPrice)}
              </span>
            </div>
          </>
        )}
        <div className="flex justify-between items-center text-xs text-foreground-secondary">
          <span>Govt Subsidy Rebate</span>
          <span className="font-semibold text-foreground">
            {breakdown?.subsidyAmount != null && breakdown.subsidyAmount > 0
              ? formatCurrency(breakdown.subsidyAmount)
              : 'N/A (Commercial)'}
          </span>
        </div>
        {/* The subsidy sits directly above an amount payable it does not reduce,
            separated by the same divider used elsewhere to introduce a running
            total — so it reads as an arithmetic error. It is not: the government
            pays the customer, so the customer owes the gross. Say so, and change
            no number. */}
        {breakdown?.subsidyAmount != null && breakdown.subsidyAmount > 0 && (
          <p className="text-[10px] text-foreground-tertiary leading-relaxed -mt-1">
            Paid to you directly by the government after commissioning — it is not deducted from
            this quote, so the amount payable below is the full contract value.
          </p>
        )}
        {finalPrice != null && (
          <>
            <div className="h-px bg-border my-2" />
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-foreground">You Pay</span>
              <span className="font-bold text-primary-dark">{formatCurrency(finalPrice)}</span>
            </div>
          </>
        )}

        {/* Explains the two GST rows above, so it goes when they go. */}
        {canSeeBreakdown && (
          <>
            <div className="h-px bg-border/40 my-2" />
            <p className="text-[10px] text-foreground-tertiary leading-relaxed">
              * GST is calculated based on the Indian statutory 70:30 split rule for Solar EPC
              contracts (70% supply at 5% GST, 30% services at 18% GST) applied to the discounted
              base price.
            </p>
          </>
        )}
      </div>
    </Paper>
  );
}
