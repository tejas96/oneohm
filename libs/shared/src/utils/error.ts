interface ApiErrorData {
  message?: string | string[];
  error?: string;
  errors?: Array<{ field: string; message: string }>;
  description?: string;
  detail?: string;
  reason?: string;
}

interface ApiErrorResponse {
  response?: {
    data?: ApiErrorData;
    status?: number;
  };
}

const STATUS_CODE_MESSAGES: Record<number, string> = {
  400: 'Invalid request. Please check your input.',
  401: 'Session expired. Please login again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  409: 'A conflict occurred. The resource may already exist.',
  422: 'Validation failed. Please check your input.',
  429: 'Too many requests. Please try again later.',
  500: 'Server error. Please try again later.',
  502: 'Server is temporarily unavailable. Please try again.',
  503: 'Service unavailable. Please try again later.',
};

const isApiError = (err: unknown): err is ApiErrorResponse =>
  err !== null && typeof err === 'object' && 'response' in err;

const extractFromData = (data: ApiErrorData): string | null => {
  if (data.message && Array.isArray(data.message)) {
    return data.message.join(', ');
  }
  if (typeof data.message === 'string') {
    return data.message;
  }
  if (data.errors && Array.isArray(data.errors)) {
    return data.errors.map((e) => e.message).join(', ');
  }
  if (data.error) return data.error;
  if (data.description) return data.description;
  if (data.detail) return data.detail;
  if (data.reason) return data.reason;
  return null;
};

/**
 * Extract a user-friendly error message from various error types.
 * Works with Axios-style errors (duck-typed, no Axios dependency).
 */
export function extractApiErrorMessage(
  err: unknown,
  fallbackMessage = 'An error occurred. Please try again.',
): string {
  if (isApiError(err)) {
    const { response } = err;
    const data = response?.data;
    const status = response?.status;

    if (data) {
      const dataMessage = extractFromData(data);
      if (dataMessage) return dataMessage;
    }

    if (status && STATUS_CODE_MESSAGES[status]) {
      return STATUS_CODE_MESSAGES[status];
    }
  }

  if (err instanceof Error) {
    return err.message;
  }

  return fallbackMessage;
}

/**
 * Extract error message with context-specific fallbacks
 */
export function extractApiErrorMessageWithContext(
  err: unknown,
  context: Partial<Record<number | 'fallback', string>>,
): string {
  if (isApiError(err)) {
    const { response } = err;
    const data = response?.data;
    const status = response?.status;

    if (data) {
      const dataMessage = extractFromData(data);
      if (dataMessage) return dataMessage;
    }

    if (status && context[status]) {
      return context[status]!;
    }

    if (status && STATUS_CODE_MESSAGES[status]) {
      return STATUS_CODE_MESSAGES[status];
    }
  }

  if (err instanceof Error) {
    return err.message;
  }

  return context.fallback ?? 'An error occurred. Please try again.';
}
