import type { ReportFact } from './report-facts';
import { validateFactValue } from './validate-fact';
import { EMAIL_REGEX } from '../../utils/validation';

const INDIAN_MOBILE_E164 = /^\+91[6-9]\d{9}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** "98765 43210", "+91 98765 43210", "09876543210" → "+919876543210". Anything else is returned trimmed. */
export function normalizeIndianMobile(raw: string): string {
  const value = raw.trim();
  if (!/^[\d\s+\-()]+$/.test(value)) return value;
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `+91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return value;
}

/**
 * The value that is validated and sent: trimmed, a mobile number in
 * +91XXXXXXXXXX form, digits without spaces or dashes. Empty means "clear".
 */
export function normalizeFactInput(fact: Pick<ReportFact, 'type' | 'edit'>, raw: string): string {
  const value = raw.trim();
  if (!value || !fact.edit) return value;
  if (fact.type === 'phone') return normalizeIndianMobile(value);
  if (fact.edit.input === 'digits') return value.replace(/[\s-]/g, '');
  return value;
}

/**
 * Null when the input may be sent. Run on the normalised value. Manual facts
 * use their type rule; customer and site facts add the owner's rules so bad
 * input is caught before a round trip. The owner's own validation still runs
 * on the server and has the last word.
 */
export function validateFactInput(
  fact: Pick<ReportFact, 'label' | 'type' | 'edit'>,
  value: string,
): string | null {
  const edit = fact.edit;
  if (!edit) return validateFactValue(fact, value);

  if (!value) return edit.required ? `${fact.label} cannot be empty.` : null;

  switch (edit.input) {
    case 'digits': {
      const { min, max } = edit.digits ?? { min: 1, max: 50 };
      const length = min === max ? `${min}` : `${min}–${max}`;
      return /^\d+$/.test(value) && value.length >= min && value.length <= max
        ? null
        : `${fact.label} must be ${length} digits.`;
    }
    case 'number': {
      const n = Number(value);
      return Number.isFinite(n) && n >= 0 ? null : `${fact.label} must be a number, 0 or more.`;
    }
    case 'discom':
      // Format only: whether it exists and is active is the site owner's check.
      return UUID_RE.test(value) ? null : 'Pick a DISCOM.';
    case 'select':
      // Own keys only ("constructor" is not an option). Object.hasOwn needs ES2022; this lib targets lower.
      return edit.options && Object.prototype.hasOwnProperty.call(edit.options, value)
        ? null
        : `Pick a ${fact.label.toLowerCase()}.`;
    default:
      break;
  }

  if (fact.type === 'phone') {
    return INDIAN_MOBILE_E164.test(value)
      ? null
      : `${fact.label} must be a 10-digit Indian mobile number, e.g. 98765 43210.`;
  }
  if (fact.type === 'email') {
    return EMAIL_REGEX.test(value) ? null : `${fact.label} must be an email address.`;
  }
  return validateFactValue(fact, value);
}
