'use client';

import DownloadIcon from '@mui/icons-material/Download';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Box, Divider, Paper, Tooltip, Typography } from '@mui/material';
import { Phone, Mail, MapPin } from 'lucide-react';
import Link from 'next/link';
import React, { useCallback, useMemo, useState } from 'react';

import { SYSTEM_TYPE_LABELS, PROJECT_TYPE_LABELS } from '../../../constants';
import type { QuoteDetail } from '../../../hooks/types';
import { generateAndDownloadPdf } from '../../../services/quote-pdf.service';
import type { CalculateQuoteResponse, QuotePdfData } from '../../../types';

import { Can } from '@/components/shared/guards';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SystemSizeDisplay } from '@/components/ui/system-size-display';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { PERMISSIONS } from '@/lib/constants/permissions';
import { type Bom, type BomItem, useQuoteConfig } from '@/lib/hooks/resources';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { useAuth } from '@/providers/auth-provider';

interface QuoteOverviewTabProps {
  quote: QuoteDetail;
  isActive: boolean;
  bom?: Bom;
  isBomLoading?: boolean;
  isLatestPropertyQuote: boolean;
}

function LabelValue({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ textTransform: 'uppercase', fontWeight: 600, fontSize: '0.65rem' }}
      >
        {label}
      </Typography>
      <Typography variant="body2">{children}</Typography>
    </Box>
  );
}

function buildCalculationFromBom(quote: QuoteDetail, bom: Bom): CalculateQuoteResponse {
  const calcInputs = quote.calculatorInputs;
  const breakdown = quote.pricingBreakdown;
  const systemSizeKw = quote.systemSizeKw;
  const totalWattageWp = quote.totalWattageWp;

  const panelItems = bom.items.filter((i) => i.itemType === 'panel');
  const inverterItems = bom.items.filter((i) => i.itemType === 'inverter');
  const structureItem = bom.items.find((i) => i.itemType === 'structure');

  const panels = panelItems.map((p: BomItem) => ({
    productId: p.productId ?? '',
    name: p.name,
    brand: p.brand ?? '',
    isDcr: (p.specifications.isDcr as boolean) ?? false,
    technology: p.specifications.technology as string | undefined,
    wattagePerPanel: (p.specifications.wattagePerPanel as number) ?? 0,
    quantity: p.quantity,
    totalWattage: ((p.specifications.wattagePerPanel as number) ?? 0) * p.quantity,
    pricePerWatt: (p.specifications.pricePerWatt as number) ?? 0,
    lineTotal: p.totalPrice ?? 0,
    gstAmount: p.gstAmount ?? 0,
    gstRate: p.gstRate,
    productWarrantyYears: p.warrantyYears,
    performanceWarrantyYears: p.specifications.performanceWarrantyYears as number | undefined,
  }));

  const inverters = inverterItems.map((inv: BomItem) => ({
    productId: inv.productId ?? '',
    name: inv.name,
    brand: inv.brand ?? '',
    capacityKw: (inv.specifications.capacityKw as number) ?? 0,
    quantity: inv.quantity,
    unitPrice: inv.unitPrice ?? 0,
    lineTotal: inv.totalPrice ?? 0,
    gstAmount: inv.gstAmount ?? 0,
    gstRate: inv.gstRate,
    productWarrantyYears: inv.warrantyYears,
  }));

  const structure = structureItem
    ? {
        productId: structureItem.productId ?? '',
        name: structureItem.name,
        structureType: (structureItem.specifications.structureType as string) ?? '',
        quantity: structureItem.quantity,
        unitPrice: structureItem.unitPrice ?? 0,
        lineTotal: structureItem.totalPrice ?? 0,
        gstAmount: structureItem.gstAmount ?? 0,
        gstRate: structureItem.gstRate,
      }
    : {
        productId: '',
        name: 'N/A',
        structureType: '',
        quantity: 0,
        unitPrice: 0,
        lineTotal: 0,
        gstAmount: 0,
      };

  return {
    systemConfig: {
      totalSystemSizeKw: systemSizeKw,
      dcrSizeKw: calcInputs?.dcrSystemSizeKw ?? systemSizeKw,
      nonDcrSizeKw: calcInputs?.nonDcrSystemSizeKw ?? 0,
      phaseType: calcInputs?.phaseType ?? '',
    },
    panels,
    inverters: {
      inverters,
      totalCapacityKw: inverters.reduce((s, i) => s + i.capacityKw * i.quantity, 0),
      totalCost: inverters.reduce((s, i) => s + i.lineTotal, 0),
      totalGst: inverters.reduce((s, i) => s + i.gstAmount, 0),
    },
    structure,
    installation: {
      electricalWork: 0,
      fixedMaterial: 0,
      variableFloor: 0,
      structureCost: 0,
      installationLabor: 0,
      loadingUnloading: 0,
      msedclCharges: 0,
      supervision: 0,
      transport: 0,
      totalBeforeTax: 0,
      gstAmount: 0,
      totalWithGst: 0,
    },
    pricing: {
      basePrice: breakdown?.basePrice ?? 0,
      gst5Amount: breakdown?.gst5OnEquipment ?? 0,
      gst18Amount: breakdown?.gst18OnServices ?? 0,
      totalGst: breakdown?.totalGst ?? 0,
      totalPrice: breakdown?.totalPrice ?? 0,
      discountAmount: breakdown?.discountAmount ?? 0,
      finalPrice: breakdown?.totalPrice ?? 0,
    },
    subsidy: {
      isApplicable: breakdown?.isSubsidyApplicable ?? false,
      amount: breakdown?.subsidyAmount ?? 0,
    },
    effectivePrice: quote.effectivePrice ?? 0,
    completionWeeks: quote.projectCompletionWeeks ?? 4,
    hasOverrides: false,
    actualTotalWattage: totalWattageWp,
    actualSystemSizeKw: totalWattageWp / 1000,
    actualDcrSizeKw: calcInputs?.actualDcrSizeKw ?? calcInputs?.dcrSystemSizeKw ?? systemSizeKw,
    actualNonDcrSizeKw: calcInputs?.actualNonDcrSizeKw ?? calcInputs?.nonDcrSystemSizeKw ?? 0,
    profitabilityPercent: 0,
    profitabilityAmount: 0,
    calculatedAt: quote.createdAt,
  };
}

const round2 = (v: number): number => Math.round(v * 100) / 100;

const splitMoneyEvenly = (total: number, count: number): number[] => {
  if (count <= 0) return [];
  const totalInPaise = Math.round(total * 100);
  const baseShare = Math.trunc(totalInPaise / count);
  let remainder = totalInPaise - baseShare * count;
  const result = Array.from({ length: count }, () => baseShare);

  for (let i = 0; i < result.length && remainder > 0; i += 1) {
    const current = result[i];
    if (current === undefined) break;
    result[i] = current + 1;
    remainder -= 1;
  }

  for (let i = 0; i < result.length && remainder < 0; i += 1) {
    const current = result[i];
    if (current === undefined) break;
    result[i] = current - 1;
    remainder += 1;
  }

  return result.map((value) => value / 100);
};

function expandBomRows(items: BomItem[]): BomItem[] {
  return items.flatMap((item) => {
    const quantity = Math.max(1, Math.trunc(item.quantity || 1));
    if (quantity <= 1) return [item];

    const splitTotals = splitMoneyEvenly(Number(item.totalPrice ?? 0), quantity);
    return Array.from({ length: quantity }, (_, idx) => ({
      ...item,
      quantity: 1,
      unitPrice: splitTotals[idx] ?? item.unitPrice,
      totalPrice: splitTotals[idx] ?? item.totalPrice,
      sortOrder: (item.sortOrder ?? 0) + idx,
    }));
  });
}

export function QuoteOverviewTab({
  quote,
  isActive: _isActive,
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

  const [pdfLoading, setPdfLoading] = useState(false);
  const { data: quoteConfig } = useQuoteConfig();
  const { hasPermission, hasAnyRole } = useAuth();
  const canViewEquipmentPricing =
    hasPermission(PERMISSIONS.QUOTES.VIEW_PRICE_BREAKDOWN) ||
    hasAnyRole(['admin', 'superadmin', 'super_admin', 'platform_admin']);
  const hasBomPanels = bom?.items?.some((i) => i.itemType === 'panel') ?? false;

  const activeSnapshot = quote.quoteSnapshot;
  const isOldData =
    !activeSnapshot?.calculation ||
    typeof activeSnapshot.calculation !== 'object' ||
    Object.keys(activeSnapshot.calculation).length === 0 ||
    !Array.isArray((activeSnapshot.calculation as unknown as Record<string, unknown>).panels);

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

  const hasStoredCalc = !isOldData;
  const canDownloadPdf = hasStoredCalc || hasBomPanels;

  const defaultGstConfig = { rate1: 12, rate1Percentage: 70, rate2: 18, rate2Percentage: 30 };

  const handleDownloadPdf = useCallback(async () => {
    let calculation: CalculateQuoteResponse;
    if (hasStoredCalc && activeSnapshot?.calculation) {
      calculation = activeSnapshot.calculation as unknown as CalculateQuoteResponse;
    } else if (bom) {
      calculation = buildCalculationFromBom(quote, bom);
    } else {
      return;
    }

    setPdfLoading(true);
    try {
      const pdfData: QuotePdfData = {
        calculation,
        customer: {
          name: quote.customerName ?? '',
          phone: quote.customerPhone ?? '',
          email: quote.customerEmail ?? '',
        },
        property: {
          propertyName: quote.propertyName ?? '',
          address: quote.propertyAddress ?? '',
        },
        quoteNumber: quote.quoteNumber,
        validityDays: Math.ceil(
          (new Date(quote.validUntil).getTime() - new Date(quote.quoteDate).getTime()) / 86400000,
        ),
        paymentMilestones: quote.paymentMilestones,
        discountAmount: breakdown?.discountAmount,
        gstConfig: quoteConfig?.gstConfig ?? defaultGstConfig,
      };
      await generateAndDownloadPdf(pdfData);
    } catch {
      // PDF generation error handled silently
    } finally {
      setPdfLoading(false);
    }
  }, [bom, quote, breakdown, quoteConfig, hasStoredCalc, activeSnapshot]);

  const panelItems = bom?.items?.filter((i) => i.itemType === 'panel') ?? [];
  const inverterItems = bom?.items?.filter((i) => i.itemType === 'inverter') ?? [];
  const structureItem = bom?.items?.find((i) => i.itemType === 'structure');
  const expandedPanelItems = useMemo(() => expandBomRows(panelItems), [panelItems]);
  const expandedInverterItems = useMemo(() => expandBomRows(inverterItems), [inverterItems]);
  const dcrPanelItems = useMemo(
    () => expandedPanelItems.filter((item) => Boolean(item.specifications.isDcr)),
    [expandedPanelItems],
  );
  const nonDcrPanelItems = useMemo(
    () => expandedPanelItems.filter((item) => !item.specifications.isDcr),
    [expandedPanelItems],
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
  const expandedSnapPanels = useMemo(
    () =>
      snapPanels.flatMap((panel) => {
        const quantity = Math.max(1, Math.trunc(panel.quantity ?? 1));
        if (quantity <= 1) return [{ ...panel, quantity: 1 }];

        const splitTotals = splitMoneyEvenly(Number(panel.lineTotal ?? 0), quantity);
        return Array.from({ length: quantity }, (_, index) => ({
          ...panel,
          quantity: 1,
          lineTotal: splitTotals[index] ?? panel.lineTotal ?? 0,
          productId: `${panel.productId ?? panel.name ?? 'panel'}-${index + 1}`,
        }));
      }),
    [snapPanels],
  );
  const expandedSnapInverters = useMemo(
    () =>
      snapInverters.flatMap((inverter) => {
        const quantity = Math.max(1, Math.trunc(inverter.quantity ?? 1));
        if (quantity <= 1) return [{ ...inverter, quantity: 1 }];

        const splitTotals = splitMoneyEvenly(Number(inverter.lineTotal ?? 0), quantity);
        return Array.from({ length: quantity }, (_, index) => ({
          ...inverter,
          quantity: 1,
          lineTotal: splitTotals[index] ?? inverter.lineTotal ?? 0,
          productId: `${inverter.productId ?? inverter.name ?? 'inverter'}-${index + 1}`,
        }));
      }),
    [snapInverters],
  );
  const snapDcrPanels = useMemo(
    () => expandedSnapPanels.filter((panel) => Boolean(panel.isDcr)),
    [expandedSnapPanels],
  );
  const snapNonDcrPanels = useMemo(
    () => expandedSnapPanels.filter((panel) => !panel.isDcr),
    [expandedSnapPanels],
  );

  return (
    <div className="mt-4 space-y-4">
      {/* Property quote metadata banner */}
      {!isLatestPropertyQuote && (
        <Paper
          variant="outlined"
          sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: 'action.hover' }}
        >
          <InfoOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          <Box>
            <Typography variant="body2" color="text.secondary">
              Viewing historical quote {quote.quoteNumber} created on{' '}
              {formatDate(quote.createdAt, 'medium')}. The latest or accepted quote for this
              property is marked as Current.
            </Typography>
          </Box>
        </Paper>
      )}

      {/* Old data info banner */}
      {isOldData && (
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            bgcolor: 'info.50',
            borderColor: 'info.200',
          }}
        >
          <InfoOutlinedIcon sx={{ fontSize: 18, color: 'info.main' }} />
          <Typography variant="body2" color="text.secondary">
            This quote was created before full calculation snapshots were available. Some details
            like installation costs and profitability data may not be shown. Create a new quote for
            this property to generate a full snapshot.
          </Typography>
        </Paper>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Customer & Property */}
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    fontSize: '0.65rem',
                    mb: 1,
                    display: 'block',
                  }}
                >
                  Customer
                </Typography>
                {quote.customerId ? (
                  <Link
                    href={buildRoute(ROUTES.CUSTOMERS.DETAIL, { id: quote.customerId })}
                    className="text-sm font-medium hover:text-primary"
                  >
                    {quote.customerName ?? 'Unknown Customer'}
                  </Link>
                ) : (
                  <Typography variant="body2" fontWeight={500}>
                    {quote.customerName ?? 'Unknown Customer'}
                  </Typography>
                )}
                {quote.customerPhone && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <Phone className="size-icon-xs text-foreground-tertiary" />
                    <Typography variant="body2" color="text.secondary">
                      {quote.customerPhone}
                    </Typography>
                  </div>
                )}
                {quote.customerEmail && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Mail className="size-icon-xs text-foreground-tertiary" />
                    <Typography variant="body2" color="text.secondary">
                      {quote.customerEmail}
                    </Typography>
                  </div>
                )}
              </div>
              {(quote.propertyId || quote.propertyName) && (
                <div>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      textTransform: 'uppercase',
                      fontWeight: 600,
                      fontSize: '0.65rem',
                      mb: 1,
                      display: 'block',
                    }}
                  >
                    Property
                  </Typography>
                  {quote.propertyId ? (
                    <Link
                      href={buildRoute(ROUTES.PROPERTIES.DETAIL, { id: quote.propertyId })}
                      className="text-sm font-medium hover:text-primary"
                    >
                      {quote.propertyName ?? 'Unnamed Property'}
                    </Link>
                  ) : (
                    <Typography variant="body2" fontWeight={500}>
                      {quote.propertyName ?? 'Unnamed Property'}
                    </Typography>
                  )}
                  {quote.propertyAddress && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <MapPin className="size-icon-xs text-foreground-tertiary shrink-0" />
                      <Typography variant="body2" color="text.secondary">
                        {quote.propertyAddress}
                      </Typography>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Paper>

          {/* System Configuration */}
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              System Configuration
            </Typography>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <LabelValue label="System Size">
                <SystemSizeDisplay
                  actualKw={actualKw}
                  requestedKw={showRequestedKw ? requestedKw : undefined}
                  layout="inline"
                />
              </LabelValue>
              <LabelValue label="Total Wattage">{totalWattageWp} Wp</LabelValue>
              <LabelValue label="System Type">
                {SYSTEM_TYPE_LABELS[systemType] ?? systemType}
              </LabelValue>
              <LabelValue label="Project Type">
                {PROJECT_TYPE_LABELS[projectType] ?? projectType}
              </LabelValue>
              {projectCompletionWeeks != null && (
                <LabelValue label="Completion">{projectCompletionWeeks} weeks</LabelValue>
              )}
              {calcInputs?.phaseType && (
                <LabelValue label="Phase Type">
                  {calcInputs.phaseType.replace(/_/g, ' ')}
                </LabelValue>
              )}
              {calcInputs?.dcrPreference && (
                <LabelValue label="DCR Preference">
                  {calcInputs.dcrPreference.replace(/_/g, ' ')}
                </LabelValue>
              )}
              {calcInputs?.structureType && (
                <LabelValue label="Structure Type">
                  {calcInputs.structureType.replace(/_/g, ' ')}
                </LabelValue>
              )}
              {calcInputs?.dcrSystemSizeKw != null && (
                <LabelValue label="DCR Size">{calcInputs.dcrSystemSizeKw} kW</LabelValue>
              )}
              {calcInputs?.nonDcrSystemSizeKw != null && calcInputs.nonDcrSystemSizeKw > 0 && (
                <LabelValue label="Non-DCR Size">{calcInputs.nonDcrSystemSizeKw} kW</LabelValue>
              )}
              {calcInputs?.floorNumber != null && calcInputs.floorNumber > 0 && (
                <LabelValue label="Floor">{calcInputs.floorNumber}</LabelValue>
              )}
              {calcInputs?.distanceKm != null && (
                <LabelValue label="Distance">{calcInputs.distanceKm} km</LabelValue>
              )}
            </div>
          </Paper>

          {/* Equipment Details (BOM first, snapshot fallback) */}
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              Equipment Details
            </Typography>
            {isBomLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : hasBomEquipment ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      textTransform: 'uppercase',
                      fontWeight: 600,
                      fontSize: '0.65rem',
                      mb: 1,
                      display: 'block',
                    }}
                  >
                    Solar Panels
                  </Typography>
                  {dcrPanelItems.length > 0 && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mb: 0.5 }}
                    >
                      DCR Panels
                    </Typography>
                  )}
                  {dcrPanelItems.map((panel, index) => (
                    <Box key={`${panel.id}-dcr-${index}`} sx={{ py: 0.5 }}>
                      <Typography variant="body2" fontWeight={500}>
                        {panel.brand ? `${panel.brand} ` : ''}
                        {panel.name} (DCR)
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {panel.specifications.wattagePerPanel as number}W
                        {panel.specifications.technology
                          ? ` · ${panel.specifications.technology}`
                          : ''}
                        {' · '}Qty: 1
                        {panel.warrantyYears ? ` · ${panel.warrantyYears}yr warranty` : ''}
                      </Typography>
                      {canViewEquipmentPricing && (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          Price: {formatCurrency(panel.totalPrice ?? 0)}
                        </Typography>
                      )}
                    </Box>
                  ))}
                  {nonDcrPanelItems.length > 0 && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mt: dcrPanelItems.length > 0 ? 1 : 0, mb: 0.5 }}
                    >
                      Non-DCR Panels
                    </Typography>
                  )}
                  {nonDcrPanelItems.map((panel, index) => (
                    <Box key={`${panel.id}-non-dcr-${index}`} sx={{ py: 0.5 }}>
                      <Typography variant="body2" fontWeight={500}>
                        {panel.brand ? `${panel.brand} ` : ''}
                        {panel.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {panel.specifications.wattagePerPanel as number}W
                        {panel.specifications.technology
                          ? ` · ${panel.specifications.technology}`
                          : ''}
                        {' · '}Qty: 1
                        {panel.warrantyYears ? ` · ${panel.warrantyYears}yr warranty` : ''}
                      </Typography>
                      {canViewEquipmentPricing && (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          Price: {formatCurrency(panel.totalPrice ?? 0)}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
                <Divider />
                {inverterItems.length > 0 && (
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        textTransform: 'uppercase',
                        fontWeight: 600,
                        fontSize: '0.65rem',
                        mb: 1,
                        display: 'block',
                      }}
                    >
                      Inverters
                    </Typography>
                    {expandedInverterItems.map((inv, index) => (
                      <Box key={`${inv.id}-inv-${index}`} sx={{ py: 0.5 }}>
                        <Typography variant="body2" fontWeight={500}>
                          {inv.brand ? `${inv.brand} ` : ''}
                          {inv.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {inv.specifications.capacityKw as number} kW · Qty: 1
                          {inv.warrantyYears ? ` · ${inv.warrantyYears}yr warranty` : ''}
                        </Typography>
                        {canViewEquipmentPricing && (
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            Price: {formatCurrency(inv.totalPrice ?? 0)}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Box>
                )}
                {structureItem && (
                  <>
                    <Divider />
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          textTransform: 'uppercase',
                          fontWeight: 600,
                          fontSize: '0.65rem',
                          mb: 1,
                          display: 'block',
                        }}
                      >
                        Structure
                      </Typography>
                      <Box sx={{ py: 0.5 }}>
                        <Typography variant="body2" fontWeight={500}>
                          {structureItem.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {structureItem.specifications.structureType as string} · Qty:{' '}
                          {structureItem.quantity}
                        </Typography>
                        {canViewEquipmentPricing && (
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            Price: {formatCurrency(structureItem.totalPrice ?? 0)}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </>
                )}
              </Box>
            ) : hasSnapEquipment ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      textTransform: 'uppercase',
                      fontWeight: 600,
                      fontSize: '0.65rem',
                      mb: 1,
                      display: 'block',
                    }}
                  >
                    Solar Panels
                  </Typography>
                  {snapDcrPanels.length > 0 && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mb: 0.5 }}
                    >
                      DCR Panels
                    </Typography>
                  )}
                  {snapDcrPanels.map((p, i) => (
                    <Box key={p.productId ?? i} sx={{ py: 0.5 }}>
                      <Typography variant="body2" fontWeight={500}>
                        {p.brand ? `${p.brand} ` : ''}
                        {p.name ?? ''} (DCR)
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {p.wattagePerPanel ?? 0}W{p.technology ? ` · ${p.technology}` : ''}
                        {' · '}Qty: 1
                        {p.productWarrantyYears ? ` · ${p.productWarrantyYears}yr warranty` : ''}
                      </Typography>
                      {canViewEquipmentPricing && (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          Price: {formatCurrency(p.lineTotal ?? 0)}
                        </Typography>
                      )}
                    </Box>
                  ))}
                  {snapNonDcrPanels.length > 0 && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mt: snapDcrPanels.length > 0 ? 1 : 0, mb: 0.5 }}
                    >
                      Non-DCR Panels
                    </Typography>
                  )}
                  {snapNonDcrPanels.map((p, i) => (
                    <Box key={p.productId ?? i} sx={{ py: 0.5 }}>
                      <Typography variant="body2" fontWeight={500}>
                        {p.brand ? `${p.brand} ` : ''}
                        {p.name ?? ''}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {p.wattagePerPanel ?? 0}W{p.technology ? ` · ${p.technology}` : ''}
                        {' · '}Qty: 1
                        {p.productWarrantyYears ? ` · ${p.productWarrantyYears}yr warranty` : ''}
                      </Typography>
                      {canViewEquipmentPricing && (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          Price: {formatCurrency(p.lineTotal ?? 0)}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
                {snapInverters.length > 0 && (
                  <>
                    <Divider />
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          textTransform: 'uppercase',
                          fontWeight: 600,
                          fontSize: '0.65rem',
                          mb: 1,
                          display: 'block',
                        }}
                      >
                        Inverters
                      </Typography>
                      {expandedSnapInverters.map((inv, i) => (
                        <Box key={inv.productId ?? i} sx={{ py: 0.5 }}>
                          <Typography variant="body2" fontWeight={500}>
                            {inv.brand ? `${inv.brand} ` : ''}
                            {inv.name ?? ''}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {inv.capacityKw ?? 0} kW · Qty: 1
                            {inv.productWarrantyYears
                              ? ` · ${inv.productWarrantyYears}yr warranty`
                              : ''}
                          </Typography>
                          {canViewEquipmentPricing && (
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                              Price: {formatCurrency(inv.lineTotal ?? 0)}
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Box>
                  </>
                )}
                {snapStructure?.name && (
                  <>
                    <Divider />
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          textTransform: 'uppercase',
                          fontWeight: 600,
                          fontSize: '0.65rem',
                          mb: 1,
                          display: 'block',
                        }}
                      >
                        Structure
                      </Typography>
                      <Box sx={{ py: 0.5 }}>
                        <Typography variant="body2" fontWeight={500}>
                          {snapStructure.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {snapStructure.structureType
                            ? snapStructure.structureType.replace(/_/g, ' ')
                            : ''}{' '}
                          · Qty: {snapStructure.quantity ?? 0}
                        </Typography>
                        {canViewEquipmentPricing && (
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            Price: {formatCurrency(snapStructure.lineTotal ?? 0)}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </>
                )}
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                <InfoOutlinedIcon fontSize="small" />
                <Typography variant="body2">
                  Equipment details are not available for this quote. Create a new quote for this
                  property to generate updated details.
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Pricing */}
          <Can permission={PERMISSIONS.QUOTES.VIEW_PRICE_BREAKDOWN}>
            <Paper variant="outlined" sx={{ p: 2.5 }}>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                Pricing Details
              </Typography>
              <div className="space-y-3">
                {breakdown?.basePrice != null && (
                  <div className="flex justify-between">
                    <Typography variant="body2" color="text.secondary">
                      Base Price
                    </Typography>
                    <Typography variant="body2">{formatCurrency(breakdown.basePrice)}</Typography>
                  </div>
                )}
                {breakdown?.discountAmount != null && breakdown.discountAmount > 0 && (
                  <div className="flex justify-between text-success">
                    <Typography variant="body2">Discount</Typography>
                    <Typography variant="body2">
                      -{formatCurrency(breakdown.discountAmount)}
                    </Typography>
                  </div>
                )}
                {breakdown?.gst5OnEquipment != null && (
                  <div className="flex justify-between">
                    <Typography variant="body2" color="text.secondary">
                      GST on Equipment
                    </Typography>
                    <Typography variant="body2">
                      {formatCurrency(breakdown.gst5OnEquipment)}
                    </Typography>
                  </div>
                )}
                {breakdown?.gst18OnServices != null && (
                  <div className="flex justify-between">
                    <Typography variant="body2" color="text.secondary">
                      GST on Services
                    </Typography>
                    <Typography variant="body2">
                      {formatCurrency(breakdown.gst18OnServices)}
                    </Typography>
                  </div>
                )}
                {breakdown?.totalGst != null && (
                  <div className="flex justify-between">
                    <Typography variant="body2" color="text.secondary">
                      Total GST
                    </Typography>
                    <Typography variant="body2">{formatCurrency(breakdown.totalGst)}</Typography>
                  </div>
                )}
                {breakdown?.totalPrice != null && (
                  <>
                    <Divider />
                    <div className="flex justify-between">
                      <Typography variant="body2" fontWeight={500}>
                        Gross Total
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {formatCurrency(breakdown.totalPrice)}
                      </Typography>
                    </div>
                  </>
                )}
                {breakdown?.subsidyAmount != null && breakdown.subsidyAmount > 0 && (
                  <div className="flex justify-between text-success">
                    <Typography variant="body2">Eligible Government Subsidy</Typography>
                    <Typography variant="body2">
                      {formatCurrency(breakdown.subsidyAmount)}
                    </Typography>
                  </div>
                )}
                {breakdown?.totalPrice != null && (
                  <>
                    <Divider />
                    <div className="flex justify-between">
                      <Typography variant="body2" fontWeight={600}>
                        You Pay
                      </Typography>
                      <Typography variant="body1" fontWeight={600} color="primary">
                        {formatCurrency(breakdown.totalPrice)}
                      </Typography>
                    </div>
                  </>
                )}
              </div>
            </Paper>
          </Can>

          {/* Installation Costs */}
          {installationData &&
            ((installationData.totalBeforeTax ?? 0) > 0 ||
              (installationData.totalWithGst ?? 0) > 0) && (
              <Can permission={PERMISSIONS.QUOTES.VIEW_PRICE_BREAKDOWN}>
                <Paper variant="outlined" sx={{ p: 2.5 }}>
                  <Typography variant="subtitle2" sx={{ mb: 2 }}>
                    Installation Costs
                  </Typography>
                  <div className="space-y-2">
                    {(installationData.electricalWork ?? 0) > 0 && (
                      <div className="flex justify-between">
                        <Typography variant="body2" color="text.secondary">
                          Electrical Work
                        </Typography>
                        <Typography variant="body2">
                          {formatCurrency(installationData.electricalWork ?? 0)}
                        </Typography>
                      </div>
                    )}
                    {(installationData.fixedMaterial ?? 0) > 0 && (
                      <div className="flex justify-between">
                        <Typography variant="body2" color="text.secondary">
                          Fixed Material
                        </Typography>
                        <Typography variant="body2">
                          {formatCurrency(installationData.fixedMaterial ?? 0)}
                        </Typography>
                      </div>
                    )}
                    {(installationData.installationLabor ?? 0) > 0 && (
                      <div className="flex justify-between">
                        <Typography variant="body2" color="text.secondary">
                          Installation Labor
                        </Typography>
                        <Typography variant="body2">
                          {formatCurrency(installationData.installationLabor ?? 0)}
                        </Typography>
                      </div>
                    )}
                    {(installationData.loadingUnloading ?? 0) > 0 && (
                      <div className="flex justify-between">
                        <Typography variant="body2" color="text.secondary">
                          Loading / Unloading
                        </Typography>
                        <Typography variant="body2">
                          {formatCurrency(installationData.loadingUnloading ?? 0)}
                        </Typography>
                      </div>
                    )}
                    {(installationData.msedclCharges ?? 0) > 0 && (
                      <div className="flex justify-between">
                        <Typography variant="body2" color="text.secondary">
                          MSEDCL Charges
                        </Typography>
                        <Typography variant="body2">
                          {formatCurrency(installationData.msedclCharges ?? 0)}
                        </Typography>
                      </div>
                    )}
                    {(installationData.transport ?? 0) > 0 && (
                      <div className="flex justify-between">
                        <Typography variant="body2" color="text.secondary">
                          Transport
                        </Typography>
                        <Typography variant="body2">
                          {formatCurrency(installationData.transport ?? 0)}
                        </Typography>
                      </div>
                    )}
                    {(installationData.supervision ?? 0) > 0 && (
                      <div className="flex justify-between">
                        <Typography variant="body2" color="text.secondary">
                          Supervision
                        </Typography>
                        <Typography variant="body2">
                          {formatCurrency(installationData.supervision ?? 0)}
                        </Typography>
                      </div>
                    )}
                    {(installationData.structureCost ?? 0) > 0 && (
                      <div className="flex justify-between">
                        <Typography variant="body2" color="text.secondary">
                          Structure Cost
                        </Typography>
                        <Typography variant="body2">
                          {formatCurrency(installationData.structureCost ?? 0)}
                        </Typography>
                      </div>
                    )}
                    {(installationData.variableFloor ?? 0) > 0 && (
                      <div className="flex justify-between">
                        <Typography variant="body2" color="text.secondary">
                          Variable Floor
                        </Typography>
                        <Typography variant="body2">
                          {formatCurrency(installationData.variableFloor ?? 0)}
                        </Typography>
                      </div>
                    )}
                    <Divider />
                    <div className="flex justify-between">
                      <Typography variant="body2" color="text.secondary">
                        Total Before Tax
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {formatCurrency(installationData.totalBeforeTax ?? 0)}
                      </Typography>
                    </div>
                    {(installationData.gstAmount ?? 0) > 0 && (
                      <div className="flex justify-between">
                        <Typography variant="body2" color="text.secondary">
                          GST{installationData.gstRate ? ` (${installationData.gstRate}%)` : ''}
                        </Typography>
                        <Typography variant="body2">
                          {formatCurrency(installationData.gstAmount ?? 0)}
                        </Typography>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <Typography variant="body2" fontWeight={500}>
                        Total With GST
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {formatCurrency(installationData.totalWithGst ?? 0)}
                      </Typography>
                    </div>
                  </div>
                </Paper>
              </Can>
            )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              Quick Actions
            </Typography>
            <div className="space-y-2">
              <Tooltip
                title={
                  canDownloadPdf
                    ? ''
                    : 'Equipment details are not available for this quote. Create a new quote for this property to enable PDF download.'
                }
              >
                <span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    disabled={!canDownloadPdf || pdfLoading}
                    onClick={handleDownloadPdf}
                  >
                    <DownloadIcon sx={{ mr: 1, fontSize: 16 }} />
                    {pdfLoading ? 'Generating...' : 'Download PDF'}
                  </Button>
                </span>
              </Tooltip>
            </div>
          </Paper>

          {/* Profitability */}
          {profitPercent != null &&
            profitAmount != null &&
            (profitPercent > 0 || profitAmount > 0) && (
              <Can permission={PERMISSIONS.QUOTES.VIEW_PRICE_BREAKDOWN}>
                <Paper variant="outlined" sx={{ p: 2.5 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                    Profitability
                  </Typography>
                  <div className="space-y-2">
                    <LabelValue label="Margin">{profitPercent}%</LabelValue>
                    <LabelValue label="Profit Amount">{formatCurrency(profitAmount)}</LabelValue>
                  </div>
                </Paper>
              </Can>
            )}

          {/* Metadata */}
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              Details
            </Typography>
            <div className="space-y-2">
              <LabelValue label="Quote Date">{formatDate(quote.quoteDate, 'medium')}</LabelValue>
              <LabelValue label="Valid Until">{formatDate(quote.validUntil, 'medium')}</LabelValue>
              <LabelValue label="Last Updated">{formatDate(quote.updatedAt, 'medium')}</LabelValue>
              {quote.acceptedAt && (
                <LabelValue label="Accepted At">
                  {formatDate(quote.acceptedAt, 'medium')}
                </LabelValue>
              )}
            </div>
          </Paper>

          {/* Rejection Reason */}
          {quote.rejectionReason && (
            <Paper variant="outlined" sx={{ p: 2.5 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Rejection Reason
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {quote.rejectionReason}
              </Typography>
            </Paper>
          )}

          {/* Notes */}
          {quote.customerNotes && (
            <Paper variant="outlined" sx={{ p: 2.5 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Customer Notes
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {quote.customerNotes}
              </Typography>
            </Paper>
          )}

          {quote.internalNotes && (
            <Paper variant="outlined" sx={{ p: 2.5 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Internal Notes
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {quote.internalNotes}
              </Typography>
            </Paper>
          )}

          {/* Sales Person */}
          {quote.salesPersonName && (
            <Paper variant="outlined" sx={{ p: 2.5 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  fontSize: '0.65rem',
                  mb: 0.5,
                  display: 'block',
                }}
              >
                Sales Person
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {quote.salesPersonName}
              </Typography>
            </Paper>
          )}
        </div>
      </div>
    </div>
  );
}
