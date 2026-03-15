import { extractApiErrorMessage } from '@oneohm-epc/shared/utils';

/**
 * Extract error message from API error response.
 * Thin wrapper around the shared utility for backward compatibility.
 */
export function getErrorMessage(error: unknown): string {
  return extractApiErrorMessage(error, 'An unexpected error occurred');
}
