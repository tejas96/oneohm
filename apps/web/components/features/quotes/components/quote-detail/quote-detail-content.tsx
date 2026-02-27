'use client';

import { FileText } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';

import { QuoteDetailHeader } from './quote-detail-header';
import { QuoteDetailTabs } from './quote-detail-tabs';
import { QuoteComingSoonTab } from './tabs/quote-coming-soon-tab';
import { QuoteLineItemsTab } from './tabs/quote-line-items-tab';
import { QuoteOverviewTab } from './tabs/quote-overview-tab';
import { QuotePaymentsTab } from './tabs/quote-payments-tab';
import { QuoteVersionsTab } from './tabs/quote-versions-tab';
import { QUOTE_DETAIL_TABS, type QuoteDetailTab } from '../../constants';
import { useQuoteDetail, useQuoteVersion } from '../../hooks/use-quote-detail';

import { EmptyState, ErrorState } from '@/components/shared/feedback/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { TabsContent } from '@/components/ui/tabs';
import { ROUTES } from '@/lib/config/routes';
import { getErrorMessage } from '@/lib/utils/error';

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

  const selectedVersionId = searchParams.get('version');

  useEffect(() => {
    const param = searchParams.get('tab') ?? 'overview';
    const tab = VALID_TABS.has(param) ? (param as QuoteDetailTab) : 'overview';
    setActiveTab(tab);
  }, [searchParams]);

  const { data: quote, isLoading, isError, error, refetch } = useQuoteDetail(quoteId);

  const { data: selectedVersion, isError: isVersionError } = useQuoteVersion(
    quoteId,
    selectedVersionId,
    { enabled: !!selectedVersionId },
  );

  const handleTabChange = useCallback(
    (tab: QuoteDetailTab) => {
      setActiveTab(tab);
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', tab);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const handleVersionSelect = useCallback(
    (versionId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (versionId) {
        params.set('version', versionId);
      } else {
        params.delete('version');
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  useEffect(() => {
    if (isVersionError && selectedVersionId) {
      handleVersionSelect(null);
    }
  }, [isVersionError, selectedVersionId, handleVersionSelect]);

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

  const viewingVersion = selectedVersion ?? undefined;
  const isViewingHistorical = !!selectedVersionId && !selectedVersion?.isCurrent;

  return (
    <div className="p-4 space-y-4">
      <QuoteDetailHeader
        quote={quote}
        viewingVersion={viewingVersion}
        isViewingHistorical={isViewingHistorical}
        onClearVersionView={() => handleVersionSelect(null)}
      />

      <QuoteDetailTabs activeTab={activeTab} onTabChange={handleTabChange}>
        <TabsContent value="overview">
          <QuoteOverviewTab
            quote={quote}
            viewingVersion={viewingVersion}
            isActive={activeTab === 'overview'}
          />
        </TabsContent>

        <TabsContent value="line-items">
          <QuoteLineItemsTab
            quote={quote}
            viewingVersion={viewingVersion}
            isActive={activeTab === 'line-items'}
          />
        </TabsContent>

        <TabsContent value="versions">
          <QuoteVersionsTab
            quote={quote}
            selectedVersionId={selectedVersionId}
            onVersionSelect={handleVersionSelect}
            isActive={activeTab === 'versions'}
          />
        </TabsContent>

        <TabsContent value="payments">
          <QuotePaymentsTab
            quote={quote}
            viewingVersion={viewingVersion}
            isActive={activeTab === 'payments'}
          />
        </TabsContent>

        <TabsContent value="activity">
          <QuoteComingSoonTab tabName="Activity" />
        </TabsContent>
      </QuoteDetailTabs>
    </div>
  );
}
