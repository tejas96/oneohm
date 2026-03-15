/**
 * Pre-GST Discount Utility
 *
 * Applies a discount to the base price BEFORE GST, then recalculates GST
 * on the discounted base. GST rates and split come from the organization's
 * quote configuration (DB-driven). No fallback — gstConfig is mandatory.
 *
 * Field names `gst5` / `gst18` are legacy; they hold rate1 / rate2 amounts.
 *
 * This is the single source of truth — backend, web, and mobile must use
 * identical logic. The mobile copy (oneohm-epc-mobile) must be kept in sync
 * manually since it lives in a separate repository.
 */
export interface GstSplitConfig {
  rate1: number;
  rate1Percentage: number;
  rate2: number;
  rate2Percentage: number;
}

export function applyPreGstDiscount(
  basePrice: number,
  discountAmount: number,
  gstConfig: GstSplitConfig,
): {
  discountedBase: number;
  gst5: number;
  gst18: number;
  totalGst: number;
  grossTotal: number;
} {
  const discountedBase = Math.max(0, basePrice - discountAmount);
  const gst5 =
    Math.round(
      ((discountedBase * gstConfig.rate1Percentage) / 100) * (gstConfig.rate1 / 100) * 100,
    ) / 100;
  const gst18 =
    Math.round(
      ((discountedBase * gstConfig.rate2Percentage) / 100) * (gstConfig.rate2 / 100) * 100,
    ) / 100;
  const totalGst = Math.round((gst5 + gst18) * 100) / 100;
  const grossTotal = Math.round((discountedBase + totalGst) * 100) / 100;
  return { discountedBase, gst5, gst18, totalGst, grossTotal };
}
