import { join } from 'path';

/** Resolve template assets whether running from src or dist. */
export function resolveReportAsset(...segments: string[]): string {
  return join(__dirname, '..', ...segments);
}

export function str(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

export function formatPropertyAddress(property: {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string | null;
}): string {
  return [property.address, property.city, property.state, property.pincode, property.country]
    .filter(Boolean)
    .join(', ');
}

export function customerDisplayName(property: {
  consumerName?: string | null;
  customer?: { firstName?: string | null; lastName?: string | null } | null;
}): string {
  if (property.consumerName?.trim()) return property.consumerName.trim();
  const c = property.customer;
  if (!c) return '';
  return `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim();
}
