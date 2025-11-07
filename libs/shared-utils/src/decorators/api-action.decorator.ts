import { applyDecorators, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { Role, Roles } from '@oneohm-epc/shared-auth';

/**
 * API Action Decorator
 * Combines common decorators for POST/:id/action endpoints (activate, deactivate, etc.)
 *
 * @example
 * @ApiAction({
 *   path: 'activate',
 *   summary: 'Activate organization',
 *   responseType: OrganizationResponseDto,
 *   roles: [Role.SUPER_ADMIN, Role.ADMIN],
 * })
 */
export function ApiAction(options: {
  path: string;
  summary: string;
  description?: string;
  responseType: any;
  roles?: Role[];
  idParam?: string;
}) {
  const decorators = [
    Post(`:${options.idParam || 'id'}/${options.path}`),
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
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Action completed successfully',
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
