import type { ReportSchema } from '../schemas/report-field.schema';

export interface ReportCompleteness {
  reportId: string;
  reportName: string;
  totalRequired: number;
  filledRequired: number;
  missingRequired: number;
  missingFields: Array<{ key: string; label: string }>;
  isComplete: boolean;
}

export function getReportCompleteness(
  schema: ReportSchema,
  fields: Record<string, string>,
): ReportCompleteness {
  const requiredFields = schema.fields.filter((f) => f.required);
  const missingFields = requiredFields
    .filter((f) => !fields[f.key]?.trim())
    .map((f) => ({ key: f.key, label: f.label }));

  const totalRequired = requiredFields.length;
  const missingRequired = missingFields.length;
  const filledRequired = totalRequired - missingRequired;
  const isComplete = missingRequired === 0;

  return {
    reportId: schema.id,
    reportName: schema.name,
    totalRequired,
    filledRequired,
    missingRequired,
    missingFields,
    isComplete,
  };
}
