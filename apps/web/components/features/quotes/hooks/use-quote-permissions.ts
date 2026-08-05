'use client';

import { useFeatureAccess } from '@/lib/hooks/use-feature-access';

export interface QuotePermissions {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canViewPriceBreakdown: boolean;
}

export function useQuotePermissions(): QuotePermissions {
  return {
    canView: useFeatureAccess('quotes.view'),
    canCreate: useFeatureAccess('quotes.create'),
    canUpdate: useFeatureAccess('quotes.manage'),
    canViewPriceBreakdown: useFeatureAccess('quotes.priceBreakdown.view'),
  };
}
