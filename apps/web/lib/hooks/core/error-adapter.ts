import type { AxiosError } from 'axios';

import type { NormalizedError } from './types';

export function normalizeApiError(error: unknown): NormalizedError {
  if (isAxiosError(error)) {
    const data = error.response?.data as Record<string, unknown> | undefined;
    const status = error.response?.status;

    let message = error.message;
    const validationErrors: NormalizedError['validationErrors'] = [];

    if (data) {
      if (Array.isArray(data.message)) {
        message = data.message[0] as string;
        for (const msg of data.message as string[]) {
          validationErrors.push({ field: '', message: msg });
        }
      } else if (typeof data.message === 'string') {
        message = data.message;
      } else if (typeof data.error === 'string') {
        message = data.error;
      }
    }

    return {
      message,
      code: data?.code != null ? `${data.code as string | number}` : undefined,
      status,
      validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
      raw: error,
    };
  }

  if (error instanceof Error) {
    return { message: error.message, raw: error };
  }

  return { message: 'An unexpected error occurred', raw: error };
}

function isAxiosError(error: unknown): error is AxiosError {
  return typeof error === 'object' && error !== null && 'isAxiosError' in error;
}
