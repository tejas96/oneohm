import { z } from 'zod';

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

const wattageRoundingSchema = z.object({
  roundTo: z
    .number({ invalid_type_error: 'Round to must be a number' })
    .min(1, 'Round to must be >= 1'),
  roundUpThreshold: z
    .number({ invalid_type_error: 'Round up threshold must be a number' })
    .min(0, 'Round up threshold must be >= 0'),
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
    wattageRounding: wattageRoundingSchema,
    paymentMilestones: z.array(paymentMilestoneSchema).min(1, 'Add at least one milestone'),
    showInventoryStock: z.boolean(),
    minProfitMarginPercent: z
      .number({ invalid_type_error: 'Min profit margin must be a number' })
      .min(0, 'Min profit margin must be >= 0')
      .max(100, 'Min profit margin must be <= 100')
      .optional(),
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
  });

export type QuoteConfigFormData = z.infer<typeof quoteConfigSchema>;
