import { extractApiErrorMessage } from '@tejas96/shared/utils';

/**
 * Extract error message from API error response.
 * Thin wrapper around the shared utility for backward compatibility.
 */
export function getErrorMessage(error: unknown): string {
  return extractApiErrorMessage(error, 'An unexpected error occurred');
}

/**
 * The error message without its closing full stop, for a toast that carries on
 * after it. Server messages are usually whole sentences, so "…filed: ${message}. "
 * showed "…credentials and bucket.. Use Receipt…".
 */
export function getErrorReason(error: unknown): string {
  return getErrorMessage(error).replace(/[.\s]+$/, '');
}
