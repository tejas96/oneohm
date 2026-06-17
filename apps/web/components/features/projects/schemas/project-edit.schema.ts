import { ProjectPriority } from '@tejas96/shared/types';
import { z } from 'zod';

// ── Helpers ────────────────────────────────────────────────────

const isoDateOrEmpty = z
  .string()
  .refine((v) => !v || /^\d{4}-\d{2}-\d{2}/.test(v), { message: 'Invalid date format' })
  .optional()
  .or(z.literal(''));

// ── Schema ─────────────────────────────────────────────────────

export const projectEditSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Project name is required')
      .min(3, 'Name must be at least 3 characters')
      .max(255, 'Name must be 255 characters or fewer')
      .refine((v) => v.trim().length > 0, { message: 'Name cannot be blank' }),
    description: z
      .string()
      .max(2000, 'Description must be 2000 characters or fewer')
      .or(z.literal(''))
      .optional(),
    priority: z.nativeEnum(ProjectPriority),
    startDate: isoDateOrEmpty,
    endDate: isoDateOrEmpty,
    teamMembers: z.array(
      z.object({
        /** Present for existing team members, absent for newly added ones. */
        id: z.string().uuid().optional(),
        userId: z.string().uuid(),
        roleName: z
          .string()
          .min(1, 'Role name is required')
          .max(100, 'Role name must be 100 characters or fewer')
          .refine((v) => v.trim().length > 0, { message: 'Role name cannot be blank' }),
        isProjectManager: z.boolean().optional(),
      }),
    ),
    projectManagerId: z.string().uuid().optional().or(z.literal('')),
    /**
     * The original start date fetched from the backend when the modal opened.
     * Used as the minimum allowed start date — user cannot set start date before
     * the already-persisted start date. Stored as ISO date string or empty.
     */
    originalStartDate: z.string().optional().or(z.literal('')),
  })
  .refine(
    (d) => {
      // Both dates absent → no constraint
      if (!d.startDate && !d.endDate) return true;
      // Only one present → no cross-field constraint
      if (!d.startDate || !d.endDate) return true;
      return new Date(d.endDate) >= new Date(d.startDate);
    },
    {
      message: 'End date must be on or after start date',
      path: ['endDate'],
    },
  );

export type ProjectEditFormData = z.infer<typeof projectEditSchema>;
