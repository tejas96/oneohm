export interface GstSplitConfig {
  rate1: number;
  rate1Percentage: number;
  rate2: number;
  rate2Percentage: number;
}

export class GstSplitPercentagesInvalidError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GstSplitPercentagesInvalidError';
    Object.setPrototypeOf(this, GstSplitPercentagesInvalidError.prototype);
  }
}

const PERCENTAGE_TOLERANCE = 0.01;

function assertFinitePositive(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid value for ${label}: ${value}`);
  }
}

function assertGstSplitPercentagesTotal100(gstConfig: GstSplitConfig): void {
  assertFinitePositive(gstConfig.rate1, 'gstConfig.rate1');
  assertFinitePositive(gstConfig.rate2, 'gstConfig.rate2');
  assertFinitePositive(gstConfig.rate1Percentage, 'gstConfig.rate1Percentage');
  assertFinitePositive(gstConfig.rate2Percentage, 'gstConfig.rate2Percentage');

  const totalPercentage = gstConfig.rate1Percentage + gstConfig.rate2Percentage;
  if (Math.abs(totalPercentage - 100) > PERCENTAGE_TOLERANCE) {
    throw new GstSplitPercentagesInvalidError(
      `GST split percentages must total 100% (currently ${totalPercentage}%)`,
    );
  }
}

/**
 * Apply a pre-GST discount and compute the GST breakdown.
 *
 * All returned amounts are rounded to 2 decimal places (paise precision).
 * `gstRate1Amount` and `gstRate2Amount` are rounded independently so that
 * `totalGst === gstRate1Amount + gstRate2Amount` always holds exactly —
 * eliminating the ±1 display gap when amounts are shown as whole rupees.
 */
export function applyPreGstDiscount(
  basePrice: number,
  discountAmount: number,
  gstConfig: GstSplitConfig,
): {
  discountedBase: number;
  /** GST at rate1 on the rate1Percentage portion */
  gstRate1Amount: number;
  /** GST at rate2 on the rate2Percentage portion */
  gstRate2Amount: number;
  totalGst: number;
  grossTotal: number;
  // Legacy aliases kept for backward compatibility
  gst5: number;
  gst18: number;
} {
  assertGstSplitPercentagesTotal100(gstConfig);

  if (!Number.isFinite(basePrice)) {
    throw new Error(`Invalid basePrice: ${basePrice}`);
  }
  // Negative discounts would inflate the base; clamp to zero.
  const safeDiscount = Math.max(0, Number.isFinite(discountAmount) ? discountAmount : 0);
  const discountedBase = Math.max(0, basePrice - safeDiscount);

  // Round each GST component independently to 2 decimal places (paise precision).
  // Deriving totalGst as the sum of already-rounded parts guarantees:
  //   displayed_gst_rate1 + displayed_gst_rate2 === displayed_total_gst  (no ±1 gap)
  const gstRate1Amount =
    Math.round(
      ((discountedBase * gstConfig.rate1Percentage) / 100) * (gstConfig.rate1 / 100) * 100,
    ) / 100;
  const gstRate2Amount =
    Math.round(
      ((discountedBase * gstConfig.rate2Percentage) / 100) * (gstConfig.rate2 / 100) * 100,
    ) / 100;

  const totalGst = Math.round((gstRate1Amount + gstRate2Amount) * 100) / 100;
  const grossTotal = Math.round((discountedBase + totalGst) * 100) / 100;

  return {
    discountedBase,
    gstRate1Amount,
    gstRate2Amount,
    totalGst,
    grossTotal,
    // Legacy aliases so existing call-sites keep working without change
    gst5: gstRate1Amount,
    gst18: gstRate2Amount,
  };
}
