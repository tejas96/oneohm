import { applyDecorators, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { type Role, Roles } from '@oneohm-epc/shared-auth';

/**
 * API Delete Decorator
 * Combines common decorators for DELETE/:id endpoints
 *
 * @example
 * @ApiDelete({
 *   summary: 'Delete organization',
 *   roles: [Role.SUPER_ADMIN],
 * })
 */
export function ApiDelete(options: {
  summary: string;
  description?: string;
  roles?: Role[];
  idParam?: string;
  additionalErrors?: Array<{ status: HttpStatus; description: string }>;
}): MethodDecorator & ClassDecorator {
  const decorators = [
    Delete(`:${options.idParam || 'id'}`),
    HttpCode(HttpStatus.NO_CONTENT),
    ...(options.roles ? [Roles(...options.roles)] : []),
    ApiOperation({
      summary: options.summary,
      description: options.description,
    }),
    ApiParam({
      name: options.idParam || 'id',
      type: String,
      description: 'Resource UUID',
    }),
    ApiResponse({
      status: HttpStatus.NO_CONTENT,
      description: 'Resource deleted successfully',
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
