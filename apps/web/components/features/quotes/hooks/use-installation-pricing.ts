'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { apiClient } from '@/lib/api/client';

const DEBOUNCE_MS = 1000;

interface InstallationPricingRaw {
  transportRatePerKm: number | string;
  floorIncrementPercent: number | string;
  costComponents: Record<string, number>;
  gstRate: number | string;
  minSystemSizeKw: number | string;
  maxSystemSizeKw: number | string;
}

export interface InstallationPricingData {
  transportRatePerKm: number;
  floorIncrementPercent: number;
  gstRate: number;
}

/**
 * Fetches installation pricing from the backend for the given system size,
 * debounced by 1 second to avoid excessive API calls while the user
 * adjusts the system size slider/stepper.
 *
 * The backend returns raw entity data where decimal columns are strings
 * (PostgreSQL/TypeORM behavior), so we coerce to number here.
 */
export function useInstallationPricing(systemSizeKw: number) {

  const [debouncedSize, setDebouncedSize] = useState(systemSizeKw);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSize(systemSizeKw), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [systemSizeKw]);

  // True while the user is adjusting size but debounce hasn't fired yet
  const isDebouncing = systemSizeKw !== debouncedSize;

  const query = useQuery<InstallationPricingData | null>({
    queryKey: ['installation-pricing', debouncedSize],
    queryFn: async () => {
      const { data } = await apiClient.get<InstallationPricingRaw | null>(
        '/quote-calculator/installation-pricing',
        {
          params: { systemSizeKw: debouncedSize },
        },
      );
      if (!data) return null;
      return {
        transportRatePerKm: Number(data.transportRatePerKm),
        floorIncrementPercent: Number(data.floorIncrementPercent),
        gstRate: Number(data.gstRate),
      };
    },
    enabled: debouncedSize > 0,
    staleTime: 5 * 60 * 1000,
  });

  const pricingAvailable =
    query.isFetched && !isDebouncing && query.data !== null && query.data !== undefined;

  return {
    pricing: query.data ?? null,
    isLoading: query.isLoading,
    isFetched: query.isFetched,
    isDebouncing,
    pricingAvailable,
    transportRatePerKm: query.data?.transportRatePerKm ?? null,
    floorIncrementPercent: query.data?.floorIncrementPercent ?? null,
  };
}
