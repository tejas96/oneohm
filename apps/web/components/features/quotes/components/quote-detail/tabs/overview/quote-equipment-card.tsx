'use client';

import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Paper } from '@mui/material';
import React, { useMemo } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils/format';

interface QuoteEquipmentCardProps {
  isBomLoading?: boolean;
  hasBomEquipment: boolean;
  hasSnapEquipment: boolean;
  canViewEquipmentPricing: boolean;
  dcrPanelItems: any[];
  nonDcrPanelItems: any[];
  expandedInverterItems: any[];
  structureItem?: any;
  snapDcrPanels: any[];
  snapNonDcrPanels: any[];
  expandedSnapInverters: any[];
  snapStructure?: any;
}

const formatEquipmentName = (name?: string, brand?: string): string => {
  if (!name) return '';
  if (!brand) return name;
  if (name.toLowerCase().startsWith(brand.toLowerCase())) {
    return name;
  }
  return `${brand} ${name}`;
};

function groupEquipmentItems<
  T extends {
    name?: string;
    productId?: string;
    brand?: string;
    quantity?: number | string;
    lineTotal?: number | string;
    totalPrice?: number | string;
    [key: string]: any;
  },
>(items: T[]): T[] {
  const grouped: Record<string, T> = {};
  for (const item of items) {
    const key = item.productId || item.name || '';
    if (!grouped[key]) {
      grouped[key] = {
        ...item,
        quantity: item.quantity != null ? Number(item.quantity) : 1,
        lineTotal: item.lineTotal != null ? Number(item.lineTotal) : undefined,
        totalPrice: item.totalPrice != null ? Number(item.totalPrice) : undefined,
      };
    } else {
      const existing = grouped[key];
      if (existing) {
        existing.quantity = Number(existing.quantity ?? 0) + Number(item.quantity ?? 1);
        if (item.lineTotal != null) {
          existing.lineTotal = Number(existing.lineTotal ?? 0) + Number(item.lineTotal);
        }
        if (item.totalPrice != null) {
          existing.totalPrice = Number(existing.totalPrice ?? 0) + Number(item.totalPrice);
        }
      }
    }
  }
  return Object.values(grouped);
}

export function QuoteEquipmentCard({
  isBomLoading,
  hasBomEquipment,
  hasSnapEquipment,
  canViewEquipmentPricing,
  dcrPanelItems,
  nonDcrPanelItems,
  expandedInverterItems,
  structureItem,
  snapDcrPanels,
  snapNonDcrPanels,
  expandedSnapInverters,
  snapStructure,
}: QuoteEquipmentCardProps): React.JSX.Element {
  const sectionLabel = (text: string): React.ReactNode => (
    <span className="uppercase font-semibold text-[0.65rem] text-foreground-tertiary mb-2 block">
      {text}
    </span>
  );

  // Group BOM items
  const groupedDcrPanels = useMemo(() => groupEquipmentItems(dcrPanelItems), [dcrPanelItems]);
  const groupedNonDcrPanels = useMemo(
    () => groupEquipmentItems(nonDcrPanelItems),
    [nonDcrPanelItems],
  );
  const groupedInverters = useMemo(
    () => groupEquipmentItems(expandedInverterItems),
    [expandedInverterItems],
  );

  // Group Snapshot items
  const groupedSnapDcrPanels = useMemo(() => groupEquipmentItems(snapDcrPanels), [snapDcrPanels]);
  const groupedSnapNonDcrPanels = useMemo(
    () => groupEquipmentItems(snapNonDcrPanels),
    [snapNonDcrPanels],
  );
  const groupedSnapInverters = useMemo(
    () => groupEquipmentItems(expandedSnapInverters),
    [expandedSnapInverters],
  );

  return (
    <Paper
      variant="outlined"
      className="p-5.5 rounded-xl border border-border bg-white shadow-sm space-y-4"
    >
      <h3 className="text-sm font-bold text-foreground flex justify-between items-center">
        <span>📦 Equipment Details</span>
        <span className="text-[10px] text-foreground-tertiary font-normal">Items excl. GST</span>
      </h3>

      {isBomLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : hasBomEquipment ? (
        <div className="flex flex-col gap-4">
          {/* Solar Panels (BOM) */}
          <div>
            {sectionLabel('Solar Panels')}
            {groupedDcrPanels.length > 0 && (
              <span className="text-[10px] text-foreground-muted font-medium uppercase tracking-wider block mb-1">
                DCR Panels
              </span>
            )}
            {groupedDcrPanels.map((panel, index) => (
              <div
                key={`${panel.productId || panel.id}-dcr-${index}`}
                className="flex items-start justify-between gap-4 py-1.5"
              >
                <div>
                  <h4 className="font-semibold text-foreground text-xs">
                    {formatEquipmentName(panel.name, panel.brand)} (DCR)
                  </h4>
                  <span className="text-[10px] text-foreground-tertiary mt-0.5 block leading-none">
                    {panel.specifications.wattagePerPanel as number}W
                    {panel.specifications.technology ? ` · ${panel.specifications.technology}` : ''}
                    {' · '}Qty: {panel.quantity ?? 1}
                    {panel.warrantyYears ? ` · ${panel.warrantyYears}yr warranty` : ''}
                  </span>
                </div>
                {canViewEquipmentPricing && (
                  <span className="text-xs font-semibold text-foreground-secondary whitespace-nowrap">
                    {formatCurrency(panel.totalPrice ?? 0)}
                  </span>
                )}
              </div>
            ))}
            {groupedNonDcrPanels.length > 0 && (
              <span
                className={`text-[10px] text-foreground-muted font-medium uppercase tracking-wider block mb-1 ${
                  groupedDcrPanels.length > 0 ? 'mt-3' : ''
                }`}
              >
                Non-DCR Panels
              </span>
            )}
            {groupedNonDcrPanels.map((panel, index) => (
              <div
                key={`${panel.productId || panel.id}-non-dcr-${index}`}
                className="flex items-start justify-between gap-4 py-1.5"
              >
                <div>
                  <h4 className="font-semibold text-foreground text-xs">
                    {formatEquipmentName(panel.name, panel.brand)}
                  </h4>
                  <span className="text-[10px] text-foreground-tertiary mt-0.5 block leading-none">
                    {panel.specifications.wattagePerPanel as number}W
                    {panel.specifications.technology ? ` · ${panel.specifications.technology}` : ''}
                    {' · '}Qty: {panel.quantity ?? 1}
                    {panel.warrantyYears ? ` · ${panel.warrantyYears}yr warranty` : ''}
                  </span>
                </div>
                {canViewEquipmentPricing && (
                  <span className="text-xs font-semibold text-foreground-secondary whitespace-nowrap">
                    {formatCurrency(panel.totalPrice ?? 0)}
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="h-px bg-border/50" />
          {/* Inverters (BOM) */}
          {groupedInverters.length > 0 && (
            <div>
              {sectionLabel('Inverters')}
              {groupedInverters.map((inv, index) => (
                <div
                  key={`${inv.productId || inv.id}-inv-${index}`}
                  className="flex items-start justify-between gap-4 py-1.5"
                >
                  <div>
                    <h4 className="font-semibold text-foreground text-xs">
                      {formatEquipmentName(inv.name, inv.brand)}
                    </h4>
                    <span className="text-[10px] text-foreground-tertiary mt-0.5 block leading-none">
                      {inv.specifications.capacityKw as number} kW · Qty: {inv.quantity ?? 1}
                      {inv.warrantyYears ? ` · ${inv.warrantyYears}yr warranty` : ''}
                    </span>
                  </div>
                  {canViewEquipmentPricing && (
                    <span className="text-xs font-semibold text-foreground-secondary whitespace-nowrap">
                      {formatCurrency(inv.totalPrice ?? 0)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          {/* Structure (BOM) */}
          {structureItem && (
            <>
              <div className="h-px bg-border/50" />
              <div>
                {sectionLabel('Structure')}
                <div className="flex items-start justify-between gap-4 py-1.5">
                  <div>
                    <h4 className="font-semibold text-foreground text-xs">{structureItem.name}</h4>
                    <span className="text-[10px] text-foreground-tertiary mt-0.5 block leading-none">
                      {(structureItem.specifications.structure_type as string | undefined) ??
                        (structureItem.specifications.structureType as string | undefined) ??
                        ''}{' '}
                      · Qty: {structureItem.quantity}
                    </span>
                  </div>
                  {canViewEquipmentPricing && (
                    <span className="text-xs font-semibold text-foreground-secondary whitespace-nowrap">
                      {formatCurrency(structureItem.totalPrice ?? 0)}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      ) : hasSnapEquipment ? (
        <div className="flex flex-col gap-4">
          {/* Solar Panels (Snapshot) */}
          <div>
            {sectionLabel('Solar Panels')}
            {groupedSnapDcrPanels.length > 0 && (
              <span className="text-[10px] text-foreground-muted font-medium uppercase tracking-wider block mb-1">
                DCR Panels
              </span>
            )}
            {groupedSnapDcrPanels.map((p, i) => (
              <div key={p.productId ?? i} className="flex items-start justify-between gap-4 py-1.5">
                <div>
                  <h4 className="font-semibold text-foreground text-xs">
                    {formatEquipmentName(p.name, p.brand)} (DCR)
                  </h4>
                  <span className="text-[10px] text-foreground-tertiary mt-0.5 block leading-none">
                    {p.wattagePerPanel ?? 0}W{p.technology ? ` · ${p.technology}` : ''}
                    {' · '}Qty: {p.quantity ?? 1}
                    {p.productWarrantyYears ? ` · ${p.productWarrantyYears}yr warranty` : ''}
                  </span>
                </div>
                {canViewEquipmentPricing && (
                  <span className="text-xs font-semibold text-foreground-secondary whitespace-nowrap">
                    {formatCurrency(p.lineTotal ?? 0)}
                  </span>
                )}
              </div>
            ))}
            {groupedSnapNonDcrPanels.length > 0 && (
              <span
                className={`text-[10px] text-foreground-muted font-medium uppercase tracking-wider block mb-1 ${
                  groupedSnapDcrPanels.length > 0 ? 'mt-3' : ''
                }`}
              >
                Non-DCR Panels
              </span>
            )}
            {groupedSnapNonDcrPanels.map((p, i) => (
              <div key={p.productId ?? i} className="flex items-start justify-between gap-4 py-1.5">
                <div>
                  <h4 className="font-semibold text-foreground text-xs">
                    {formatEquipmentName(p.name, p.brand)}
                  </h4>
                  <span className="text-[10px] text-foreground-tertiary mt-0.5 block leading-none">
                    {p.wattagePerPanel ?? 0}W{p.technology ? ` · ${p.technology}` : ''}
                    {' · '}Qty: {p.quantity ?? 1}
                    {p.productWarrantyYears ? ` · ${p.productWarrantyYears}yr warranty` : ''}
                  </span>
                </div>
                {canViewEquipmentPricing && (
                  <span className="text-xs font-semibold text-foreground-secondary whitespace-nowrap">
                    {formatCurrency(p.lineTotal ?? 0)}
                  </span>
                )}
              </div>
            ))}
          </div>
          {/* Inverters (Snapshot) */}
          {groupedSnapInverters.length > 0 && (
            <>
              <div className="h-px bg-border/50" />
              <div>
                {sectionLabel('Inverters')}
                {groupedSnapInverters.map((inv, i) => (
                  <div
                    key={inv.productId ?? i}
                    className="flex items-start justify-between gap-4 py-1.5"
                  >
                    <div>
                      <h4 className="font-semibold text-foreground text-xs">
                        {formatEquipmentName(inv.name, inv.brand)}
                      </h4>
                      <span className="text-[10px] text-foreground-tertiary mt-0.5 block leading-none">
                        {inv.capacityKw ?? 0} kW · Qty: {inv.quantity ?? 1}
                        {inv.productWarrantyYears
                          ? ` · ${inv.productWarrantyYears}yr warranty`
                          : ''}
                      </span>
                    </div>
                    {canViewEquipmentPricing && (
                      <span className="text-xs font-semibold text-foreground-secondary whitespace-nowrap">
                        {formatCurrency(inv.lineTotal ?? 0)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
          {/* Structure (Snapshot) */}
          {snapStructure?.name && (
            <>
              <div className="h-px bg-border/50" />
              <div>
                {sectionLabel('Structure')}
                <div className="flex items-start justify-between gap-4 py-1.5">
                  <div>
                    <h4 className="font-semibold text-foreground text-xs">{snapStructure.name}</h4>
                    <span className="text-[10px] text-foreground-tertiary mt-0.5 block leading-none">
                      {/* Raw, unformatted — matches the BOM-sourced branch above so a
                          quote renders identically regardless of which branch a given
                          quote takes (see quote-detail-content.tsx's bomLines memo). */}
                      {snapStructure.structureType ?? ''}
                      {' · '}Qty: {snapStructure.quantity ?? 0}
                    </span>
                  </div>
                  {canViewEquipmentPricing && (
                    <span className="text-xs font-semibold text-foreground-secondary whitespace-nowrap">
                      {formatCurrency(snapStructure.lineTotal ?? 0)}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-foreground-secondary">
          <InfoOutlinedIcon className="text-[20px]" />
          <p className="text-xs">
            Equipment details are not available for this quote. Create a new quote for this property
            to generate updated details.
          </p>
        </div>
      )}
    </Paper>
  );
}
