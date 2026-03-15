import { type Type, applyDecorators, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

/**
 * API Read One Decorator
 * Combines common decorators for GET/:id endpoints
 *
 * Features:
 * - Standard ID parameter with UUID validation hint
 * - Proper response type
 * - NOT_FOUND error response
 * - Custom path support for nested routes
 *
 * @example
 * // Basic usage
 * @ApiReadOne({
 *   summary: 'Get employee by ID',
 *   responseType: EmployeeResponseDto,
 * })
 *
 * @example
 * // With custom path and additional errors
 * @ApiReadOne({
 *   summary: 'Get employee details',
 *   responseType: EmployeeResponseDto,
 *   path: 'details/:id',
 *   additionalErrors: [
 *     { status: HttpStatus.GONE, description: 'Employee has been deleted' },
 *   ],
 * })
 */
export function ApiReadOne<TResponse>(options: {
  /** Route summary for Swagger */
  summary: string;
  /** Route description for Swagger */
  description?: string;
  /** Response DTO type */
  responseType: Type<TResponse>;
  /** Custom path (defaults to ':id') */
  path?: string;
  /** ID parameter name (defaults to 'id') */
  idParam?: string;
  /** Success message for Swagger response description */
  successMessage?: string;
  /** Additional error responses */
  additionalErrors?: Array<{ status: HttpStatus; description: string }>;
}): MethodDecorator & ClassDecorator {
  const idParam = options.idParam || 'id';
  const path = options.path || `:${idParam}`;
  const successMessage = options.successMessage || 'Resource retrieved successfully';

  const decorators: Array<MethodDecorator | ClassDecorator> = [
    Get(path),
    HttpCode(HttpStatus.OK),
    ApiOperation({
      summary: options.summary,
      description: options.description,
    }),
    ApiParam({
      name: idParam,
      type: String,
      description: `${options.responseType.name.replace('ResponseDto', '')} UUID`,
      example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: successMessage,
      type: options.responseType,
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Resource not found',
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Unauthorized - Invalid or missing token',
    }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'Forbidden - Insufficient permissions',
    }),
  ];

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
