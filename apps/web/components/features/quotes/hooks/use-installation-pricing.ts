'use client';

import { type ProjectType } from '@oneohm-epc/shared-types';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

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
 * Fetches installation pricing from the backend for the given system size
 * and project type, debounced by 1 second to avoid excessive API calls
 * while the user adjusts the system size slider/stepper.
 *
 * The backend returns raw entity data where decimal columns are strings
 * (PostgreSQL/TypeORM behavior), so we coerce to number here.
 */
export function useInstallationPricing(systemSizeKw: number, projectType: ProjectType) {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  const [debouncedSize, setDebouncedSize] = useState(systemSizeKw);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSize(systemSizeKw), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [systemSizeKw]);

  const query = useQuery<InstallationPricingData | null>({
    queryKey: ['installation-pricing', organizationId, debouncedSize, projectType],
    queryFn: async () => {
      const { data } = await apiClient.get<InstallationPricingRaw | null>(
        '/quote-calculator/installation-pricing',
        {
          params: { systemSizeKw: debouncedSize, projectType },
          headers: { 'X-Organization-Id': organizationId },
        },
      );
      if (!data) return null;
      return {
        transportRatePerKm: Number(data.transportRatePerKm),
        floorIncrementPercent: Number(data.floorIncrementPercent),
        gstRate: Number(data.gstRate),
      };
    },
    enabled: !!organizationId && debouncedSize > 0,
    staleTime: 5 * 60 * 1000,
  });

  return {
    pricing: query.data ?? null,
    isLoading: query.isLoading,
    isFetched: query.isFetched,
    transportRatePerKm: query.data?.transportRatePerKm ?? null,
    floorIncrementPercent: query.data?.floorIncrementPercent ?? null,
  };
}
