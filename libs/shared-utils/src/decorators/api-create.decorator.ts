import { type Type, applyDecorators, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

/**
 * API Create Decorator
 * Combines common decorators for POST/Create endpoints
 *
 * @example
 * @ApiCreate({
 *   summary: 'Create a new organization',
 *   responseType: OrganizationResponseDto,
 *   roles: [Role.SUPER_ADMIN, Role.ADMIN],
 * })
 */
export function ApiCreate<TResponse>(options: {
  summary: string;
  description?: string;
  responseType: Type<TResponse>;
  path?: string; // Optional custom path (e.g., 'login', 'otp/request')
  statusCode?: HttpStatus; // Optional custom status code (default: 201 CREATED)
  successMessage?: string; // Optional custom success message
  additionalErrors?: Array<{ status: HttpStatus; description: string }>;
}): MethodDecorator & ClassDecorator {
  const statusCode = options.statusCode || HttpStatus.CREATED;
  const successMessage = options.successMessage || 'Resource created successfully';
  
  const decorators = [
    Post(options.path || ''),
    HttpCode(statusCode),
    ApiOperation({
      summary: options.summary,
      description: options.description,
    }),
    ApiResponse({
      status: statusCode,
      description: successMessage,
      type: options.responseType,
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Invalid input data',
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
