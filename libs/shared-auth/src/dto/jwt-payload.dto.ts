/**
 * JWT Payload Interface
 * Represents the data stored in JWT token
 * 
 * New IAM System: Includes permissions in JWT for fast, stateless authorization
 */
export interface JwtPayload {
  sub: string; // User ID
  organizationId: string; // Organization ID for multi-tenancy
  roles: string[]; // User roles (for backward compatibility)
  permissions: string[]; // NEW: User permissions (e.g., ['customers:read', 'customers:create'])
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
  permissions: string[]; // NEW: User permissions from JWT
}
