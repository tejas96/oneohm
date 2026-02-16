/**
 * Phone Utility Functions
 * Shared utilities for phone number formatting and validation
 *
 * @module lib/utils/phone
 */

/**
 * Format a phone number for WhatsApp click-to-chat
 * Removes all non-digit characters and prepends country code if needed
 *
 * @param phone - Phone number string (can include formatting)
 * @returns Digits-only string suitable for wa.me links
 *
 * @example
 * formatPhoneForWhatsApp('+91 98765 43210') // '919876543210'
 * formatPhoneForWhatsApp('9876543210') // '919876543210'
 */
export function formatPhoneForWhatsApp(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // If it's a 10-digit Indian number, prepend country code
  if (digits.length === 10) {
    return `91${digits}`;
  }

  return digits;
}

/**
 * Format a phone number for display
 * Formats Indian phone numbers in a readable format
 *
 * @param phone - Phone number string
 * @returns Formatted phone string
 *
 * @example
 * formatPhoneForDisplay('9876543210') // '+91 98765 43210'
 */
export function formatPhoneForDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  // Handle 10-digit Indian numbers
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }

  // Handle numbers with country code
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }

  // Return as-is if format is unknown
  return phone;
}

/**
 * Check if a phone number is valid (basic validation)
 *
 * @param phone - Phone number string
 * @returns Whether the phone number appears valid
 */
export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  // Valid: 10 digits (Indian) or 12 digits (with country code)
  return digits.length === 10 || (digits.length === 12 && digits.startsWith('91'));
}
