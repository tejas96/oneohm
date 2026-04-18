import { z } from 'zod';

const userBaseSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().max(100).optional().or(z.literal('')),
  email: z.string().email('Invalid email address').max(255).min(1, 'Email is required'),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(/^\d{10}$/, 'Phone must be exactly 10 digits'),
  employeeId: z.string().max(50).optional().or(z.literal('')),
  department: z.string().max(100).optional().or(z.literal('')),
  designation: z.string().max(100).optional().or(z.literal('')),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
});

export const createUserSchema = userBaseSchema.extend({
  password: z.string().min(8, 'Password must be at least 8 characters').max(50),
});

export const editUserSchema = userBaseSchema.extend({
  email: z.string().email('Invalid email address').max(255).optional().or(z.literal('')),
  password: z.string().max(50).optional().or(z.literal('')),
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;
export type EditUserFormData = z.infer<typeof editUserSchema>;
