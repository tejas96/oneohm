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

/**
 * What is actually left on a quote after a discount, and who it came out of.
 *
 * THE DISCOUNT COMES OUT OF MARGIN, NOT OUT OF COST. Panels, inverters, the
 * structure and the labour cost what they cost; conceding ₹5,000 to close a sale
 * reduces the profit on it by ₹5,000 and nothing else. So the cost floor is held
 * and the margin absorbs the whole concession.
 *
 * WHY THIS EXISTS AT ALL. Both apps showed the rep a margin taken straight from
 * `calculation.profitabilityAmount`, which the calculator returns for the
 * UNDISCOUNTED build. A rep who discounted ₹5,000 still saw the old margin, and
 * that number's only purpose is answering "can I go lower?" — so they conceded
 * again against a figure that had already been spent. Both screens also showed
 * the correct post-discount base a few rows away, disagreeing with it by exactly
 * the discount.
 *
 * It lives here rather than in either app because the two were computing the
 * same wrong thing independently, and a rep's phone and the office's screen must
 * not disagree about the profit on the same quote.
 *
 * `marginPercent` is against the discounted base — margin as a share of what the
 * customer is actually being charged, which is the only reading that means
 * anything once a concession has been made.
 */
export function deriveMarginAfterDiscount(input: {
  /** `pricing.basePrice` — pre-GST, pre-discount, margin included. */
  basePrice: number;
  /** `profitabilityAmount` — the margin inside that base. */
  profitabilityAmount: number;
  discountAmount: number;
}): {
  /** Unchanged by the discount. What the build costs to deliver. */
  cost: number;
  /** The base the customer is charged on, after the discount. */
  discountedBase: number;
  /** What is left of the margin. Can be zero; never negative. */
  margin: number;
  marginPercent: number;
  /**
   * True when the discount has eaten the whole margin — the quote is at or below
   * cost. Worth saying out loud rather than showing a cheerful zero.
   */
  belowCost: boolean;
} {
  const safeBase = Number.isFinite(input.basePrice) ? input.basePrice : 0;
  const safeMargin = Number.isFinite(input.profitabilityAmount) ? input.profitabilityAmount : 0;
  const safeDiscount = Math.max(
    0,
    Number.isFinite(input.discountAmount) ? input.discountAmount : 0,
  );

  const cost = Math.max(0, safeBase - safeMargin);
  const discountedBase = Math.max(0, safeBase - safeDiscount);
  const rawMargin = discountedBase - cost;

  return {
    cost: Math.round(cost * 100) / 100,
    discountedBase: Math.round(discountedBase * 100) / 100,
    margin: Math.round(Math.max(0, rawMargin) * 100) / 100,
    marginPercent:
      discountedBase > 0 ? Math.round((Math.max(0, rawMargin) / discountedBase) * 1000) / 10 : 0,
    belowCost: rawMargin <= 0,
  };
}
