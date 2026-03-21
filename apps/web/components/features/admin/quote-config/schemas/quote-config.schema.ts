import { z } from 'zod';

function profitMarginTiersOverlap(
  a: { minSystemSizeKw: number; maxSystemSizeKw?: number | null },
  b: { minSystemSizeKw: number; maxSystemSizeKw?: number | null },
): boolean {
  const endA = a.maxSystemSizeKw ?? Infinity;
  const endB = b.maxSystemSizeKw ?? Infinity;
  return a.minSystemSizeKw <= endB && b.minSystemSizeKw <= endA;
}

const nonnegativeKw = (label: string): z.ZodEffects<z.ZodNumber, number, number> =>
  z
    .number({ invalid_type_error: `${label} must be a number` })
    .refine((n) => Number.isFinite(n) && n >= 0, {
      message: `${label} must be a finite number >= 0`,
    });

const profitMarginTierSchema = z
  .object({
    minSystemSizeKw: nonnegativeKw('Min size (kW)'),
    maxSystemSizeKw: z.union([nonnegativeKw('Max size (kW)'), z.null()]).optional(),
    marginPercent: nonnegativeKw('Margin %'),
  })
  .superRefine((tier, ctx) => {
    if (tier.maxSystemSizeKw != null && tier.maxSystemSizeKw < tier.minSystemSizeKw) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Max size must be >= min size',
        path: ['maxSystemSizeKw'],
      });
    }
  })
  .transform((tier) => ({
    minSystemSizeKw: tier.minSystemSizeKw,
    maxSystemSizeKw: tier.maxSystemSizeKw ?? null,
    marginPercent: tier.marginPercent,
  }));

const gstConfigSchema = z.object({
  rate1: z
    .number({ invalid_type_error: 'GST rate 1 must be a number' })
    .min(0, 'GST rate 1 must be >= 0'),
  rate1Percentage: z
    .number({ invalid_type_error: 'Rate 1 percentage must be a number' })
    .min(0, 'Rate 1 percentage must be >= 0'),
  rate2: z
    .number({ invalid_type_error: 'GST rate 2 must be a number' })
    .min(0, 'GST rate 2 must be >= 0'),
  rate2Percentage: z
    .number({ invalid_type_error: 'Rate 2 percentage must be a number' })
    .min(0, 'Rate 2 percentage must be >= 0'),
});

const paymentMilestoneSchema = z.object({
  stage: z.string().trim().min(1, 'Stage is required'),
  name: z.string().trim().min(1, 'Name is required'),
  percentage: z
    .number({ invalid_type_error: 'Percentage must be a number' })
    .min(0, 'Percentage must be >= 0'),
  order: z.number({ invalid_type_error: 'Order must be a number' }).min(1, 'Order must be >= 1'),
});

export const quoteConfigSchema = z
  .object({
    defaultValidityDays: z
      .number({ invalid_type_error: 'Validity days must be a number' })
      .min(1, 'Validity days must be >= 1')
      .max(365, 'Validity days must be <= 365'),
    maxVersions: z
      .number({ invalid_type_error: 'Max versions must be a number' })
      .min(1, 'Max versions must be >= 1')
      .max(10, 'Max versions must be <= 10'),
    defaultCompletionWeeks: z
      .number({ invalid_type_error: 'Completion weeks must be a number' })
      .min(1, 'Completion weeks must be >= 1')
      .max(52, 'Completion weeks must be <= 52'),
    gstConfig: gstConfigSchema,
    paymentMilestones: z.array(paymentMilestoneSchema).min(1, 'Add at least one milestone'),
    profitMarginTiers: z.array(profitMarginTierSchema),
    showInventoryStock: z.boolean(),
    notes: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    const gstSum = data.gstConfig.rate1Percentage + data.gstConfig.rate2Percentage;
    if (gstSum !== 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'GST percentages must sum to 100%',
        path: ['gstConfig', 'rate1Percentage'],
      });
    }

    const milestoneSum = data.paymentMilestones.reduce(
      (sum, milestone) => sum + milestone.percentage,
      0,
    );
    if (milestoneSum !== 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Payment milestone percentages must sum to 100%',
        path: ['paymentMilestones'],
      });
    }

    for (let i = 0; i < data.profitMarginTiers.length; i++) {
      for (let j = i + 1; j < data.profitMarginTiers.length; j++) {
        if (profitMarginTiersOverlap(data.profitMarginTiers[i]!, data.profitMarginTiers[j]!)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Profit margin tiers must not overlap',
            path: ['profitMarginTiers'],
          });
          return;
        }
      }
    }
  });

export type QuoteConfigFormInput = z.input<typeof quoteConfigSchema>;
export type QuoteConfigFormData = z.output<typeof quoteConfigSchema>;
