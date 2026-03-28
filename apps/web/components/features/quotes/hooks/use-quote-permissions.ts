'use client';

import { useMemo } from 'react';

import { PERMISSIONS } from '@/lib/constants/permissions';
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
      canView: hasPermission(PERMISSIONS.QUOTES.VIEW),
      canCreate: hasPermission(PERMISSIONS.QUOTES.CREATE),
      canUpdate: hasPermission(PERMISSIONS.QUOTES.UPDATE),
      canViewPriceBreakdown: hasPermission(PERMISSIONS.QUOTES.VIEW_PRICE_BREAKDOWN),
    }),
    [hasPermission],
  );
}
