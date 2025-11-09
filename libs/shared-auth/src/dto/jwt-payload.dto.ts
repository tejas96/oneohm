/**
 * JWT Payload Interface
 * Represents the data stored in JWT token
 */
export interface JwtPayload {
  sub: string; // User ID
  organizationId: string; // Organization ID for multi-tenancy
  roles: string[]; // User roles
  iat?: number; // Issued at
  exp?: number; // Expiration time
}

/**
 * Current User Interface
 * Represents the authenticated user from JWT
 */
export interface CurrentUser {
  id: string;
  organizationId: string;
  roles: string[];
}
