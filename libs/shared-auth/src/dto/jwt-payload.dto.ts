import { Role } from '../enums/role.enum';

/**
 * JWT Payload Interface
 * Represents the data stored in JWT token
 */
export interface JwtPayload {
  sub: string; // User ID
  email: string;
  organizationId: string;
  roles: Role[];
  iat?: number; // Issued at
  exp?: number; // Expiration time
}
