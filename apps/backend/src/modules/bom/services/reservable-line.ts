/**
 * Whether a BOM line can take stock from a warehouse.
 *
 * Decided by what the line's QUANTITY counts, never by how it is priced alone.
 * A per_unit line counts pieces (or metres). A per_watt line is a solar panel:
 * priced by the watt, but its quantity is still panels, and the warehouse holds
 * panels. A per_kw line's quantity IS kW — mounting structure — which no
 * warehouse holds; it is made to order or reserved by hand in sets from the
 * Allocations tab, because turning kW into sets needs the site design.
 *
 * Reserve stock and the reservation status both read this one rule. Before it,
 * both skipped every line that was not per_unit, so panels could never be
 * reserved and "Stock reserved" showed while the panel row said Pending.
 */
const RESERVABLE_BASES = new Set(['per_unit', 'per_watt']);

/** Whether a line priced this way counts units a warehouse holds. */
export function basisTakesStock(pricingBasis: string): boolean {
  return RESERVABLE_BASES.has(pricingBasis);
}

/** A line that reserve stock acts on now: a stocked basis, a product, a quantity. */
export function isReservableLine(line: {
  productId?: string | null;
  pricingBasis: string;
  quantity: number | string;
}): boolean {
  return !!line.productId && basisTakesStock(line.pricingBasis) && Number(line.quantity) > 0;
}

/** A per_kw line's quantity is kW, whatever unit the product is stocked in. */
export function isPerKwBasis(pricingBasis: string): boolean {
  return pricingBasis === 'per_kw' || pricingBasis === 'per_kw_system';
}
