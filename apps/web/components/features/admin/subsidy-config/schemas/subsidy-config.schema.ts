import { ProjectType, SubsidySchemeType } from '@tejas96/shared/types';
import { z } from 'zod';

// Coerces NaN (produced by valueAsNumber on empty input) to undefined so
// optional number fields stay valid when left blank.
const nanToUndefined = z.nan().transform(() => undefined as unknown as number);

const tierSchema = z.object({
  fromKw: z
    .number({ invalid_type_error: 'From kW must be a number' })
    .min(0, 'From kW must be >= 0'),
  toKw: z
    .number({ invalid_type_error: 'To kW must be a number' })
    .min(0, 'To kW must be >= 0')
    .nullable(),
  ratePerKw: z.number({ invalid_type_error: 'Rate must be a number' }).min(0, 'Rate must be >= 0'),
});

export const subsidyConfigSchema = z
  .object({
    schemeName: z.string().trim().min(1, 'Scheme name is required'),
    schemeCode: z.string().trim().optional(),
    schemeType: z.nativeEnum(SubsidySchemeType),
    projectType: z.nativeEnum(ProjectType),
    maxSubsidyKw: z.union([
      z
        .number({ invalid_type_error: 'Max subsidy kW must be a number' })
        .min(0, 'Max subsidy kW must be >= 0'),
      nanToUndefined,
    ]),
    maxSubsidyAmount: z
      .union([
        z
          .number({ invalid_type_error: 'Max subsidy amount must be a number' })
          .min(0, 'Max subsidy amount must be >= 0'),
        nanToUndefined,
      ])
      .optional(),
    requiresDcr: z.boolean(),
    autoSplitEnabled: z.boolean(),
    tiers: z.array(tierSchema).min(1, 'At least one tier is required'),
    effectiveFrom: z.string().optional(),
    effectiveTo: z.string().optional(),
    isActive: z.boolean(),
    description: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    data.tiers.forEach((tier, index) => {
      if (tier.toKw != null && tier.toKw <= tier.fromKw) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'To kW must be greater than From kW',
          path: ['tiers', index, 'toKw'],
        });
      }
    });

    const sorted = [...data.tiers].sort((a, b) => a.fromKw - b.fromKw);
    for (let i = 1; i < sorted.length; i += 1) {
      const prev = sorted[i - 1];
      const current = sorted[i];
      if (!prev || !current) continue;
      if (prev.toKw == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Open-ended tier must be the last tier',
          path: ['tiers', i - 1, 'toKw'],
        });
        break;
      }
      if (current.fromKw > prev.toKw) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Tiers must be contiguous with no gaps',
          path: ['tiers', i, 'fromKw'],
        });
        break;
      }
    }
  });

export type SubsidyConfigFormData = z.infer<typeof subsidyConfigSchema>;
