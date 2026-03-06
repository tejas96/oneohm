import { normalizeApiError } from '../error-adapter';

function makeAxiosError(overrides: { message?: string; status?: number; data?: unknown }): {
  isAxiosError: boolean;
  message: string;
  response: { status: number; data: unknown };
} {
  return {
    isAxiosError: true,
    message: overrides.message ?? 'Request failed',
    response: {
      status: overrides.status ?? 500,
      data: overrides.data ?? {},
    },
  };
}

describe('normalizeApiError', () => {
  it('normalizes Axios error with string message', () => {
    const error = makeAxiosError({
      status: 400,
      data: { message: 'Invalid email' },
    });
    const result = normalizeApiError(error);
    expect(result.message).toBe('Invalid email');
    expect(result.status).toBe(400);
    expect(result.validationErrors).toBeUndefined();
  });

  it('normalizes Axios error with message array (validation)', () => {
    const error = makeAxiosError({
      status: 422,
      data: { message: ['Name is required', 'Email is invalid'] },
    });
    const result = normalizeApiError(error);
    expect(result.message).toBe('Name is required');
    expect(result.status).toBe(422);
    expect(result.validationErrors).toEqual([
      { field: '', message: 'Name is required' },
      { field: '', message: 'Email is invalid' },
    ]);
  });

  it('normalizes Axios error with error field', () => {
    const error = makeAxiosError({
      status: 403,
      data: { error: 'Forbidden' },
    });
    const result = normalizeApiError(error);
    expect(result.message).toBe('Forbidden');
  });

  it('normalizes Axios error with code field', () => {
    const error = makeAxiosError({
      data: { message: 'Duplicate', code: 'DUPLICATE_ENTRY' },
    });
    const result = normalizeApiError(error);
    expect(result.code).toBe('DUPLICATE_ENTRY');
  });

  it('normalizes standard Error', () => {
    const result = normalizeApiError(new Error('Something went wrong'));
    expect(result.message).toBe('Something went wrong');
    expect(result.status).toBeUndefined();
  });

  it('normalizes unknown error type', () => {
    const result = normalizeApiError('string error');
    expect(result.message).toBe('An unexpected error occurred');
    expect(result.raw).toBe('string error');
  });

  it('normalizes null error', () => {
    const result = normalizeApiError(null);
    expect(result.message).toBe('An unexpected error occurred');
  });

  it('preserves raw error reference', () => {
    const original = makeAxiosError({ data: { message: 'Test' } });
    const result = normalizeApiError(original);
    expect(result.raw).toBe(original);
  });
});
