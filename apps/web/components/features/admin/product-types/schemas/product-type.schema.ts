import { z } from 'zod';

const SYSTEM_PRODUCT_TYPE_CODES = ['solar_panel', 'inverter', 'mounting_structure'] as const;

const dataTypeSchema = z.enum(['string', 'integer', 'decimal', 'boolean', 'enum']);

const attributeSchema = z.object({
  id: z.string().optional(),
  attributeKey: z
    .string()
    .trim()
    .min(1, 'Attribute key is required')
    .regex(/^[a-z0-9_]+$/, 'Use lowercase letters, numbers, or underscores'),
  label: z.string().trim().min(1, 'Label is required'),
  dataType: dataTypeSchema,
  isRequired: z.boolean(),
  isFilterable: z.boolean(),
  groupName: z.string().trim().min(1, 'Group name is required'),
  sortOrder: z
    .number({ invalid_type_error: 'Sort order must be a number' })
    .min(1, 'Sort order must be >= 1'),
  defaultValue: z.string().trim().optional(),
  helpText: z.string().trim().optional(),
  validationMin: z.number({ invalid_type_error: 'Min must be a number' }).optional(),
  validationMax: z.number({ invalid_type_error: 'Max must be a number' }).optional(),
  validationOptions: z.string().trim().optional(),
});

export const productTypeSchema = z
  .object({
    name: z.string().trim().min(1, 'Product type name is required'),
    code: z
      .string()
      .trim()
      .min(2, 'Code must be at least 2 characters')
      .regex(/^[a-z0-9_]+$/, 'Use lowercase letters, numbers, or underscores'),
    description: z.string().trim().optional(),
    icon: z.string().trim().optional(),
    defaultUnitOfMeasure: z.string().trim().min(1, 'Unit of measure is required'),
    defaultPricingBasis: z.string().trim().min(1, 'Pricing basis is required'),
    defaultGstRate: z
      .number({ invalid_type_error: 'GST rate must be a number' })
      .min(0, 'GST rate must be >= 0')
      .max(100, 'GST rate must be <= 100'),
    isActive: z.boolean(),
    sortOrder: z
      .number({ invalid_type_error: 'Sort order must be a number' })
      .min(1, 'Sort order must be >= 1'),
    attributes: z.array(attributeSchema),
  })
  .superRefine((data, ctx) => {
    const keys = new Set<string>();
    data.attributes.forEach((attr, index) => {
      if (keys.has(attr.attributeKey)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Attribute keys must be unique',
          path: ['attributes', index, 'attributeKey'],
        });
      }
      keys.add(attr.attributeKey);

      if (attr.dataType === 'enum') {
        const options = attr.validationOptions
          ?.split(',')
          .map((value) => value.trim())
          .filter(Boolean);
        if (!options || options.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Enum options are required',
            path: ['attributes', index, 'validationOptions'],
          });
        }
      }

      if (attr.dataType === 'integer' || attr.dataType === 'decimal') {
        if (
          attr.validationMin !== undefined &&
          attr.validationMax !== undefined &&
          attr.validationMax < attr.validationMin
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Max must be >= min',
            path: ['attributes', index, 'validationMax'],
          });
        }
      }
    });
  });

export const createProductTypeSchema = productTypeSchema.superRefine((data, ctx) => {
  if ((SYSTEM_PRODUCT_TYPE_CODES as readonly string[]).includes(data.code)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `'${data.code}' is a reserved system code and cannot be used`,
      path: ['code'],
    });
  }
});

export type ProductTypeFormData = z.infer<typeof productTypeSchema>;
