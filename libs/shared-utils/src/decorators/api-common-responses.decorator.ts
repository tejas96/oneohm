import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

/**
 * ApiCommonResponses
 * 
 * Applies common error responses to endpoints.
 * Reduces boilerplate in controller decorators.
 * 
 * @example
 * @ApiCommonResponses()
 * @Get(':id')
 * async findOne(@Param('id') id: string) {
 *   // ...
 * }
 */
export const ApiCommonResponses = (): ReturnType<typeof applyDecorators> => {
  return applyDecorators(
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Bad Request - Invalid input data',
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Unauthorized - Invalid or missing authentication token',
    }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'Forbidden - Insufficient permissions',
    }),
    ApiResponse({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      description: 'Internal Server Error',
    }),
  );
};

/**
 * ApiNotFoundResponse
 * 
 * Applies 404 Not Found response.
 */
export const ApiNotFoundResponse = (resourceName?: string): ReturnType<typeof ApiResponse> => {
  return ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: resourceName
      ? `${resourceName} not found`
      : 'Resource not found',
  });
};

/**
 * ApiConflictResponse
 * 
 * Applies 409 Conflict response.
 */
export const ApiConflictResponse = (description?: string): ReturnType<typeof ApiResponse> => {
  return ApiResponse({
    status: HttpStatus.CONFLICT,
    description: description || 'Conflict - Resource already exists or operation conflicts with current state',
  });
};

/**
 * ApiValidationErrorResponse
 * 
 * Applies 422 Unprocessable Entity response for validation errors.
 */
export const ApiValidationErrorResponse = (): ReturnType<typeof ApiResponse> => {
  return ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'Unprocessable Entity - Validation failed',
    schema: {
      properties: {
        statusCode: { type: 'number', example: 422 },
        message: { type: 'string', example: 'Validation failed' },
        errorCode: { type: 'string', example: 'VALIDATION_ERROR' },
        details: {
          type: 'object',
          properties: {
            validationErrors: {
              type: 'object',
              example: {
                email: ['Email must be valid'],
                password: ['Password must be at least 8 characters'],
              },
            },
          },
        },
        timestamp: { type: 'string', example: '2024-11-15T10:30:00.000Z' },
      },
    },
  });
};

