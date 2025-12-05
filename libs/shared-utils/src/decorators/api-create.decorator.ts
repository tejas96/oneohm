import { type Type, applyDecorators, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

/**
 * API Create Decorator
 * Combines common decorators for POST/Create endpoints
 *
 * Features:
 * - Custom path support (e.g., 'login', 'otp/request')
 * - Custom status code (defaults to 201 CREATED)
 * - Custom success message
 * - BAD_REQUEST error response
 *
 * @example
 * // Basic create
 * @ApiCreate({
 *   summary: 'Create a new employee',
 *   responseType: EmployeeResponseDto,
 * })
 *
 * @example
 * // Login endpoint (POST /auth/login with 200 OK)
 * @ApiCreate({
 *   path: 'login',
 *   summary: 'User login with email/password',
 *   responseType: LoginResponseDto,
 *   statusCode: HttpStatus.OK,
 *   successMessage: 'Login successful',
 *   additionalErrors: [
 *     { status: HttpStatus.UNAUTHORIZED, description: 'Invalid credentials' },
 *   ],
 * })
 *
 * @example
 * // Nested create
 * @ApiCreate({
 *   path: 'profiles',
 *   summary: 'Create user profile',
 *   responseType: ProfileResponseDto,
 * })
 */
export function ApiCreate<TResponse>(options: {
  /** Route summary for Swagger */
  summary: string;
  /** Route description for Swagger */
  description?: string;
  /** Response DTO type */
  responseType: Type<TResponse>;
  /** Custom path (e.g., 'login', 'otp/request') - defaults to '' */
  path?: string;
  /** HTTP status code (default: 201 CREATED) */
  statusCode?: HttpStatus;
  /** Success message for Swagger response description */
  successMessage?: string;
  /** Additional error responses */
  additionalErrors?: Array<{ status: HttpStatus; description: string }>;
}): MethodDecorator & ClassDecorator {
  const statusCode = options.statusCode || HttpStatus.CREATED;
  const successMessage = options.successMessage || 'Resource created successfully';

  const decorators: Array<MethodDecorator | ClassDecorator> = [
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
