import { z } from 'zod';

const optionalString = z.string().trim().optional().or(z.literal(''));

export const discomFormSchema = z.object({
  circleName: z.string().trim().min(1, 'Circle name is needed'),
  circleInchargeName: z.string().trim().min(1, 'Add the circle SE'),
  divisionName: z.string().trim().min(1, 'Division name is needed'),
  divisionInchargeName: z.string().trim().min(1, 'Add the division EE'),
  testingUnitName: optionalString,
  subdivisionName: optionalString,
  subdivisionInchargeName: optionalString,
  aeqcEngineerName: optionalString,
  sectionName: optionalString,
  sectionEngineerName: optionalString,
  officeAddress: optionalString,
  mobileNo: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || v.replace(/\D/g, '').length >= 10, 'Enter all 10 digits'),
  email: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine(
      (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      'Use a full email like office@mahadiscom.in',
    ),
  latitude: optionalString,
  longitude: optionalString,
  isActive: z.boolean(),
});

export type DiscomFormValues = z.infer<typeof discomFormSchema>;
