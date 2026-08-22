/**
 * Whether a loaded follow-up belongs on the current customer or site record.
 *
 * Extracted so URL/deep-link edge cases are testable without mounting the dialog.
 */
export function followupDetailScopeError(
  followup: { customerId: string; propertyId?: string | null },
  scope?: { customerId?: string; propertyId?: string },
): 'not-found' | null {
  if (scope?.customerId && followup.customerId !== scope.customerId) {
    return 'not-found';
  }
  if (scope?.propertyId && (followup.propertyId ?? null) !== scope.propertyId) {
    return 'not-found';
  }
  return null;
}
