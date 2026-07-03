import type { ReportSchema } from '../schemas/report-field.schema';

export function buildEmptyFields(schema: ReportSchema): Record<string, string> {
  return Object.fromEntries(schema.fields.map((f) => [f.key, '']));
}

export function getFieldKeys(schema: ReportSchema): readonly string[] {
  return schema.fields.map((f) => f.key);
}
