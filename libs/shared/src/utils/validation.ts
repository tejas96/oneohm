export const PHONE_REGEX = /^\+?[0-9]{10,15}$/;
export const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
export const PINCODE_REGEX = /^\d{6}$/;

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
