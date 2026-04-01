import { z } from 'zod';

export const roleSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  code: z
    .string()
    .min(1, 'Code is required')
    .max(50)
    .regex(/^[a-z0-9_]+$/, 'Code must be lowercase alphanumeric with underscores'),
  description: z.string().max(500).optional().or(z.literal('')),
  level: z.coerce.number().int().min(0).optional(),
});

export type RoleFormData = z.infer<typeof roleSchema>;
