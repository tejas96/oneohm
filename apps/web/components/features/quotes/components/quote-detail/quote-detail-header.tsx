'use client';

import { QuoteStatus } from '@oneohm-epc/shared-types';
import { History } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

import type { QuoteDetail, QuoteVersionDetail } from '../../hooks/types';
import { QuoteStatusDropdown } from '../quote-status-dropdown';

import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/lib/config/routes';
import { formatDate } from '@/lib/utils/format';

interface QuoteDetailHeaderProps {
  quote: QuoteDetail;
  viewingVersion?: QuoteVersionDetail;
  isViewingHistorical: boolean;
  onClearVersionView: () => void;
}

export const QuoteDetailHeader = React.memo(
  ({
    quote,
    viewingVersion,
    isViewingHistorical,
    onClearVersionView,
  }: QuoteDetailHeaderProps): React.JSX.Element => {
    const router = useRouter();
    const isExpired = new Date(quote.validUntil) < new Date();

    return (
      <div className="space-y-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={ROUTES.QUOTES.LIST}>Quotes</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="truncate max-w-[200px]">
                {quote.quoteNumber}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold text-foreground">{quote.quoteNumber}</h1>
              <QuoteStatusDropdown quoteId={quote.id} status={quote.status} size="sm" />
              <Badge variant="muted" shape="pill" size="xs">
                v{quote.currentVersion}
              </Badge>
              {isExpired && quote.status !== QuoteStatus.EXPIRED && (
                <Badge variant="warning" shape="pill" size="xs">
                  Expired
                </Badge>
              )}
            </div>
            <p className="text-xs text-foreground-secondary mt-1">
              Created {formatDate(quote.createdAt, 'medium')}
              {' · '}Valid until {formatDate(quote.validUntil, 'medium')}
              {quote.salesPersonName ? ` · ${quote.salesPersonName}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {quote.status === QuoteStatus.ACCEPTED && (
              <Button
                size="sm"
                onClick={() => {
                  const params = new URLSearchParams({
                    quoteId: quote.id,
                    customerId: quote.customerId,
                  });
                  if (quote.propertyId) params.set('propertyId', quote.propertyId);
                  router.push(`${ROUTES.PROJECTS.NEW}?${params.toString()}`);
                }}
              >
                Convert to Project
              </Button>
            )}
          </div>
        </div>

        {isViewingHistorical && viewingVersion && (
          <div className="flex items-center gap-2 rounded-lg bg-info/5 border border-info/20 px-3 py-2">
            <History className="size-icon-sm text-info shrink-0" />
            <p className="text-xs text-foreground-secondary flex-1">
              Viewing version {viewingVersion.versionNumber} of {quote.currentVersion}
              {viewingVersion.changeSummary ? ` — ${viewingVersion.changeSummary}` : ''}
            </p>
            <Button variant="ghost" size="sm" onClick={onClearVersionView}>
              View Current
            </Button>
          </div>
        )}
      </div>
    );
  },
);

QuoteDetailHeader.displayName = 'QuoteDetailHeader';
