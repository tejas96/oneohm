import { type Type, applyDecorators, HttpCode, HttpStatus, Patch, Put } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

/**
 * API Update Decorator
 * Combines common decorators for PUT/:id or PATCH/:id endpoints
 *
 * Features:
 * - Supports both PUT (full update) and PATCH (partial update)
 * - Standard ID parameter
 * - BAD_REQUEST and NOT_FOUND error responses
 * - Custom path support
 *
 * @example
 * // Basic PUT usage
 * @ApiUpdate({
 *   summary: 'Update employee',
 *   responseType: EmployeeResponseDto,
 * })
 *
 * @example
 * // PATCH with custom path
 * @ApiUpdate({
 *   summary: 'Update employee contact info',
 *   responseType: EmployeeResponseDto,
 *   method: 'PATCH',
 *   path: ':id/contact',
 * })
 */
export function ApiUpdate<TResponse>(options: {
  /** Route summary for Swagger */
  summary: string;
  /** Route description for Swagger */
  description?: string;
  /** Response DTO type */
  responseType: Type<TResponse>;
  /** HTTP method: PUT (default) or PATCH */
  method?: 'PUT' | 'PATCH';
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
  const method = options.method || 'PUT';
  const successMessage = options.successMessage || 'Resource updated successfully';

  const httpMethodDecorator = method === 'PATCH' ? Patch(path) : Put(path);

  const decorators: Array<MethodDecorator | ClassDecorator> = [
    httpMethodDecorator,
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
      status: HttpStatus.BAD_REQUEST,
      description: 'Invalid input data',
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
