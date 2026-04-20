'use client';

import { FormControl, MenuItem, Paper, Select, Typography } from '@mui/material';
import { QuoteStatus } from '@oneohm-epc/shared/types';
import { FileText } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';

import { QuoteDetailHeader } from './quote-detail-header';
import { QuoteDetailTabs } from './quote-detail-tabs';
import { QuoteOverviewTab } from './tabs/quote-overview-tab';
import { QuotePaymentsTab } from './tabs/quote-payments-tab';
import { QUOTE_DETAIL_TABS, type QuoteDetailTab } from '../../constants';
import { useQuoteDetail } from '../../hooks/use-quote-detail';
import { usePropertyQuoteVersions } from '../../hooks/use-quotes';

import { EmptyState, ErrorState } from '@/components/shared/feedback/empty-state';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TabsContent } from '@/components/ui/tabs';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { useEntityBom } from '@/lib/hooks/resources';
import { getErrorMessage } from '@/lib/utils/error';
import { recordRecentView } from '@/lib/utils/recent-views';
import { useAuth } from '@/providers/auth-provider';

interface QuoteDetailContentProps {
  quoteId: string;
}

const VALID_TABS = new Set<string>(QUOTE_DETAIL_TABS.map((t) => t.value));

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

  const tabParam = searchParams.get('tab') ?? 'overview';
  const initialTab = VALID_TABS.has(tabParam) ? (tabParam as QuoteDetailTab) : 'overview';
  const [activeTab, setActiveTab] = useState<QuoteDetailTab>(initialTab);

  useEffect(() => {
    const param = searchParams.get('tab') ?? 'overview';
    const tab = VALID_TABS.has(param) ? (param as QuoteDetailTab) : 'overview';
    setActiveTab(tab);
  }, [searchParams]);

  const { data: quote, isLoading, isError, error, refetch } = useQuoteDetail(quoteId);
  const { user } = useAuth();

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

  const handleTabChange = useCallback(
    (tab: QuoteDetailTab) => {
      setActiveTab(tab);
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', tab);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

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
    <div className="p-4 space-y-4">
      <QuoteDetailHeader quote={quote} isLatestPropertyQuote={isPrimaryPropertyQuote} />

      {quote.propertyId && orderedPropertyQuotes.length > 0 && (
        <Paper
          variant="outlined"
          sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}
        >
          <Typography variant="body2" fontWeight={500}>
            Property Quotes:
          </Typography>
          <FormControl size="small" sx={{ minWidth: 260 }}>
            <Select
              value={quote.id}
              onChange={(e) => handlePropertyQuoteSelect(e.target.value)}
              size="small"
              sx={{ fontSize: '0.875rem' }}
            >
              {orderedPropertyQuotes.map((propertyQuote, idx) => (
                <MenuItem
                  key={propertyQuote.id}
                  value={propertyQuote.id}
                  sx={{ fontSize: '0.875rem' }}
                >
                  {propertyQuote.quoteNumber}
                  {idx === 0 ? ' (Current)' : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Badge variant={isPrimaryPropertyQuote ? 'success' : 'muted'} size="xs" shape="pill">
            {isPrimaryPropertyQuote ? 'Current' : 'Historical'}
          </Badge>
        </Paper>
      )}

      <QuoteDetailTabs activeTab={activeTab} onTabChange={handleTabChange}>
        <TabsContent value="overview">
          <QuoteOverviewTab
            quote={quote}
            isActive={activeTab === 'overview'}
            bom={bom ?? undefined}
            isBomLoading={isBomLoading}
            isLatestPropertyQuote={isPrimaryPropertyQuote}
          />
        </TabsContent>

        <TabsContent value="payments">
          <QuotePaymentsTab quote={quote} isActive={activeTab === 'payments'} />
        </TabsContent>
      </QuoteDetailTabs>
    </div>
  );
}
