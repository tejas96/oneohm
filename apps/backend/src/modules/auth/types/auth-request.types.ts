/**
 * Typed Request Interfaces for Authentication
 *
 * These interfaces provide type-safe access to `req.user` based on
 * which authentication guard is used.
 *
 * @example
 * // For LocalAuthGuard (login with email/password)
 * async login(@Request() req: LocalAuthRequest) {
 *   req.user // TypeScript knows this is UserEntity
 * }
 *
 * @example
 * // For JwtAuthGuard (protected routes)
 * async protected(@Request() req: JwtAuthRequest) {
 *   req.user // TypeScript knows this is CurrentUserType
 * }
 */

import type { Request } from 'express';

import type { UserEntity } from '../../users/entities/user.entity';

import type { CurrentUserType } from './current-user.type';

/**
 * Request type after LocalAuthGuard
 * LocalStrategy validates email/password and returns full UserEntity
 */
export interface LocalAuthRequest extends Request {
  user: UserEntity;
}

/**
 * Request type after OtpAuthGuard
 * OtpStrategy validates OTP and returns full UserEntity
 */
export interface OtpAuthRequest extends Request {
  user: UserEntity;
}

/**
 * Request type after JwtAuthGuard
 * JwtStrategy extracts payload from JWT and returns CurrentUserType
 */
export interface JwtAuthRequest extends Request {
  user: CurrentUserType;
}
