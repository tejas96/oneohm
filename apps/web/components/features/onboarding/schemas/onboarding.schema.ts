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
   * First followup. Optional here because the edit flows reuse this shape and
   * must not demand a new followup to save a name change; the create flows
   * layer the requirement on top (see requiredFirstFollowup).
   */
  nextFollowupDate: z.date().optional(),
  nextFollowupAssignee: z.string().uuid().optional().or(z.literal('')),
  /**
   * Billing-address map state. The customer API fixes country to India and
   * stores no coordinates, so these back the Places lookup and map pin only —
   * they're stripped before any request.
   */
  customerCountry: z.string().optional(),
  customerLatitude: z.number({ coerce: true }).optional(),
  customerLongitude: z.number({ coerce: true }).optional(),
};

/**
 * Creating a lead means committing to chase it, so both flows that create one
 * require a first followup. Editing does not.
 */
const requiredFirstFollowup = {
  nextFollowupDate: z.date({ message: 'Schedule the first follow-up' }),
  nextFollowupAssignee: z.string().uuid({ message: 'Pick who owns this lead' }),
};

/** Property fields relaxed to optional — used where only the customer is being edited. */
const optionalPropertyShape = addPropertySchema.partial().shape;

/** Full run: customer (unless reusing one) + property. */
export const onboardingCreateSchema = z
  .object({
    ...wizardOnlyFields,
    ...requiredFirstFollowup,
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

/** Editing a site: property fields only, no new followup demanded. */
export const onboardingPropertySchema = z.object({
  ...wizardOnlyFields,
  customer: createCustomerProfileSchema.optional(),
  ...addPropertySchema.shape,
});

/** Adding a site to a known customer — a new lead, so a first followup is required. */
export const onboardingCreateSiteSchema = z.object({
  ...wizardOnlyFields,
  ...requiredFirstFollowup,
  customer: createCustomerProfileSchema.optional(),
  ...addPropertySchema.shape,
});

export type OnboardingFormData = z.infer<typeof onboardingCreateSchema>;

export function getOnboardingResolverSchema(mode: OnboardingMode): z.ZodTypeAny {
  if (mode === 'edit-customer') return onboardingCustomerSchema;
  if (mode === 'create-site') return onboardingCreateSiteSchema;
  if (mode === 'edit-property') return onboardingPropertySchema;
  return onboardingCreateSchema;
}
