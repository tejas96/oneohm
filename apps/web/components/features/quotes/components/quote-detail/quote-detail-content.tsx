'use client';

import { QuoteStatus } from '@tejas96/shared/types';
import { FileText, Info } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { QuoteDetailHeader } from './quote-detail-header';
import { QuoteOverviewTab } from './tabs/quote-overview-tab';
import { useQuoteDetail } from '../../hooks/use-quote-detail';
import {
  usePropertyQuoteVersions,
  useShareQuoteWhatsapp,
  useWhatsappMessagingHealth,
} from '../../hooks/use-quotes';
import { generateAndDownloadPdf } from '../../services/quote-pdf.service';
import type { CalculateQuoteResponse, QuotePdfData } from '../../types';
import { quoteBomLines } from '../../utils/quote-bom-lines';

import { EmptyState, ErrorState } from '@/components/shared/feedback/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { showToast } from '@/components/ui/sonner';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { useQuoteConfig } from '@/lib/hooks/resources';
import { useGatedAction } from '@/lib/rbac';
import { getErrorMessage } from '@/lib/utils/error';
import { recordRecentView } from '@/lib/utils/recent-views';
import { useAuth } from '@/providers/auth-provider';

interface QuoteDetailContentProps {
  quoteId: string;
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
  const shareQuote = useGatedAction('quotes.send', () => undefined, 'Share quote');
  const router = useRouter();
  const searchParams = useSearchParams();

  const { data: quote, isLoading, isError, error, refetch } = useQuoteDetail(quoteId);
  const { user } = useAuth();
  const [pdfLoading, setPdfLoading] = useState(false);
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const shareWhatsappMutation = useShareQuoteWhatsapp();
  const { data: whatsappHealth } = useWhatsappMessagingHealth();
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

  const { data: propertyQuoteVersions } = usePropertyQuoteVersions(quote?.propertyId);

  const activeSnapshot = quote?.quoteSnapshot;
  // The snapshot is the record. The quote_version BOM was a second copy of
  // it, written best-effort on every save, so deriving lines client-side
  // both removes a write and removes a way for the page to show nothing when
  // that write had failed.
  const bomLines = useMemo(
    () => (activeSnapshot?.calculation ? quoteBomLines(activeSnapshot.calculation) : []),
    [activeSnapshot],
  );
  const isBomLoading = false;
  const isOldData = useMemo(() => {
    if (!activeSnapshot?.calculation) return true;
    return (
      typeof activeSnapshot.calculation !== 'object' ||
      Object.keys(activeSnapshot.calculation).length === 0 ||
      !Array.isArray((activeSnapshot.calculation as unknown as Record<string, unknown>).panels)
    );
  }, [activeSnapshot]);

  const hasStoredCalc = !isOldData;
  const canDownloadPdf = hasStoredCalc;

  const defaultGstConfig = { rate1: 12, rate1Percentage: 70, rate2: 18, rate2Percentage: 30 };

  const buildQuotePdfData = useCallback((): QuotePdfData | null => {
    if (!quote) return null;
    if (!hasStoredCalc || !activeSnapshot?.calculation) return null;
    const calculation: CalculateQuoteResponse = activeSnapshot.calculation;

    return {
      calculation,
      customer: {
        name: quote.customerName ?? '',
        phone: quote.customerPhone ?? '',
        email: quote.customerEmail ?? '',
        address: quote.customerAddress ?? '',
        city: quote.customerCity ?? '',
        state: quote.customerState ?? '',
        pincode: quote.customerPincode ?? '',
        consumerNumber: quote.consumerNumber ?? '',
      },
      property: {
        propertyName: quote.propertyName ?? '',
        address: quote.propertyAddress ?? '',
        city: quote.propertyCity ?? '',
        state: quote.propertyState ?? '',
        pincode: quote.propertyPincode ?? '',
      },
      quoteNumber: quote.quoteNumber,
      validityDays: Math.ceil(
        (new Date(quote.validUntil).getTime() - new Date(quote.quoteDate).getTime()) / 86400000,
      ),
      paymentMilestones: quote.paymentMilestones,
      discountAmount:
        quote.quoteSnapshot?.pricing?.discountAmount ?? quote.pricingBreakdown?.discountAmount,
      gstConfig: quoteConfig?.gstConfig ?? defaultGstConfig,
      // BomItem requires an `id`; bomLines has none (a quotation's lines have
      // no BOM row to be one), so a synthetic one is added here. The template
      // never reads it — it only groups additional lines by itemType, and a
      // quotation's lines are always panel/inverter/structure.
      bomItems: bomLines.map((line, index) => ({ id: `${line.itemType}-${index}`, ...line })),
      customerNotes: quote.customerNotes,
    };
  }, [bomLines, quote, quoteConfig, hasStoredCalc, activeSnapshot]);

  const handleDownloadPdf = useCallback(async () => {
    const pdfData = buildQuotePdfData();
    if (!pdfData) return;

    if (!pdfData.customer.name.trim()) {
      showToast.error('Customer name is missing on this quote; cannot generate PDF');
      return;
    }

    setPdfLoading(true);
    try {
      await generateAndDownloadPdf(pdfData);
    } catch (err) {
      console.error('PDF generation error:', err);
      showToast.error('Failed to generate PDF');
    } finally {
      setPdfLoading(false);
    }
  }, [buildQuotePdfData]);

  const handleSendWhatsapp = useCallback(async () => {
    const pdfData = buildQuotePdfData();
    if (!pdfData || !quote) return;

    if (!pdfData.customer.name.trim()) {
      showToast.error('Customer name is missing on this quote; cannot send PDF');
      return;
    }

    if (!quote.customerPhone) {
      showToast.error('Customer phone number is required to send via WhatsApp');
      return;
    }

    setWhatsappLoading(true);
    try {
      if (!shareQuote.allowed) {
        shareQuote.onGatedClick();
        return;
      }
      const result = await shareWhatsappMutation.mutateAsync({
        quoteId: quote.id,
        pdfData,
        quoteStatus: quote.status,
      });
      const acceptedNote = result.messageId ? ` (ref: ${result.messageId.slice(-8)})` : '';
      showToast.success(
        quote.status === QuoteStatus.DRAFT
          ? `Quotation sent on WhatsApp${acceptedNote}`
          : `Quotation resent on WhatsApp${acceptedNote}`,
      );
    } catch (err) {
      showToast.error(getErrorMessage(err));
    } finally {
      setWhatsappLoading(false);
    }
  }, [buildQuotePdfData, quote, shareWhatsappMutation]);

  const canSendWhatsapp =
    canDownloadPdf &&
    !!quote?.customerPhone &&
    quote?.status !== QuoteStatus.ACCEPTED &&
    quote?.status !== QuoteStatus.REJECTED &&
    !(whatsappHealth && !whatsappHealth.canSend);

  const whatsappBlockedReason =
    whatsappHealth && !whatsappHealth.canSend
      ? whatsappHealth.errors[0]?.description ||
        'WhatsApp messaging is blocked. Check billing or credentials in admin integrations.'
      : undefined;

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
        canSendWhatsapp={canSendWhatsapp}
        showWhatsappButton={quote.status === QuoteStatus.SENT}
        whatsappLoading={whatsappLoading}
        whatsappBlockedReason={whatsappBlockedReason}
        whatsappLabel="Resend via WhatsApp"
        handleSendWhatsapp={() => {
          void handleSendWhatsapp();
        }}
        onShareWhatsapp={handleSendWhatsapp}
      />

      <main className="max-w-7xl mx-auto px-4 lg:px-6 space-y-6 pb-12">
        {quote.status === QuoteStatus.DRAFT && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-3 shadow-sm">
            <Info className="h-4 w-4 text-primary shrink-0" />
            <p className="text-xs text-foreground-secondary">
              <span className="font-semibold text-foreground">This quote is still a Draft</span> —
              it hasn&apos;t been sent to the customer yet. Use the{' '}
              <span className="font-semibold text-primary-dark">Draft</span> status dropdown next to
              the quote number above to send it via WhatsApp or mark it sent.
            </p>
          </div>
        )}

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
          isBomLoading={isBomLoading}
          isLatestPropertyQuote={isPrimaryPropertyQuote}
        />
      </main>
    </div>
  );
}
