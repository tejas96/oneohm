import { applyDecorators, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

/**
 * API Delete Decorator
 * Combines common decorators for DELETE/:id endpoints
 *
 * Features:
 * - Standard ID parameter
 * - NO_CONTENT (204) response for successful deletion
 * - NOT_FOUND error response
 * - Custom path support for nested routes
 *
 * @example
 * // Basic usage
 * @ApiDelete({
 *   summary: 'Delete employee',
 * })
 *
 * @example
 * // Soft delete with custom path
 * @ApiDelete({
 *   summary: 'Archive employee',
 *   path: ':id/archive',
 *   successMessage: 'Employee archived successfully',
 * })
 */
export function ApiDelete(options: {
  /** Route summary for Swagger */
  summary: string;
  /** Route description for Swagger */
  description?: string;
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
  const successMessage = options.successMessage || 'Resource deleted successfully';

  const decorators: Array<MethodDecorator | ClassDecorator> = [
    Delete(path),
    HttpCode(HttpStatus.NO_CONTENT),
    ApiOperation({
      summary: options.summary,
      description: options.description,
    }),
    ApiParam({
      name: idParam,
      type: String,
      description: 'Resource UUID',
      example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    ApiResponse({
      status: HttpStatus.NO_CONTENT,
      description: successMessage,
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
