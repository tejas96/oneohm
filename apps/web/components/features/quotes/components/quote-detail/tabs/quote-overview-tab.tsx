'use client';

import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Paper, Typography } from '@mui/material';
import React, { useMemo } from 'react';

import { QuoteEquipmentCard } from './overview/quote-equipment-card';
import { QuoteHeroCard } from './overview/quote-hero-card';
import { QuoteInstallationCard } from './overview/quote-installation-card';
import { QuoteMilestonesCard } from './overview/quote-milestones-card';
import { QuotePricingCard } from './overview/quote-pricing-card';
import { QuoteSidebar } from './overview/quote-sidebar';
import { QuoteSustainabilityCard } from './overview/quote-sustainability-card';
import { QuoteSystemConfigCard } from './overview/quote-system-config-card';
import type { QuoteDetail } from '../../../hooks/types';

import { Can } from '@/components/shared/guards';
import { PERMISSIONS } from '@/lib/constants/permissions';
import { type Bom } from '@/lib/hooks/resources';
import { formatDate } from '@/lib/utils/format';
import { useAuth } from '@/providers/auth-provider';

interface QuoteOverviewTabProps {
  quote: QuoteDetail;
  isActive: boolean;
  bom?: Bom;
  isBomLoading?: boolean;
  isLatestPropertyQuote: boolean;
}

const round2 = (v: number): number => Math.round(v * 100) / 100;

export function QuoteOverviewTab({
  quote,
  bom,
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

  const { hasPermission, hasAnyRole } = useAuth();
  const canViewEquipmentPricing =
    hasPermission(PERMISSIONS.QUOTES.VIEW_PRICE_BREAKDOWN) ||
    hasAnyRole(['admin', 'superadmin', 'super_admin', 'platform_admin']);

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
  const rawActualKw = (calcObj?.actualSystemSizeKw as number | undefined) ?? totalWattageWp / 1000;
  const actualKw = round2(rawActualKw);
  const requestedKw = round2(calcInputs?.systemSizeKw ?? systemSizeKw);
  const showRequestedKw = actualKw !== requestedKw;

  type InstallationRecord = Partial<
    Record<
      | 'electricalWork'
      | 'fixedMaterial'
      | 'variableFloor'
      | 'structureCost'
      | 'installationLabor'
      | 'loadingUnloading'
      | 'msedclCharges'
      | 'supervision'
      | 'transport'
      | 'totalBeforeTax'
      | 'gstAmount'
      | 'gstRate'
      | 'totalWithGst',
      number
    >
  >;
  const installationData = calcObj?.installation as InstallationRecord | undefined;
  const profitPercent = calcObj?.profitabilityPercent as number | undefined;
  const profitAmount = calcObj?.profitabilityAmount as number | undefined;

  const panelItems = bom?.items?.filter((i) => i.itemType === 'panel') ?? [];
  const inverterItems = bom?.items?.filter((i) => i.itemType === 'inverter') ?? [];
  const structureItem = bom?.items?.find((i) => i.itemType === 'structure');

  const dcrPanelItems = useMemo(
    () => panelItems.filter((item) => Boolean(item.specifications.isDcr)),
    [panelItems],
  );
  const nonDcrPanelItems = useMemo(
    () => panelItems.filter((item) => !item.specifications.isDcr),
    [panelItems],
  );

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
  const hasBomEquipment = panelItems.length > 0;
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
            actualKw={actualKw}
            requestedKw={requestedKw}
            showRequestedKw={showRequestedKw}
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
          <QuoteEquipmentCard
            isBomLoading={isBomLoading}
            hasBomEquipment={hasBomEquipment}
            hasSnapEquipment={hasSnapEquipment}
            canViewEquipmentPricing={canViewEquipmentPricing}
            dcrPanelItems={dcrPanelItems}
            nonDcrPanelItems={nonDcrPanelItems}
            expandedInverterItems={inverterItems}
            structureItem={structureItem}
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
          <Can permission={PERMISSIONS.QUOTES.VIEW_PRICE_BREAKDOWN}>
            <QuotePricingCard
              breakdown={breakdown}
              effectivePrice={quote.effectivePrice}
              profitPercent={profitPercent}
              profitAmount={profitAmount}
            />
          </Can>

          {/* Installation Costs */}
          {installationData &&
            ((installationData.totalBeforeTax ?? 0) > 0 ||
              (installationData.totalWithGst ?? 0) > 0) && (
              <Can permission={PERMISSIONS.QUOTES.VIEW_PRICE_BREAKDOWN}>
                <QuoteInstallationCard installationData={installationData} />
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
