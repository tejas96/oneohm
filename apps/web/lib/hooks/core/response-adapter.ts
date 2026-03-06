import type { ResourceListResponse } from './types';

export function defaultResponseAdapter<T>(raw: unknown): ResourceListResponse<T> {
  const response = raw as Record<string, unknown>;

  // Format A: { data: T[], meta: PaginationMeta }
  if ('meta' in response && 'data' in response) {
    return response as unknown as ResourceListResponse<T>;
  }

  // Format B: { items: T[], total, page, limit }
  if ('items' in response) {
    const { items, total, page, limit } = response as {
      items: T[];
      total: number;
      page: number;
      limit: number;
    };
    return {
      data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  // Format C: { data: T[], total, page, pageSize }
  if ('data' in response && 'pageSize' in response) {
    const { data, total, page, pageSize } = response as {
      data: T[];
      total: number;
      page: number;
      pageSize: number;
    };
    return {
      data,
      meta: { page, limit: pageSize, total, totalPages: Math.ceil(total / pageSize) || 1 },
    };
  }

  throw new Error(`Unknown API response format for keys: ${Object.keys(response).join(', ')}`);
}
