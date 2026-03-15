import type { PaginatedResponse, PaginationMeta } from '../types/interfaces/common.interface';

/**
 * Create pagination metadata
 */
export function createPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Create a paginated response with proper structure.
 * Does NOT include class-transformer support --
 * DTO transformation should be done by the consumer (backend).
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResponse<T> {
  return {
    data,
    meta: createPaginationMeta(total, page, limit),
  };
}

/**
 * Parse and validate pagination parameters
 */
export function parsePaginationParams(
  page?: string | number,
  limit?: string | number,
  defaultPage = 1,
  defaultLimit = 20,
  maxLimit = 100,
): { page: number; limit: number } {
  let parsedPage = defaultPage;
  let parsedLimit = defaultLimit;

  if (typeof page === 'string') {
    const pageNum = parseInt(page, 10);
    if (!isNaN(pageNum) && pageNum > 0) {
      parsedPage = pageNum;
    }
  } else if (typeof page === 'number' && page > 0) {
    parsedPage = page;
  }

  if (typeof limit === 'string') {
    const limitNum = parseInt(limit, 10);
    if (!isNaN(limitNum) && limitNum > 0) {
      parsedLimit = Math.min(limitNum, maxLimit);
    }
  } else if (typeof limit === 'number' && limit > 0) {
    parsedLimit = Math.min(limit, maxLimit);
  }

  return { page: parsedPage, limit: parsedLimit };
}

/**
 * Calculate skip value for database queries
 */
export function calculateSkip(page: number, limit: number): number {
  return (page - 1) * limit;
}
