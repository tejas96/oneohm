/**
 * JWT Payload Interface
 * Represents the data stored in JWT token
 *
 * New IAM System: Includes permissions in JWT for fast, stateless authorization
 *
 * Note: organizationId is optional since users can belong to multiple organizations via profiles
 */
export interface JwtPayload {
  sub: string; // User ID
  organizationId?: string; // Organization ID for multi-tenancy (optional - use profile context instead)
  roles: string[]; // User roles (for backward compatibility)
  permissions: string[]; // NEW: User permissions (e.g., ['customers:read', 'customers:create'])
  iat?: number; // Issued at
  exp?: number; // Expiration time
}

/**
 * Current User Interface
 * Represents the authenticated user from JWT
 *
 * Note: organizationId is optional since users can belong to multiple organizations via profiles.
 * For organization-specific operations, use the profile context or pass organizationId as a parameter.
 */
export interface CurrentUser {
  id: string;
  organizationId?: string; // Optional - users can belong to multiple orgs
  roles: string[];
  permissions: string[]; // NEW: User permissions from JWT
}
