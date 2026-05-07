'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { useOrgContext } from '../core';

import { apiClient } from '@/lib/api/client';

// ============================================================================
// Types — mirror BomService.getProcurementStatus return shape.
// ============================================================================

export type BomProcurementItemStatus = 'pending' | 'partial' | 'procured';

export interface BomProcurementItem {
  productId: string;
  name: string;
  unit: string;
  targetQty: number;
  spentQty: number;
  status: BomProcurementItemStatus;
  /** True when spentQty > targetQty (procurement guard was overridden). */
  over: boolean;
  remaining: number;
  unitPrice: number | null;
  /** unitPrice * targetQty when unitPrice is known; null otherwise. */
  targetSpend: number | null;
  /** Sum of (link.quantity * link.unitPrice) across all expense links. */
  actualSpend: number;
}

export interface BomProcurementStatus {
  items: BomProcurementItem[];
  totals: {
    totalProducts: number;
    pending: number;
    partial: number;
    procured: number;
    overProcuredProducts: number;
    targetSpend: number;
    actualSpend: number;
  };
}

// ============================================================================
// Cache keys — separate from the bom resource keys so expense mutations
// can invalidate procurement views without dropping the underlying BOM.
// ============================================================================

export const bomProcurementKeys = {
  byProject: (orgId: string | undefined, projectId: string) =>
    ['bom-procurement-status', orgId, projectId] as const,
};

// ============================================================================
// Hook
// ============================================================================

/**
 * Per-product procurement status for a project: target qty (from BOM)
 * vs spent qty (from expense_product_links). Powers the Procurement
 * section of the BOM tab and the spend-budget metric on the Finance tab.
 */
export function useBomProcurementStatus(
  projectId: string,
  options?: { enabled?: boolean },
): UseQueryResult<BomProcurementStatus, AxiosError> {
  const { organizationId, orgHeaders, isReady } = useOrgContext();

  return useQuery({
    queryKey: bomProcurementKeys.byProject(organizationId, projectId),
    queryFn: async ({ signal }): Promise<BomProcurementStatus> => {
      const { data } = await apiClient.get<BomProcurementStatus>(
        `/bom/project/${projectId}/procurement-status`,
        { headers: orgHeaders, signal },
      );
      return data;
    },
    enabled: isReady && !!projectId && options?.enabled !== false,
    staleTime: 30_000,
  });
}
