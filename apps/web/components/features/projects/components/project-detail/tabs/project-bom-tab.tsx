'use client';

import { MaterialStatus } from '@oneohm-epc/shared-types';
import { Package } from 'lucide-react';
import React from 'react';

import { MATERIAL_STATUS_BADGE_VARIANT, MATERIAL_STATUS_LABELS } from '../../../constants';
import type { ProjectMaterial } from '../../../hooks/types';

import { EmptyState } from '@/components/shared/feedback/empty-state';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils/format';

interface ProjectBomTabProps {
  materials: ProjectMaterial[];
}

export const ProjectBomTab = React.memo(({ materials }: ProjectBomTabProps): React.JSX.Element => {
  if (!materials || materials.length === 0) {
    return (
      <EmptyState
        icon={<Package className="w-full h-full" />}
        iconColor="muted"
        title="No materials listed"
        description="Bill of materials will appear here once items are added to the project."
      />
    );
  }

  const remainingCount = materials.filter(
    (m) => m.status !== MaterialStatus.ALLOCATED && m.status !== MaterialStatus.USED,
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">BOM & Inventory</h3>
      </div>
      {remainingCount > 0 && (
        <div className="rounded-lg bg-warning/10 border border-warning/20 p-3">
          <p className="text-xs text-warning font-medium">
            {remainingCount} material{remainingCount === 1 ? '' : 's'} pending allocation
          </p>
        </div>
      )}

      <div className="rounded-lg border border-border-light overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-2xs font-medium text-foreground-muted uppercase text-left px-3 py-2">
                Material
              </th>
              <th className="text-2xs font-medium text-foreground-muted uppercase text-left px-3 py-2">
                Category
              </th>
              <th className="text-2xs font-medium text-foreground-muted uppercase text-right px-3 py-2">
                Qty
              </th>
              <th className="text-2xs font-medium text-foreground-muted uppercase text-right px-3 py-2">
                Unit Cost
              </th>
              <th className="text-2xs font-medium text-foreground-muted uppercase text-right px-3 py-2">
                Total
              </th>
              <th className="text-2xs font-medium text-foreground-muted uppercase text-left px-3 py-2">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {materials.map((material) => (
              <tr key={material.id} className="hover:bg-muted/30 transition-colors">
                <td className="text-xs text-foreground font-medium px-3 py-2.5">
                  {material.materialName}
                </td>
                <td className="text-xs text-foreground-secondary px-3 py-2.5">
                  {material.category ?? '—'}
                </td>
                <td className="text-xs text-foreground text-right px-3 py-2.5">
                  {material.quantityRequired}
                  {material.unit ? ` ${material.unit}` : ''}
                </td>
                <td className="text-xs text-foreground text-right px-3 py-2.5">
                  {material.unitCost != null ? formatCurrency(material.unitCost) : '—'}
                </td>
                <td className="text-xs text-foreground font-medium text-right px-3 py-2.5">
                  {material.totalCost != null ? formatCurrency(material.totalCost) : '—'}
                </td>
                <td className="px-3 py-2.5">
                  <Badge
                    variant={
                      (MATERIAL_STATUS_BADGE_VARIANT[material.status] ?? 'secondary') as 'success'
                    }
                    size="xs"
                  >
                    {MATERIAL_STATUS_LABELS[material.status] ?? material.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-border-light bg-background-secondary p-3">
        <div className="flex items-center gap-2 mb-2">
          <Package className="size-icon-xs text-foreground-muted" />
          <h3 className="text-xs font-semibold text-foreground">Dispatch Status</h3>
        </div>
        <div className="p-3 bg-info/5 rounded-lg border border-info/20">
          <p className="text-2xs text-info">Dispatch tracking coming soon</p>
        </div>
      </div>
    </div>
  );
});
