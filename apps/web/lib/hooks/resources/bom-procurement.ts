'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { apiClient } from '@/lib/api/client';

// ============================================================================
// Types — mirror BomService.getProcurementStatus return shape.
// ============================================================================

export interface BomProcurementItem {
  productId: string;
  name: string;
  unit: string;
  targetQty: number;
  unitPrice: number | null;
  /** unitPrice * targetQty when unitPrice is known; null otherwise. */
  targetSpend: number | null;
}

export interface BomProcurementStatus {
  items: BomProcurementItem[];
  totals: {
    totalProducts: number;
    /** What the current BOM says the materials should cost, in rupees. */
    targetSpend: number;
    /**
     * Total spent on materials for this project, in rupees: the sum of ledger
     * expenses categorised `materials`.
     *
     * Project-level, never per-product. `spentQty`, `remaining`, `status`,
     * `over` and `actualSpend` used to sit on each item, sourced from
     * `expense_product_links` — a table with no writer, so they were zero on
     * every row of every project. The ledger that replaced it records the money
     * and its category, not the product it bought, so a per-product figure is
     * not derivable and those fields are gone rather than lying.
     */
    materialSpend: number;
  };
}

// ============================================================================
// Cache keys — separate from the bom resource keys so expense mutations
// can invalidate procurement views without dropping the underlying BOM.
// ============================================================================

export const bomProcurementKeys = {
  byProject: (projectId: string) => ['bom-procurement-status', projectId] as const,
};

// ============================================================================
// Hook
// ============================================================================

/**
 * The project's materials budget: per-product target quantity and cost from the
 * BOM, plus one project-level total of what has actually been spent on
 * materials. Powers the Materials budget panel on the BOM tab.
 */
export function useBomProcurementStatus(
  projectId: string,
  options?: { enabled?: boolean },
): UseQueryResult<BomProcurementStatus, AxiosError> {
  return useQuery({
    queryKey: bomProcurementKeys.byProject(projectId),
    queryFn: async ({ signal }): Promise<BomProcurementStatus> => {
      const { data } = await apiClient.get<BomProcurementStatus>(
        `/bom/project/${projectId}/procurement-status`,
        { signal },
      );
      return data;
    },
    enabled: !!projectId && options?.enabled !== false,
    staleTime: 30_000,
  });
}
