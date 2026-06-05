import type { JwtAuthRequest } from '../../auth/types';
import type { CustomerProfileEntity } from '../../customers/entities/customer-profile.entity';

/**
 * Request type after JwtAuthGuard + CustomerOwnershipGuard.
 * customerProfile is resolved from JWT user id + organization context.
 */
export interface ConsumerAuthRequest extends JwtAuthRequest {
  customerProfile: CustomerProfileEntity;
  organizationId: string;
}
