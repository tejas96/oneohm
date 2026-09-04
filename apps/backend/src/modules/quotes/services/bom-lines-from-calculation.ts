import type { CalculateQuoteResponseDto } from '../dto/calculator/calculate-quote-response.dto';

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
 * A quotation used to persist these as bom / bom_items rows via persistBom(),
 * deleting and reinserting on every save inside a try/catch that logged and
 * continued — so a quote could exist with no BOM and nobody was told. The
 * snapshot was always the record; this replaces the copy.
 *
 * Pure, and deliberately NOT exploded into per-unit rows: a quotation has no
 * serial numbers, so a 12-panel line is one line. Mirrors the field-for-field
 * mapping `BomService.createFromCalculation` performs when it builds the
 * (non-exploded) BOM item shape — see `apps/web/components/features/quotes/
 * utils/quote-bom-lines.ts` for the web copy, which must be kept identical.
 */
export function bomLinesFromCalculation(calculation: CalculateQuoteResponseDto): QuoteBomLine[] {
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
