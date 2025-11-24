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

/**
 * Type alias for convenience
 */
export type CurrentUserType = CurrentUser;
