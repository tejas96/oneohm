import { getFact, type ReportFact } from './report-facts';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[\d\s+\-()]{6,20}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const MAX_LENGTH: Record<ReportFact['type'], number> = {
  text: 200,
  textarea: 1000,
  number: 20,
  date: 10,
  email: 200,
  phone: 20,
  year: 4,
};

/** Null when valid. An empty value is always valid here; required-ness is per report. */
export function validateFactValue(
  fact: Pick<ReportFact, 'label' | 'type'>,
  raw: string,
): string | null {
  const value = raw.trim();
  if (!value) return null;

  const max = MAX_LENGTH[fact.type];
  if (value.length > max) return `${fact.label} is too long (max ${max} characters)`;

  switch (fact.type) {
    case 'number': {
      const n = Number(value);
      return Number.isFinite(n) && n >= 0 ? null : `${fact.label} must be a number`;
    }
    case 'date': {
      if (!DATE_RE.test(value)) return `${fact.label} must be a date`;
      const parsed = new Date(`${value}T00:00:00Z`);
      return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value)
        ? null
        : `${fact.label} must be a real date`;
    }
    case 'year': {
      const year = Number(value);
      const now = new Date().getFullYear();
      return /^\d{4}$/.test(value) && year >= 2000 && year <= now
        ? null
        : `${fact.label} must be a year between 2000 and ${now}`;
    }
    case 'email':
      return EMAIL_RE.test(value) ? null : `${fact.label} must be an email address`;
    case 'phone':
      return PHONE_RE.test(value) ? null : `${fact.label} must be a phone number`;
    default:
      return null;
  }
}

export interface FactPatchResult {
  next: Record<string, string>;
  errors: Record<string, string>;
}

/** `null` or blank clears a key. Only manual facts can be patched. */
export function applyFactPatch(
  current: Record<string, string>,
  patch: Record<string, unknown>,
): FactPatchResult {
  // Maps, not objects: keys come from the request, so a key like "__proto__"
  // must never be written as a property.
  const next = new Map(Object.entries(current));
  const errors = new Map<string, string>();

  for (const [key, value] of Object.entries(patch)) {
    const fact = getFact(key);
    if (!fact || fact.source !== 'manual') {
      errors.set(key, `${key} cannot be edited on the Reports tab`);
      continue;
    }
    if (value === null || (typeof value === 'string' && value.trim() === '')) {
      next.delete(fact.key);
      continue;
    }
    if (typeof value !== 'string') {
      errors.set(fact.key, `${fact.label} must be text`);
      continue;
    }
    const message = validateFactValue(fact, value);
    if (message) {
      errors.set(fact.key, message);
      continue;
    }
    next.set(fact.key, value.trim());
  }

  return { next: Object.fromEntries(next), errors: Object.fromEntries(errors) };
}
