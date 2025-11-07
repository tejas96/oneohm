import { applyDecorators, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { Role, Roles } from '@oneohm-epc/shared-auth';

/**
 * API Read One Decorator
 * Combines common decorators for GET/:id endpoints
 *
 * @example
 * @ApiReadOne({
 *   summary: 'Get organization by ID',
 *   responseType: OrganizationResponseDto,
 *   roles: [Role.SUPER_ADMIN, Role.ADMIN],
 *   idParam: 'id',
 * })
 */
export function ApiReadOne(options: {
  summary: string;
  description?: string;
  responseType: any;
  roles?: Role[];
  idParam?: string;
}) {
  const decorators = [
    Get(`:${options.idParam || 'id'}`),
    HttpCode(HttpStatus.OK),
    ...(options.roles ? [Roles(...options.roles)] : []),
    ApiOperation({
      summary: options.summary,
      description: options.description,
    }),
    ApiParam({
      name: options.idParam || 'id',
      type: String,
      description: `${options.responseType.name.replace('ResponseDto', '')} UUID`,
      example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Resource retrieved successfully',
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

  return applyDecorators(...decorators);
}
