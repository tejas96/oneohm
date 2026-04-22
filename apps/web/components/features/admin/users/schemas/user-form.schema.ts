import { z } from 'zod';

// Fields shared between create and edit (email and password intentionally excluded)
const baseUserFields = {
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().max(100).optional().or(z.literal('')),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(/^\d{10}$/, 'Phone must be exactly 10 digits'),
  employeeId: z.string().max(50).optional().or(z.literal('')),
  department: z.string().max(100).optional().or(z.literal('')),
  designation: z.string().max(100).optional().or(z.literal('')),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
};

export const createUserSchema = z.object({
  ...baseUserFields,
  email: z.string().email('Invalid email address').max(255).min(1, 'Email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(50),
});

// Edit mode: email is editable but optional (users may not have one), password is never changed here
export const editUserSchema = z.object({
  ...baseUserFields,
  email: z.string().email('Invalid email address').max(255).optional().or(z.literal('')),
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;
export type EditUserFormData = z.infer<typeof editUserSchema>;
export type UserFormData = CreateUserFormData | EditUserFormData;
