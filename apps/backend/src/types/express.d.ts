/**
 * Express Type Declarations for Authentication
 *
 * NOTE: For type-safe request handling, use the typed request interfaces:
 * - LocalAuthRequest: After LocalAuthGuard (req.user is UserEntity)
 * - OtpAuthRequest: After OtpAuthGuard (req.user is UserEntity)
 * - JwtAuthRequest: After JwtAuthGuard (req.user is CurrentUserType)
 *
 * For protected routes, prefer using @CurrentUser() decorator.
 *
 * @see /modules/auth/types/auth-request.types.ts
 */
declare global {
  namespace Express {
    // Base User interface - use typed requests for specific types
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User {}
  }
}

export {};
