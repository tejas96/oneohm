import { type PaginatedResponse, type PaginationMeta } from '@oneohm-epc/shared-types';
import { plainToInstance, type ClassConstructor } from 'class-transformer';

/**
 * Create a paginated response with proper structure
 * 
 * @param data - Array of items to paginate
 * @param total - Total count of items
 * @param page - Current page number
 * @param limit - Items per page
 * @param dtoClass - Optional DTO class for transformation
 * @returns Paginated response with data and meta
 * 
 * @example
 * // Simple usage
 * return createPaginatedResponse(users, 100, 1, 20);
 * 
 * @example
 * // With DTO transformation
 * return createPaginatedResponse(users, 100, 1, 20, UserResponseDto);
 */
export function createPaginatedResponse<T, D = T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  dtoClass?: ClassConstructor<D>,
): PaginatedResponse<D> {
  const transformedData = dtoClass
    ? plainToInstance(dtoClass, data, { excludeExtraneousValues: true })
    : (data as unknown as D[]);

  return {
    data: transformedData,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Create pagination metadata
 * 
 * @param total - Total count of items
 * @param page - Current page number
 * @param limit - Items per page
 * @returns Pagination metadata object
 * 
 * @example
 * const meta = createPaginationMeta(100, 1, 20);
 * // Returns: { page: 1, limit: 20, total: 100, totalPages: 5 }
 */
export function createPaginationMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Parse and validate pagination parameters
 * 
 * @param page - Page parameter (can be string or number)
 * @param limit - Limit parameter (can be string or number)
 * @param defaultPage - Default page if not provided (default: 1)
 * @param defaultLimit - Default limit if not provided (default: 20)
 * @param maxLimit - Maximum allowed limit (default: 100)
 * @returns Validated pagination parameters
 * 
 * @example
 * const { page, limit } = parsePaginationParams(req.query.page, req.query.limit);
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

  // Parse page
  if (typeof page === 'string') {
    const pageNum = parseInt(page, 10);
    if (!isNaN(pageNum) && pageNum > 0) {
      parsedPage = pageNum;
    }
  } else if (typeof page === 'number' && page > 0) {
    parsedPage = page;
  }

  // Parse limit
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
 * 
 * @param page - Current page number
 * @param limit - Items per page
 * @returns Number of items to skip
 * 
 * @example
 * const skip = calculateSkip(2, 20); // Returns 20
 */
export function calculateSkip(page: number, limit: number): number {
  return (page - 1) * limit;
}

