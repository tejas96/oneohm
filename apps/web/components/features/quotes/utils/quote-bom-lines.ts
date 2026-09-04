import type { CalculateQuoteResponse } from '../types';

export interface QuoteBomLine {
  itemType: 'panel' | 'inverter' | 'structure';
  productId?: string;
  name: string;
  brand?: string;
  specifications: Record<string, unknown>;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  gstRate?: number;
  gstAmount: number;
  warrantyYears?: number;
  sortOrder: number;
}

/**
 * The equipment lines a quotation shows, derived from its snapshot.
 *
 * Web mirror of `apps/backend/src/modules/quotes/services/
 * bom-lines-from-calculation.ts` — kept field-for-field identical on purpose
 * so the two cannot drift. A quotation used to persist these as bom /
 * bom_items rows, written best-effort on every save; the snapshot was always
 * the record, and the quote detail page now reads it directly instead of
 * re-fetching the copy via `useEntityBom('quote_version', ...)`.
 *
 * Pure, and deliberately NOT exploded into per-unit rows: a quotation has no
 * serial numbers, so a 12-panel line is one line.
 */
export function quoteBomLines(calculation: CalculateQuoteResponse): QuoteBomLine[] {
  const lines: QuoteBomLine[] = [];
  let sortOrder = 0;

  const panels = Array.isArray(calculation?.panels) ? calculation.panels : [];
  for (const panel of panels) {
    const quantity = Math.max(1, Math.trunc(Number(panel.quantity ?? 1)));
    const totalPrice = Number(panel.lineTotal ?? 0);
    lines.push({
      itemType: 'panel',
      productId: panel.productId,
      name: panel.name || 'Solar Panel',
      brand: panel.brand,
      specifications: {
        isDcr: panel.isDcr,
        technology: panel.technology,
        wattagePerPanel: panel.wattagePerPanel,
        pricePerWatt: panel.pricePerWatt,
        performanceWarrantyYears: panel.performanceWarrantyYears,
      },
      quantity,
      unit: 'nos',
      unitPrice: Number((totalPrice / quantity).toFixed(2)),
      totalPrice,
      gstRate: panel.gstRate,
      gstAmount: Number(panel.gstAmount ?? 0),
      warrantyYears: panel.productWarrantyYears,
      sortOrder: sortOrder++,
    });
  }

  const inverters = Array.isArray(calculation?.inverters?.inverters)
    ? calculation.inverters.inverters
    : [];
  for (const inv of inverters) {
    const quantity = Math.max(1, Math.trunc(Number(inv.quantity ?? 1)));
    const totalPrice = Number(inv.lineTotal ?? 0);
    lines.push({
      itemType: 'inverter',
      productId: inv.productId,
      name: inv.name || 'Inverter',
      brand: inv.brand,
      specifications: { capacityKw: inv.capacityKw },
      quantity,
      unit: 'nos',
      unitPrice: Number((totalPrice / quantity).toFixed(2)),
      totalPrice,
      gstRate: inv.gstRate,
      gstAmount: Number(inv.gstAmount ?? 0),
      warrantyYears: inv.productWarrantyYears,
      sortOrder: sortOrder++,
    });
  }

  const structure = calculation?.structure;
  if (structure && typeof structure === 'object') {
    const totalPrice = Number(structure.lineTotal ?? 0);
    lines.push({
      itemType: 'structure',
      productId: structure.productId,
      name: structure.name || 'Structure',
      specifications: { structureType: structure.structureType },
      quantity: Math.max(1, Math.trunc(Number(structure.quantity ?? 1))),
      unit: 'set',
      unitPrice: totalPrice,
      totalPrice,
      gstRate: structure.gstRate,
      gstAmount: Number(structure.gstAmount ?? 0),
      sortOrder: sortOrder++,
    });
  }

  return lines;
}
