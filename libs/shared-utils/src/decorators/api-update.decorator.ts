import { type Type, applyDecorators, HttpCode, HttpStatus, Put } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

/**
 * API Update Decorator
 * Combines common decorators for PUT/:id endpoints
 *
 * @example
 * @ApiUpdate({
 *   summary: 'Update organization',
 *   responseType: OrganizationResponseDto,
 *   roles: [Role.SUPER_ADMIN, Role.ADMIN],
 * })
 */
export function ApiUpdate<TResponse>(options: {
  summary: string;
  description?: string;
  responseType: Type<TResponse>;
  // roles removed - use @RequirePermission instead
  idParam?: string;
  additionalErrors?: Array<{ status: HttpStatus; description: string }>;
}): MethodDecorator & ClassDecorator {
  const decorators = [
    Put(`:${options.idParam || 'id'}`),
    HttpCode(HttpStatus.OK),
    ApiOperation({
      summary: options.summary,
      description: options.description,
    }),
    ApiParam({
      name: options.idParam || 'id',
      type: String,
      description: `${options.responseType.name.replace('ResponseDto', '')} UUID`,
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Resource updated successfully',
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
