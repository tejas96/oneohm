'use client';

import { useMemo } from 'react';

import { useAuth } from '@/providers/auth-provider';

export interface QuotePermissions {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canViewPriceBreakdown: boolean;
}

export function useQuotePermissions(): QuotePermissions {
  const { hasPermission } = useAuth();

  return useMemo(
    () => ({
      canView: hasPermission('quotes.view'),
      canCreate: hasPermission('quotes.create'),
      canUpdate: hasPermission('quotes.edit'),
      canViewPriceBreakdown: hasPermission('quotes.profitability'),
    }),
    [hasPermission],
  );
}
