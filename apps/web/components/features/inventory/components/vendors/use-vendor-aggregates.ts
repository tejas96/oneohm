'use client';

import { useMemo } from 'react';

import type { Vendor } from '@/lib/hooks/resources/vendors';

/**
 * Page-scoped vendor aggregates derived from the visible list.
 *
 * Why client-side: the vendors stats endpoint returns org-wide
 * counts by status/type, but the operator usually wants to see
 * "what's on the page after I applied this filter". Mirrors the
 * pattern used by the warehouse list.
 */

export interface VendorAggregates {
  totalCount: number;
  activeCount: number;
  ratedCount: number;
  averageRating: number | null;
  blacklistedCount: number;
}

const ZERO: VendorAggregates = {
  totalCount: 0,
  activeCount: 0,
  ratedCount: 0,
  averageRating: null,
  blacklistedCount: 0,
};

export function useVendorAggregates(
  vendors: readonly Vendor[] | undefined,
): VendorAggregates {
  return useMemo(() => {
    if (!vendors || vendors.length === 0) return ZERO;
    let activeCount = 0;
    let blacklistedCount = 0;
    let ratedCount = 0;
    let ratingSum = 0;
    for (const v of vendors) {
      if (v.status === 'active') activeCount += 1;
      if (v.status === 'blacklisted') blacklistedCount += 1;
      const r = Number(v.rating ?? 0);
      if (Number.isFinite(r) && r > 0) {
        ratedCount += 1;
        ratingSum += r;
      }
    }
    return {
      totalCount: vendors.length,
      activeCount,
      ratedCount,
      averageRating: ratedCount > 0 ? ratingSum / ratedCount : null,
      blacklistedCount,
    };
  }, [vendors]);
}
