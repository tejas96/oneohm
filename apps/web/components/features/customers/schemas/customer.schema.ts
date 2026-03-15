import { z } from 'zod';

export {
  createCustomerProfileSchema,
  type CreateCustomerProfileFormData,
} from '@oneohm-epc/shared/schemas';

// ============================================================================
// Import Customers Schema (web-only -- uses browser File API)
// ============================================================================

export const importCustomersSchema = z.object({
  file: z.instanceof(File, { message: 'Please select a file' }),
  skipDuplicates: z.boolean().default(true),
  fieldMapping: z.record(z.string()).optional(),
});

export type ImportCustomersFormData = z.infer<typeof importCustomersSchema>;
