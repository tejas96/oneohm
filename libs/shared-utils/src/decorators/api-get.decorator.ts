import { type Type, applyDecorators, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { type Role, Roles } from '@oneohm-epc/shared-auth';

/**
 * API Get Decorator
 * Generic decorator for custom GET endpoints with flexible path and response configuration
 * Suitable for statistics, exports, downloads, aggregations, custom queries, etc.
 *
 * @example
 * // Statistics endpoint
 * @ApiGet({
 *   path: 'statistics/status',
 *   summary: 'Get customer status statistics',
 *   roles: [Role.SUPER_ADMIN, Role.ADMIN],
 * })
 *
 * @example
 * // Export endpoint
 * @ApiGet({
 *   path: 'export',
 *   summary: 'Export customers to CSV',
 *   responseType: String,
 *   roles: [Role.ADMIN],
 * })
 *
 * @example
 * // With query parameters
 * @ApiGet({
 *   path: 'search',
 *   summary: 'Search customers',
 *   responseType: CustomerResponseDto,
 *   roles: [Role.ADMIN],
 *   queries: [{ name: 'query', required: true, type: String, description: 'Search term' }],
 * })
 */
export function ApiGet<TResponse = Record<string, unknown>>(options: {
  path: string;
  summary: string;
  description?: string;
  responseType?: Type<TResponse>;
  responseSchema?: Record<string, unknown>;
  responseIsArray?: boolean;
  roles?: Role[];
  params?: Array<{
    name: string;
    type?: Type<unknown>;
    description?: string;
  }>;
  queries?: Array<{
    name: string;
    required?: boolean;
    type?: Type<unknown>;
    description?: string;
    enum?: string[] | number[] | (string | number)[] | Record<number, string>;
  }>;
}): MethodDecorator & ClassDecorator {
  const decorators = [
    Get(options.path),
    HttpCode(HttpStatus.OK),
    ...(options.roles ? [Roles(...options.roles)] : []),
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
          type: param.type || String,
          description: param.description,
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
          required: query.required || false,
          type: query.type || String,
          description: query.description,
          enum: query.enum,
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
        description: 'Request successful',
        schema: options.responseSchema,
      }),
    );
  } else if (options.responseType) {
    // Use provided response type
    decorators.push(
      ApiResponse({
        status: HttpStatus.OK,
        description: 'Request successful',
        type: options.responseType,
        isArray: options.responseIsArray,
      }),
    );
  } else {
    // Default generic object response
    decorators.push(
      ApiResponse({
        status: HttpStatus.OK,
        description: 'Request successful',
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

  return applyDecorators(...decorators);
}
