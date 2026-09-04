'use client';

import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Paper, Typography } from '@mui/material';
import React, { useMemo } from 'react';

import { OtherCostsCard } from './overview/other-costs-card';
import { QuoteEquipmentCard } from './overview/quote-equipment-card';
import { QuoteHeroCard } from './overview/quote-hero-card';
import { QuoteMilestonesCard } from './overview/quote-milestones-card';
import { QuotePricingCard } from './overview/quote-pricing-card';
import { QuoteSidebar } from './overview/quote-sidebar';
import { QuoteSustainabilityCard } from './overview/quote-sustainability-card';
import { QuoteSystemConfigCard } from './overview/quote-system-config-card';
import type { QuoteDetail } from '../../../hooks/types';
import { quoteBomLines } from '../../../utils/quote-bom-lines';

import { Can } from '@/components/shared/guards';
import { useCan } from '@/lib/rbac';
import { formatDate } from '@/lib/utils/format';

interface QuoteOverviewTabProps {
  quote: QuoteDetail;
  isActive: boolean;
  isBomLoading?: boolean;
  isLatestPropertyQuote: boolean;
}

const round2 = (v: number): number => Math.round(v * 100) / 100;

export function QuoteOverviewTab({
  quote,
  isBomLoading,
  isLatestPropertyQuote,
}: QuoteOverviewTabProps): React.JSX.Element {
  const systemType = quote.systemType;
  const systemSizeKw = quote.systemSizeKw;
  const totalWattageWp = quote.totalWattageWp;
  const projectType = quote.projectType;
  const projectCompletionWeeks = quote.projectCompletionWeeks;
  const breakdown = quote.quoteSnapshot?.pricing ?? quote.pricingBreakdown;
  const calcInputs = quote.quoteSnapshot?.inputs ?? quote.calculatorInputs;

  // `hasPermission` already short-circuits for full-access roles, so the role
  // check this used to carry was redundant — and it listed 'superadmin', a
  // spelling that has never been a real role code.
  const { can } = useCan();
  const canViewEquipmentPricing = can('quotes.profitability');

  const activeSnapshot = quote.quoteSnapshot;
  const isOldData = useMemo(() => {
    if (!activeSnapshot?.calculation) return true;
    return (
      typeof activeSnapshot.calculation !== 'object' ||
      Object.keys(activeSnapshot.calculation).length === 0 ||
      !Array.isArray((activeSnapshot.calculation as unknown as Record<string, unknown>).panels)
    );
  }, [activeSnapshot]);

  const calcObj = activeSnapshot?.calculation as unknown as Record<string, unknown> | undefined;
  const actualKw = round2(systemSizeKw);

  // Same snapshot the equipment cards already read, but as the BOM lines
  // Task 9 defines rather than the raw panel/inverter/structure arrays —
  // this is the one true "physical items" total the reconciliation card
  // below checks against the quote's base price.
  const bomLines = useMemo(
    () => (activeSnapshot?.calculation ? quoteBomLines(activeSnapshot.calculation) : []),
    [activeSnapshot],
  );
  const bomTotal = useMemo(
    () => bomLines.reduce((sum, line) => sum + line.totalPrice, 0),
    [bomLines],
  );
  const installation = activeSnapshot?.calculation?.installation;
  const profitPercent = calcObj?.profitabilityPercent as number | undefined;
  const profitAmount = calcObj?.profitabilityAmount as number | undefined;

  interface SnapPanel {
    productId?: string;
    name?: string;
    brand?: string;
    isDcr?: boolean;
    wattagePerPanel?: number;
    technology?: string;
    quantity?: number;
    lineTotal?: number;
    productWarrantyYears?: number;
  }
  interface SnapInverter {
    productId?: string;
    name?: string;
    brand?: string;
    capacityKw?: number;
    quantity?: number;
    lineTotal?: number;
    productWarrantyYears?: number;
  }
  interface SnapStructure {
    productId?: string;
    name?: string;
    structureType?: string;
    quantity?: number;
    lineTotal?: number;
  }
  const snapPanels = (Array.isArray(calcObj?.panels) ? calcObj.panels : []) as SnapPanel[];
  const snapInverterObj = calcObj?.inverters as { inverters?: SnapInverter[] } | undefined;
  const snapInverters = snapInverterObj?.inverters ?? [];
  const snapStructure = calcObj?.structure as SnapStructure | undefined;
  const hasSnapEquipment = snapPanels.length > 0;

  const snapDcrPanels = useMemo(
    () => snapPanels.filter((panel) => Boolean(panel.isDcr)),
    [snapPanels],
  );
  const snapNonDcrPanels = useMemo(() => snapPanels.filter((panel) => !panel.isDcr), [snapPanels]);

  return (
    <div className="space-y-6">
      {/* Property quote metadata banner */}
      {!isLatestPropertyQuote && (
        <Paper variant="outlined" className="p-4 flex items-center gap-3 rounded-xl bg-muted/50">
          <InfoOutlinedIcon className="text-[18px] text-foreground-tertiary" />
          <Typography variant="body2" className="text-foreground-secondary">
            Viewing historical quote {quote.quoteNumber} created on{' '}
            {formatDate(quote.createdAt, 'medium')}. The latest or accepted quote for this property
            is marked as Current.
          </Typography>
        </Paper>
      )}

      {/* Old data info banner */}
      {isOldData && (
        <Paper
          variant="outlined"
          className="p-4 flex items-center gap-3 rounded-xl border-blue-200 bg-blue-50/50"
        >
          <InfoOutlinedIcon className="text-[18px] text-blue-500" />
          <Typography variant="body2" className="text-foreground-secondary">
            This quote was created before full calculation snapshots were available. Some details
            like installation costs and profitability data may not be shown. Create a new quote for
            this property to generate a full snapshot.
          </Typography>
        </Paper>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: System spec cards */}
        <div className="lg:col-span-2 space-y-6">
          {/* V2 Hero Gradient Welcome Card */}
          <QuoteHeroCard
            actualKw={actualKw}
            customerName={quote.customerName ?? 'Unknown Customer'}
            propertyName={quote.propertyAddress ?? quote.propertyName ?? undefined}
            validUntil={quote.validUntil}
          />

          {/* System Configuration */}
          <QuoteSystemConfigCard
            kw={actualKw}
            totalWattageWp={totalWattageWp}
            systemType={systemType}
            projectType={projectType}
            projectCompletionWeeks={projectCompletionWeeks}
            phaseType={calcInputs?.phaseType}
            dcrPreference={calcInputs?.dcrPreference}
            structureType={calcInputs?.structureType}
            dcrSystemSizeKw={calcInputs?.dcrSystemSizeKw}
            nonDcrSystemSizeKw={calcInputs?.nonDcrSystemSizeKw}
            floorNumber={calcInputs?.floorNumber}
            distanceKm={calcInputs?.distanceKm}
          />

          {/* Equipment Details */}
          {/* A quotation has no BOM. It once read one back through
              `useEntityBom('quote_version', ...)`, but that endpoint is gone
              and `quote-detail-content.tsx` has never passed a `bom` prop
              since — the equipment shown here comes from the quote's own
              calculation snapshot (`snap*` below), which was always the
              record. The BOM-derived props stay only because
              QuoteEquipmentCard still declares them; they were already
              resolving to exactly these empty values at runtime. */}
          <QuoteEquipmentCard
            isBomLoading={isBomLoading}
            hasBomEquipment={false}
            hasSnapEquipment={hasSnapEquipment}
            canViewEquipmentPricing={canViewEquipmentPricing}
            dcrPanelItems={[]}
            nonDcrPanelItems={[]}
            expandedInverterItems={[]}
            structureItem={undefined}
            snapDcrPanels={snapDcrPanels}
            snapNonDcrPanels={snapNonDcrPanels}
            expandedSnapInverters={snapInverters}
            snapStructure={snapStructure}
          />

          {/* Sustainability & Utility Savings */}
          <QuoteSustainabilityCard
            actualKw={actualKw}
            estimatedCost={breakdown?.totalPrice ?? quote.effectivePrice ?? undefined}
          />

          {/* Progress Payment Milestones */}
          {quote.paymentMilestones && quote.paymentMilestones.length > 0 && (
            <QuoteMilestonesCard milestones={quote.paymentMilestones} />
          )}
        </div>

        {/* Right Side: Pricing cards and Sidebar Actions */}
        <div className="space-y-6">
          {/* Pricing Details */}
          {/* Not wrapped in <Can>: everyone who can see the quote needs the
              amount the customer pays. The card gates its own cost and margin
              rows instead — see QuotePricingCard. */}
          <QuotePricingCard
            breakdown={breakdown}
            effectivePrice={quote.effectivePrice}
            profitPercent={profitPercent}
            profitAmount={profitAmount}
          />

          {/* Other Costs — reconciles the BOM total against the quote's
              base price. Replaces the old QuoteInstallationCard: that card
              and this one both showed the installation figures, and two
              cards for the same numbers is the duplication this rebuild
              exists to remove. Same permission gate as the card it
              replaces — this is still internal cost data. */}
          {installation && (
            <Can permission={'quotes.profitability'}>
              <OtherCostsCard
                installation={installation}
                bomTotal={bomTotal}
                quoteBasePrice={breakdown?.basePrice ?? 0}
              />
            </Can>
          )}

          {/* Sidebar Info/Actions */}
          <QuoteSidebar
            status={quote.status}
            customerId={quote.customerId ?? ''}
            quoteId={quote.id}
            propertyId={quote.propertyId}
            profitPercent={profitPercent}
            profitAmount={profitAmount}
            rejectionReason={quote.rejectionReason}
            customerNotes={quote.customerNotes}
            internalNotes={quote.internalNotes}
          />
        </div>
      </div>
    </div>
  );
}
