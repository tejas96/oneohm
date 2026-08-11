import { escapeIlikePattern } from './sql';

/**
 * Mirrors in-memory address matching in ProjectTaskService.applyMyTaskListFilters.
 */
export function matchesMyTaskAddressFilter(
  property: { address?: string; city?: string; pincode?: string; state?: string } | undefined,
  addressQuery: string,
): boolean {
  const addressLower = addressQuery.trim().toLowerCase();
  if (!addressLower) return true;
  const fields = [property?.address, property?.city, property?.pincode, property?.state]
    .filter(Boolean)
    .map((v) => String(v).toLowerCase());
  return fields.some((f) => f.includes(addressLower));
}

export { escapeIlikePattern };
