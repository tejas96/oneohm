'use client';

import { QuoteStatus } from '@tejas96/shared/types';
import { FileText } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { QuoteDetailHeader } from './quote-detail-header';
import { QuoteOverviewTab } from './tabs/quote-overview-tab';
import type { QuoteDetail } from '../../hooks/types';
import { useQuoteDetail } from '../../hooks/use-quote-detail';
import { usePropertyQuoteVersions } from '../../hooks/use-quotes';
import { generateAndDownloadPdf } from '../../services/quote-pdf.service';
import type { CalculateQuoteResponse, QuotePdfData } from '../../types';

import { EmptyState, ErrorState } from '@/components/shared/feedback/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { type Bom, type BomItem, useEntityBom, useQuoteConfig } from '@/lib/hooks/resources';
import { getErrorMessage } from '@/lib/utils/error';
import { recordRecentView } from '@/lib/utils/recent-views';
import { useAuth } from '@/providers/auth-provider';

interface QuoteDetailContentProps {
  quoteId: string;
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

function LoadingSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-6 w-48" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-12 rounded-full" />
      </div>
      <Skeleton className="h-4 w-96" />
      <Skeleton className="h-10 w-full" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function QuoteDetailContent({ quoteId }: QuoteDetailContentProps): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { data: quote, isLoading, isError, error, refetch } = useQuoteDetail(quoteId);
  const { user } = useAuth();
  const [pdfLoading, setPdfLoading] = useState(false);
  const { data: quoteConfig } = useQuoteConfig();

  useEffect(() => {
    if (quote && user?.id) {
      recordRecentView(user.id, {
        type: 'quote',
        id: quote.id,
        label: quote.quoteNumber,
        href: buildRoute(ROUTES.QUOTES.DETAIL, { id: quote.id }),
      });
    }
  }, [quote, user?.id]);

  const handlePropertyQuoteSelect = useCallback(
    (targetQuoteId: string) => {
      if (targetQuoteId === quoteId) return;
      const params = new URLSearchParams(searchParams.toString());
      params.delete('version');
      const query = params.toString();
      const nextUrl = buildRoute(ROUTES.QUOTES.DETAIL, { id: targetQuoteId });
      router.push(query ? `${nextUrl}?${query}` : nextUrl);
    },
    [quoteId, router, searchParams],
  );

  const latestInternalVersion = [...(quote?.versions ?? [])].sort((a, b) => {
    const createdDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (createdDiff !== 0) return createdDiff;
    return b.versionNumber - a.versionNumber;
  })[0];
  const bomVersionId = latestInternalVersion?.id;
  const { data: bom, isLoading: isBomLoading } = useEntityBom('quote_version', bomVersionId);
  const { data: propertyQuoteVersions } = usePropertyQuoteVersions(quote?.propertyId);

  const activeSnapshot = quote?.quoteSnapshot;
  const isOldData = useMemo(() => {
    if (!activeSnapshot?.calculation) return true;
    return (
      typeof activeSnapshot.calculation !== 'object' ||
      Object.keys(activeSnapshot.calculation).length === 0 ||
      !Array.isArray((activeSnapshot.calculation as unknown as Record<string, unknown>).panels)
    );
  }, [activeSnapshot]);

  const hasBomPanels = bom?.items?.some((i) => i.itemType === 'panel') ?? false;
  const hasStoredCalc = !isOldData;
  const canDownloadPdf = hasStoredCalc || hasBomPanels;

  const defaultGstConfig = { rate1: 12, rate1Percentage: 70, rate2: 18, rate2Percentage: 30 };

  const handleDownloadPdf = useCallback(async () => {
    if (!quote) return;
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
        discountAmount:
          quote.quoteSnapshot?.pricing?.discountAmount ?? quote.pricingBreakdown?.discountAmount,
        gstConfig: quoteConfig?.gstConfig ?? defaultGstConfig,
      };
      await generateAndDownloadPdf(pdfData);
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setPdfLoading(false);
    }
  }, [bom, quote, quoteConfig, hasStoredCalc, activeSnapshot]);

  if (isLoading) return <LoadingSkeleton />;

  if (isError || !quote) {
    return (
      <div className="p-4">
        {isError ? (
          <ErrorState
            title="Failed to load quote"
            description={getErrorMessage(error)}
            onRetry={() => refetch()}
          />
        ) : (
          <EmptyState
            icon={<FileText className="w-full h-full" />}
            iconColor="error"
            title="Quote not found"
            description="The quote you're looking for doesn't exist or has been removed."
            action={{
              label: 'Back to Quotes',
              onClick: () => router.push(ROUTES.QUOTES.LIST),
            }}
          />
        )}
      </div>
    );
  }

  const orderedByCreatedAt = [...(propertyQuoteVersions ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const fallbackQuotes =
    orderedByCreatedAt.length > 0
      ? orderedByCreatedAt
      : [
          {
            id: quote.id,
            quoteNumber: quote.quoteNumber,
            status: quote.status,
            createdAt: quote.createdAt,
            quoteDate: quote.quoteDate,
            systemSizeKw: quote.systemSizeKw,
            totalWattageWp: quote.totalWattageWp,
            effectivePrice: quote.effectivePrice,
          },
        ];
  const acceptedQuotes = fallbackQuotes.filter((q) => q.status === QuoteStatus.ACCEPTED);
  const nonAcceptedQuotes = fallbackQuotes.filter((q) => q.status !== QuoteStatus.ACCEPTED);
  const orderedPropertyQuotes =
    acceptedQuotes.length > 0 ? [...acceptedQuotes, ...nonAcceptedQuotes] : fallbackQuotes;
  const primaryPropertyQuoteId = orderedPropertyQuotes[0]?.id;
  const isPrimaryPropertyQuote = primaryPropertyQuoteId
    ? primaryPropertyQuoteId === quote.id
    : true;

  return (
    <div className="space-y-6">
      <QuoteDetailHeader
        quote={quote}
        isLatestPropertyQuote={isPrimaryPropertyQuote}
        canDownloadPdf={canDownloadPdf}
        pdfLoading={pdfLoading}
        handleDownloadPdf={() => {
          void handleDownloadPdf();
        }}
      />

      <main className="max-w-7xl mx-auto px-4 lg:px-6 space-y-6 pb-12">
        {quote.propertyId && orderedPropertyQuotes.length > 0 && (
          <div className="bg-white border border-border rounded-xl p-4.5 flex items-center gap-3 flex-wrap shadow-sm">
            <span className="text-xs font-bold text-foreground">Property Quotes:</span>
            <div className="relative min-w-[260px]">
              <select
                value={quote.id}
                onChange={(e) => handlePropertyQuoteSelect(e.target.value)}
                className="w-full bg-white border border-border rounded-lg px-3 py-1.5 pr-8 text-xs text-foreground-secondary font-medium focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
              >
                {orderedPropertyQuotes.map((propertyQuote, idx) => (
                  <option key={propertyQuote.id} value={propertyQuote.id}>
                    {propertyQuote.quoteNumber}
                    {idx === 0 ? ' (Current Version)' : ' (Historical)'}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-2.5 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-foreground-secondary pointer-events-none" />
            </div>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold ${
                isPrimaryPropertyQuote
                  ? 'bg-primary/10 text-primary-dark border border-primary/20'
                  : 'bg-gray-100 text-gray-700 border border-gray-200'
              }`}
            >
              {isPrimaryPropertyQuote ? 'Current Active Version' : 'Historical Version'}
            </span>
          </div>
        )}

        <QuoteOverviewTab
          quote={quote}
          isActive={true}
          bom={bom ?? undefined}
          isBomLoading={isBomLoading}
          isLatestPropertyQuote={isPrimaryPropertyQuote}
        />
      </main>
    </div>
  );
}
