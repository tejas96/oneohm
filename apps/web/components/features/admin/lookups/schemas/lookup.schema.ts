import { LookupDataType, LookupScopeType } from '@oneohm-epc/shared/types';
import { z } from 'zod';

export const lookupSchema = z
  .object({
    typeCode: z
      .string()
      .min(1, 'Type code is required')
      .max(100, 'Type code must be at most 100 characters')
      .regex(
        /^[a-z][a-z0-9_]*$/,
        'Must be lowercase snake_case starting with a letter (e.g. lead_source)',
      ),
    code: z.string().min(1, 'Code is required').max(100, 'Code must be at most 100 characters'),
    label: z.string().min(1, 'Label is required').max(255, 'Label must be at most 255 characters'),
    value: z.string().optional(),
    dataType: z.nativeEnum(LookupDataType).optional(),
    scopeType: z.nativeEnum(LookupScopeType).default(LookupScopeType.GLOBAL),
    scopeId: z.string().uuid('Must be a valid UUID').optional(),
    parentId: z.string().uuid('Must be a valid UUID').optional(),
    dependsOnId: z.string().uuid('Must be a valid UUID').optional(),
    orderIndex: z.coerce.number().int().min(0, 'Must be 0 or greater').default(0),
    color: z.string().max(50).optional(),
    icon: z.string().max(100).optional(),
    isActive: z.boolean().default(true),
    metadata: z.record(z.unknown()).optional(),
  })
  .refine((data) => data.scopeType !== LookupScopeType.ORGANIZATION || !!data.scopeId, {
    message: 'Scope ID is required when scope type is Organization',
    path: ['scopeId'],
  });

export type LookupFormValues = z.output<typeof lookupSchema>;
export type LookupFormInput = z.input<typeof lookupSchema>;
