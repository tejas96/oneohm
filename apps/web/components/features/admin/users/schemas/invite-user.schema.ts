import { z } from 'zod';

export const inviteUserSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  roleId: z.string().min(1, 'Role is required'),
});

export type InviteUserFormData = z.infer<typeof inviteUserSchema>;
