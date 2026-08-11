export const PHONE_REGEX = /^\+?[0-9]{10,15}$/;
export const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
export const PINCODE_REGEX = /^\d{6}$/;
export const CONSUMER_NUMBER_REGEX = /^\d{10,12}$/;
export const CONSUMER_NUMBER_MESSAGE = 'Consumer number must be 10–12 digits';

export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const GSTIN_LENGTH = 15;
export const GSTIN_LENGTH_MESSAGE = 'GSTIN must be 15 characters';
export const GSTIN_FORMAT_MESSAGE = 'Invalid GSTIN format (e.g., 22AAAAA0000A1Z5)';

export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
export const PAN_LENGTH = 10;
export const PAN_LENGTH_MESSAGE = 'PAN must be 10 characters';
export const PAN_FORMAT_MESSAGE = 'Invalid PAN format (e.g., ABCDE1234F)';

export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const IFSC_LENGTH = 11;
export const IFSC_LENGTH_MESSAGE = 'IFSC code must be 11 characters';
export const IFSC_FORMAT_MESSAGE = 'Invalid IFSC code format (e.g., SBIN0001234)';

export const AADHAAR_REGEX = /^[2-9]\d{11}$/;
export const AADHAAR_LENGTH = 12;
export const AADHAAR_LENGTH_MESSAGE = 'Aadhaar must be 12 digits';
export const AADHAAR_FORMAT_MESSAGE = 'Invalid Aadhaar number';
export const AADHAAR_ALREADY_REGISTERED_MESSAGE = 'This Aadhaar number is already registered';

/**
 * Validate phone number (international format: 10-15 digits, optional + prefix)
 */
export function isValidPhone(phone: string): boolean {
  return PHONE_REGEX.test(phone.replace(/\s/g, ''));
}

/**
 * Validate Indian mobile number (10 digits, must start with 6-9)
 */
export function isValidIndianMobile(phone: string): boolean {
  return INDIAN_MOBILE_REGEX.test(phone.replace(/\D/g, ''));
}

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

/**
 * Validate Indian pincode (exactly 6 digits)
 */
export function isValidPincode(pincode: string): boolean {
  return PINCODE_REGEX.test(pincode);
}

/**
 * Strip non-digits and cap at 12 chars for Maharashtra DISCOM consumer numbers.
 */
export function normalizeConsumerNumber(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 12);
}

/**
 * Validate Indian electricity consumer number (10–12 digits).
 */
export function isValidConsumerNumber(value: string): boolean {
  return CONSUMER_NUMBER_REGEX.test(normalizeConsumerNumber(value));
}

/**
 * Normalize Indian business identifiers (GSTIN, PAN, IFSC) for storage.
 */
export function normalizeBusinessIdentifier(value: string): string {
  return value.trim().toUpperCase();
}

/**
 * Validate Indian GSTIN (15 characters).
 */
export function isValidGstin(value: string): boolean {
  const gstin = value.trim().toUpperCase();
  return gstin.length === GSTIN_LENGTH && GSTIN_REGEX.test(gstin);
}

/**
 * Validate Indian PAN (10 characters).
 */
export function isValidPan(value: string): boolean {
  const pan = value.trim().toUpperCase();
  return pan.length === PAN_LENGTH && PAN_REGEX.test(pan);
}

/**
 * Validate Indian bank IFSC code (11 characters).
 */
export function isValidIfscCode(value: string): boolean {
  const ifsc = value.trim().toUpperCase();
  return ifsc.length === IFSC_LENGTH && IFSC_REGEX.test(ifsc);
}

/**
 * Strip non-digits and cap at 12 chars for Indian Aadhaar numbers.
 */
export function normalizeAadhaar(value: string): string {
  return value.replace(/\D/g, '').slice(0, 12);
}

/**
 * Validate Indian Aadhaar number (12 digits, first digit 2-9).
 */
export function isValidAadhaar(value: string): boolean {
  return AADHAAR_REGEX.test(normalizeAadhaar(value));
}

/**
 * Mask an Aadhaar number for API responses (e.g. XXXX-XXXX-1234).
 * Never expose full Aadhaar in list or detail payloads.
 */
export function maskAadhaar(value: string | null | undefined): string | undefined {
  const normalized = normalizeAadhaar(value ?? '');
  if (normalized.length !== AADHAAR_LENGTH) {
    return undefined;
  }

  return `XXXX-XXXX-${normalized.slice(-4)}`;
}
