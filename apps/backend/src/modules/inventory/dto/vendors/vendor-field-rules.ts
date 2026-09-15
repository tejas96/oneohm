import { normalizeBusinessIdentifier } from '@tejas96/shared/utils';

/**
 * Format rules shared by CreateVendorDto and UpdateVendorDto — the same rules
 * the vendor form checks in the browser, so a vendor created from any screen,
 * or straight through the API, is held to them.
 */

/** Digits, spaces and +()- only, as the vendor form allows. Length is checked separately. */
export const VENDOR_PHONE_CHARACTERS = /^\+?[\d\s\-()]+$/;

/**
 * GSTIN, PAN and IFSC are stored upper-case. The form accepts "27abbfa…" and
 * would otherwise save it as typed; the format check runs on the upper-cased value.
 */
export function upperCaseIdentifier({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? normalizeBusinessIdentifier(value) : value;
}
