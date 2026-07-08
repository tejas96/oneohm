const INDIAN_MOBILE_PATTERN = /^[6-9]\d{9}$/;

export function normalizeIndianMobileInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\+91[6-9]\d{9}$/.test(trimmed)) {
    return trimmed;
  }

  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length === 10 && INDIAN_MOBILE_PATTERN.test(digitsOnly)) {
    return `+91${digitsOnly}`;
  }

  if (
    digitsOnly.length === 12 &&
    digitsOnly.startsWith('91') &&
    INDIAN_MOBILE_PATTERN.test(digitsOnly.slice(2))
  ) {
    return `+${digitsOnly}`;
  }

  return null;
}

export function validateIndianMobile(value: string, optional = false): string | null {
  if (!value.trim()) {
    return optional ? null : 'Phone number is required';
  }
  return normalizeIndianMobileInput(value) ? null : 'Enter a valid Indian mobile number';
}

export function getCustomerDisplayName(parts: {
  firstName: string;
  middleName?: string | null;
  lastName?: string | null;
}): string {
  return [parts.firstName, parts.middleName, parts.lastName].filter(Boolean).join(' ').trim();
}

export function isTabActive(activeTab: string, tab: string): boolean {
  return activeTab === tab;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}
