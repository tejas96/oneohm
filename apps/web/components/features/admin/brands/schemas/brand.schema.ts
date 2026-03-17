import { z } from 'zod';

export const brandSchema = z.object({
  name: z.string().trim().min(1, 'Brand name is required'),
  manufacturerName: z.string().trim().optional(),
  logoUrl: z.string().trim().url('Enter a valid URL').optional().or(z.literal('')),
  website: z.string().trim().url('Enter a valid URL').optional().or(z.literal('')),
  supportContact: z.string().trim().optional(),
  description: z.string().trim().optional(),
  isActive: z.boolean(),
  productTypeIds: z.array(z.string().uuid()).optional(),
});

export type BrandFormData = z.infer<typeof brandSchema>;
