import { createCustomerProfileSchema, addPropertySchema } from '@tejas96/shared/schemas';
import { z } from 'zod';

import type { OnboardingMode } from '../constants';

/**
 * Composed schema for the unified customer + property wizard.
 *
 * Reuses the shared customer/property schemas rather than duplicating any
 * validation rule — `customer` is nested to avoid field-name collisions
 * (`address`/`city`/`state`/`pincode` exist on both the customer and the
 * property).
 *
 * The wizard serves four flows and each validates a different slice, so the
 * schema is exposed per-mode via `getOnboardingResolverSchema`. Every variant
 * yields the same field *shape* — only which fields are required differs —
 * so one `OnboardingFormData` type covers them all.
 */

const wizardOnlyFields = {
  useExistingCustomer: z.boolean(),
  existingCustomerId: z.string().uuid().optional(),
  sameAsBilling: z.boolean().optional(),
  siteVisitAssignee: z.string().uuid().optional().or(z.literal('')),
  siteSurveyAssignee: z.string().uuid().optional().or(z.literal('')),
  /**
   * Billing-address map state. The customer API fixes country to India and
   * stores no coordinates, so these back the Places lookup and map pin only —
   * they're stripped before any request.
   */
  customerCountry: z.string().optional(),
  customerLatitude: z.number({ coerce: true }).optional(),
  customerLongitude: z.number({ coerce: true }).optional(),
};

/** Property fields relaxed to optional — used where only the customer is being edited. */
const optionalPropertyShape = addPropertySchema.partial().shape;

/** Full run: customer (unless reusing one) + property. */
export const onboardingCreateSchema = z
  .object({
    ...wizardOnlyFields,
    customer: createCustomerProfileSchema.optional(),
    ...addPropertySchema.shape,
  })
  .superRefine((data, ctx) => {
    if (data.useExistingCustomer) {
      if (!data.existingCustomerId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Pick an existing customer',
          path: ['existingCustomerId'],
        });
      }
      return;
    }
    if (!data.customer) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Customer details are required',
        path: ['customer'],
      });
    }
  });

/** Editing a customer: only their own fields are required. */
export const onboardingCustomerSchema = z.object({
  ...wizardOnlyFields,
  customer: createCustomerProfileSchema,
  ...optionalPropertyShape,
});

/** Editing a site, or adding one to a known customer: property fields only. */
export const onboardingPropertySchema = z.object({
  ...wizardOnlyFields,
  customer: createCustomerProfileSchema.optional(),
  ...addPropertySchema.shape,
});

export type OnboardingFormData = z.infer<typeof onboardingCreateSchema>;

export function getOnboardingResolverSchema(mode: OnboardingMode): z.ZodTypeAny {
  if (mode === 'edit-customer') return onboardingCustomerSchema;
  if (mode === 'edit-property' || mode === 'create-site') return onboardingPropertySchema;
  return onboardingCreateSchema;
}
