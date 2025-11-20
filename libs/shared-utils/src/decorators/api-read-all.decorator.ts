import { type Type, applyDecorators, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { type Role, Roles } from '@oneohm-epc/shared-auth';

/**
 * API Read All Decorator
 * Combines common decorators for GET/ (list) endpoints with pagination
 *
 * @example
 * @ApiReadAll({
 *   summary: 'Get all organizations',
 *   responseType: OrganizationResponseDto,
 *   roles: [Role.SUPER_ADMIN, Role.ADMIN],
 * })
 */
export function ApiReadAll<TResponse>(options: {
  summary: string;
  description?: string;
  responseType: Type<TResponse>;
  roles?: Role[];
  additionalQueries?: Array<{
    name: string;
    required?: boolean;
    type?: Type<unknown>;
    description?: string;
     
    enum?: any;
  }>;
}): MethodDecorator & ClassDecorator {
  const decorators = [
    Get(),
    HttpCode(HttpStatus.OK),
    ...(options.roles ? [Roles(...options.roles)] : []),
    ApiOperation({
      summary: options.summary,
      description: options.description,
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      description: 'Number of items per page',
      example: 10,
    }),
    ApiQuery({
      name: 'offset',
      required: false,
      type: Number,
      description: 'Number of items to skip',
      example: 0,
    }),
  ];

  // Add additional query parameters if provided
  if (options.additionalQueries) {
    options.additionalQueries.forEach((query) => {
      decorators.push(
        ApiQuery({
          name: query.name,
          required: query.required || false,
          type: query.type || String,
          description: query.description,
          enum: query.enum,
        }),
      );
    });
  }

  decorators.push(
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Resources retrieved successfully',
      schema: {
        properties: {
          items: {
            type: 'array',
            items: { $ref: `#/components/schemas/${options.responseType.name}` },
          },
          total: { type: 'number', example: 100 },
          page: { type: 'number', example: 1 },
          limit: { type: 'number', example: 10 },
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Unauthorized - Invalid or missing token',
    }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'Forbidden - Insufficient permissions',
    }),
  );

  return applyDecorators(...decorators);
}
