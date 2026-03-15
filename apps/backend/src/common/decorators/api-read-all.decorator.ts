import { type Type, applyDecorators, Get, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';

/**
 * Pagination response wrapper type for Swagger
 */
export class PaginatedResponseDto<T> {
  items!: T[];
  total!: number;
  page!: number;
  limit!: number;
}

/**
 * API Read All Decorator
 * Combines common decorators for GET/ (list) endpoints with pagination
 *
 * Features:
 * - Standard pagination (page, limit) query params
 * - Proper Swagger response schema with $ref
 * - Custom query parameters support
 * - Additional error responses
 * - Custom path support
 *
 * @example
 * @ApiReadAll({
 *   summary: 'Get all employees',
 *   responseType: EmployeeResponseDto,
 * })
 *
 * @example
 * @ApiReadAll({
 *   path: 'active',
 *   summary: 'Get all active employees',
 *   responseType: EmployeeResponseDto,
 *   additionalQueries: [
 *     { name: 'department', description: 'Filter by department' },
 *     { name: 'status', enum: UserStatus, description: 'Filter by status' },
 *   ],
 * })
 */
export function ApiReadAll<TResponse>(options: {
  /** Route summary for Swagger */
  summary: string;
  /** Route description for Swagger */
  description?: string;
  /** Response DTO type */
  responseType: Type<TResponse>;
  /** Custom path (e.g., 'active', 'by-department') - defaults to '' */
  path?: string;
  /** Success message for Swagger response description */
  successMessage?: string;
  /** Additional query parameters */
  additionalQueries?: Array<{
    /** Query parameter name */
    name: string;
    /** Is this query param required? */
    required?: boolean;
    /** Parameter type (String, Number, Boolean) */
    type?: Type<unknown>;
    /** Description for Swagger */
    description?: string;
    /** Enum values - can pass enum directly (UserStatus) or as array (Object.values(UserStatus)) */

    enum?: any;
    /** Example value */
    example?: unknown;
  }>;
  /** Additional error responses */
  additionalErrors?: Array<{ status: HttpStatus; description: string }>;
  /** Include default pagination params? Defaults to true */
  includePagination?: boolean;
}): MethodDecorator & ClassDecorator {
  const successMessage = options.successMessage || 'Resources retrieved successfully';
  const includePagination = options.includePagination !== false;

  const decorators: Array<MethodDecorator | ClassDecorator> = [
    Get(options.path || ''),
    HttpCode(HttpStatus.OK),
    ApiExtraModels(options.responseType),
    ApiOperation({
      summary: options.summary,
      description: options.description,
    }),
  ];

  // Add pagination query params if enabled
  if (includePagination) {
    decorators.push(
      ApiQuery({
        name: 'page',
        required: false,
        type: Number,
        description: 'Page number (1-indexed)',
        example: 1,
      }),
      ApiQuery({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Number of items per page',
        example: 20,
      }),
    );
  }

  // Add additional query parameters if provided
  if (options.additionalQueries) {
    options.additionalQueries.forEach((query) => {
      decorators.push(
        ApiQuery({
          name: query.name,
          required: query.required ?? false,
          type: query.type ?? String,
          description: query.description,
          enum: query.enum,
          example: query.example,
        }),
      );
    });
  }

  // Success response with proper schema reference
  decorators.push(
    ApiResponse({
      status: HttpStatus.OK,
      description: successMessage,
      schema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: { $ref: getSchemaPath(options.responseType) },
          },
          total: {
            type: 'number',
            description: 'Total number of items',
            example: 100,
          },
          page: {
            type: 'number',
            description: 'Current page number',
            example: 1,
          },
          limit: {
            type: 'number',
            description: 'Items per page',
            example: 20,
          },
        },
        required: ['items', 'total', 'page', 'limit'],
      },
    }),
  );

  // Standard error responses
  decorators.push(
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Invalid query parameters',
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Unauthorized - Invalid or missing token',
    }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'Forbidden - Insufficient permissions',
    }),
  );

  // Add additional error responses if provided
  if (options.additionalErrors) {
    options.additionalErrors.forEach((error) => {
      decorators.push(
        ApiResponse({
          status: error.status,
          description: error.description,
        }),
      );
    });
  }

  return applyDecorators(...decorators);
}
