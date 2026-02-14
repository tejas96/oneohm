import { AxiosError } from 'axios';

/**
 * Extract error message from API error response
 * Handles Axios errors, standard errors, and unknown error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data;
    if (typeof data === 'object' && data !== null) {
      if ('message' in data) {
        return Array.isArray(data.message) ? data.message[0] : String(data.message);
      }
      if ('error' in data) {
        return String(data.error);
      }
    }
    return error.response?.statusText || error.message || 'An error occurred';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}
