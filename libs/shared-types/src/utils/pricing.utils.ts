/**
 * Pre-GST Discount Utility
 *
 * Applies a discount to the base price BEFORE GST, then recalculates GST
 * on the discounted base.
 *
 * GST split: 70% of base at 5% (solar equipment), 30% of base at 18% (services).
 *
 * This is the single source of truth — backend, web, and mobile must use
 * identical logic. The mobile copy (oneohm-epc-mobile) must be kept in sync
 * manually since it lives in a separate repository.
 */
export function applyPreGstDiscount(
  basePrice: number,
  discountAmount: number,
): {
  discountedBase: number;
  gst5: number;
  gst18: number;
  totalGst: number;
  grossTotal: number;
} {
  const discountedBase = Math.max(0, basePrice - discountAmount);
  const gst5 = Math.round(((discountedBase * 70) / 100) * 0.05 * 100) / 100;
  const gst18 = Math.round(((discountedBase * 30) / 100) * 0.18 * 100) / 100;
  const totalGst = Math.round((gst5 + gst18) * 100) / 100;
  const grossTotal = Math.round((discountedBase + totalGst) * 100) / 100;
  return { discountedBase, gst5, gst18, totalGst, grossTotal };
}
