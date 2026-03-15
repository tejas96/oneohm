import { type Type, applyDecorators, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';

/**
 * API Get Decorator
 * Generic decorator for custom GET endpoints with flexible path and response configuration
 * Suitable for statistics, exports, downloads, aggregations, custom queries, etc.
 *
 * Features:
 * - Flexible path configuration
 * - Custom response type or schema
 * - Path parameters support
 * - Query parameters support with enum
 * - Additional error responses
 *
 * @example
 * // Statistics endpoint
 * @ApiGet({
 *   path: 'statistics/status',
 *   summary: 'Get customer status statistics',
 * })
 *
 * @example
 * // Export endpoint
 * @ApiGet({
 *   path: 'export',
 *   summary: 'Export customers to CSV',
 *   responseType: String,
 * })
 *
 * @example
 * // With query parameters and enum filter
 * @ApiGet({
 *   path: 'search',
 *   summary: 'Search customers',
 *   responseType: CustomerResponseDto,
 *   responseIsArray: true,
 *   queries: [
 *     { name: 'query', required: true, type: String, description: 'Search term' },
 *     { name: 'status', enum: CustomerStatus, description: 'Filter by status' },
 *   ],
 * })
 *
 * @example
 * // With path parameters
 * @ApiGet({
 *   path: ':organizationId/employees/:departmentId',
 *   summary: 'Get employees by department',
 *   responseType: EmployeeResponseDto,
 *   responseIsArray: true,
 *   params: [
 *     { name: 'organizationId', description: 'Organization UUID' },
 *     { name: 'departmentId', description: 'Department UUID' },
 *   ],
 * })
 */
export function ApiGet<TResponse = Record<string, unknown>>(options: {
  /** Route path (e.g., 'statistics/status', 'export', ':id/details') */
  path: string;
  /** Route summary for Swagger */
  summary: string;
  /** Route description for Swagger */
  description?: string;
  /** Response DTO type */
  responseType?: Type<TResponse>;
  /** Custom response schema (alternative to responseType) */
  responseSchema?: Record<string, unknown>;
  /** Whether response is an array */
  responseIsArray?: boolean;
  /** Success message for Swagger response description */
  successMessage?: string;
  /** Path parameters (e.g., :id, :organizationId) */
  params?: Array<{
    /** Parameter name (must match the path placeholder) */
    name: string;
    /** Parameter type (defaults to String) */
    type?: Type<unknown>;
    /** Description for Swagger */
    description?: string;
    /** Example value */
    example?: unknown;
  }>;
  /** Query parameters */
  queries?: Array<{
    /** Query parameter name */
    name: string;
    /** Is this query param required? */
    required?: boolean;
    /** Parameter type (String, Number, Boolean) */
    type?: Type<unknown>;
    /** Description for Swagger */
    description?: string;
    /** Enum values - can pass enum directly (UserStatus) or as array */

    enum?: any;
    /** Example value */
    example?: unknown;
  }>;
  /** Additional error responses */
  additionalErrors?: Array<{ status: HttpStatus; description: string }>;
}): MethodDecorator & ClassDecorator {
  const successMessage = options.successMessage || 'Request successful';

  const decorators: Array<MethodDecorator | ClassDecorator> = [
    Get(options.path),
    HttpCode(HttpStatus.OK),
    ApiOperation({
      summary: options.summary,
      description: options.description,
    }),
  ];

  // Add path parameters if provided
  if (options.params) {
    options.params.forEach((param) => {
      decorators.push(
        ApiParam({
          name: param.name,
          type: param.type ?? String,
          description: param.description,
          example: param.example ?? '123e4567-e89b-12d3-a456-426614174000',
        }),
      );
    });
  }

  // Add query parameters if provided
  if (options.queries) {
    options.queries.forEach((query) => {
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

  // Configure response
  if (options.responseSchema) {
    // Custom schema provided
    decorators.push(
      ApiResponse({
        status: HttpStatus.OK,
        description: successMessage,
        schema: options.responseSchema,
      }),
    );
  } else if (options.responseType) {
    // Use provided response type
    decorators.push(
      ApiResponse({
        status: HttpStatus.OK,
        description: successMessage,
        type: options.responseType,
        isArray: options.responseIsArray,
      }),
    );
  } else {
    // Default generic object response
    decorators.push(
      ApiResponse({
        status: HttpStatus.OK,
        description: successMessage,
        schema: {
          type: 'object',
          additionalProperties: true,
        },
      }),
    );
  }

  // Common error responses
  decorators.push(
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Invalid request parameters',
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
