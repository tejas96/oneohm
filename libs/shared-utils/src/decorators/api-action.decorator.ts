import { type Type, applyDecorators, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

/**
 * API Action Decorator
 * Combines common decorators for POST/:id/action endpoints (activate, deactivate, etc.)
 *
 * Features:
 * - Action path appended to :id (e.g., POST /:id/activate)
 * - Standard ID parameter
 * - NOT_FOUND error response
 * - Custom status code support
 *
 * @example
 * // Basic action
 * @ApiAction({
 *   path: 'activate',
 *   summary: 'Activate employee',
 *   responseType: EmployeeResponseDto,
 * })
 *
 * @example
 * // Action with custom status
 * @ApiAction({
 *   path: 'status',
 *   summary: 'Update employee status',
 *   responseType: EmployeeResponseDto,
 *   additionalErrors: [
 *     { status: HttpStatus.CONFLICT, description: 'Status transition not allowed' },
 *   ],
 * })
 */
export function ApiAction<TResponse>(options: {
  /** Action path (e.g., 'activate', 'deactivate', 'status') */
  path: string;
  /** Route summary for Swagger */
  summary: string;
  /** Route description for Swagger */
  description?: string;
  /** Response DTO type */
  responseType: Type<TResponse>;
  /** ID parameter name (defaults to 'id') */
  idParam?: string;
  /** HTTP status code (defaults to 200 OK) */
  statusCode?: HttpStatus;
  /** Success message for Swagger response description */
  successMessage?: string;
  /** Additional error responses */
  additionalErrors?: Array<{ status: HttpStatus; description: string }>;
}): MethodDecorator & ClassDecorator {
  const idParam = options.idParam || 'id';
  const statusCode = options.statusCode || HttpStatus.OK;
  const successMessage = options.successMessage || 'Action completed successfully';

  const decorators: Array<MethodDecorator | ClassDecorator> = [
    Post(`:${idParam}/${options.path}`),
    HttpCode(statusCode),
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
      status: statusCode,
      description: successMessage,
      type: options.responseType,
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Invalid action parameters',
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
