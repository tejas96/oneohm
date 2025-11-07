/**
 * JWT Payload Interface
 * Represents the data stored in JWT token
 */
export interface JwtPayload {
  sub: string; // User ID
  roles: string[]; // User roles
  iat?: number; // Issued at
  exp?: number; // Expiration time
}
