import { getReportSchema } from '../report-catalog';
import type { ReportFieldDefinition } from '../schemas/report-field.schema';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PHONE_RE = /^[\d\s+\-()]{6,20}$/;

function validateFieldValue(field: ReportFieldDefinition, value: string): string | null {
  const trimmed = value.trim();

  if (field.required && !trimmed) {
    return `${field.label} is required`;
  }

  if (!trimmed) {
    return null;
  }

  switch (field.type) {
    case 'email':
      if (!EMAIL_RE.test(trimmed)) {
        return `${field.label} must be a valid email address`;
      }
      break;
    case 'date':
      if (!DATE_RE.test(trimmed)) {
        return `${field.label} must be a valid date (YYYY-MM-DD)`;
      }
      break;
    case 'phone':
      if (!PHONE_RE.test(trimmed)) {
        return `${field.label} must be a valid phone number`;
      }
      break;
    case 'number':
      if (Number.isNaN(Number(trimmed))) {
        return `${field.label} must be a number`;
      }
      break;
    default:
      break;
  }

  return null;
}

export function validateAndSanitizeReportFields(
  reportId: string,
  fields: Record<string, string>,
): Record<string, string> {
  const schema = getReportSchema(reportId);
  const allowed = new Set(schema.fields.map((f) => f.key));
  const sanitized: Record<string, string> = {};
  const errors: string[] = [];

  for (const [key, value] of Object.entries(fields)) {
    if (!allowed.has(key)) {
      throw new Error(`Invalid field key for report ${reportId}: ${key}`);
    }
    sanitized[key] = value ?? '';
  }

  for (const field of schema.fields) {
    if (!(field.key in sanitized)) {
      sanitized[field.key] = '';
    }

    const message = validateFieldValue(field, sanitized[field.key] ?? '');
    if (message) {
      errors.push(message);
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }

  return sanitized;
}
