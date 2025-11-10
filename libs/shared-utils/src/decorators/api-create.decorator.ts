import { type Type, applyDecorators, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { type Role, Roles } from '@oneohm-epc/shared-auth';

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
  roles?: Role[];
  additionalErrors?: Array<{ status: HttpStatus; description: string }>;
}): MethodDecorator & ClassDecorator {
  const decorators = [
    Post(),
    HttpCode(HttpStatus.CREATED),
    ...(options.roles ? [Roles(...options.roles)] : []),
    ApiOperation({
      summary: options.summary,
      description: options.description,
    }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Resource created successfully',
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
