import { SetMetadata } from '@nestjs/common';

export const FEATURE_KEY = 'feature';

export interface FeatureMetadata {
  featureCode: string;
  minimumAccess?: 'read_only' | 'limited' | 'full';
}

/**
 * Require Feature Decorator
 * Checks if user has access to a feature at the specified level
 * 
 * @param featureCode - Feature code (e.g., 'customers', 'inventory')
 * @param options - Optional configuration
 * @param options.minimumAccess - Minimum access level required
 * 
 * @example
 * // Any access to customers feature
 * @RequireFeature('customers')
 * @Controller('customers')
 * export class CustomerController { ... }
 * 
 * @example
 * // Read-only access required
 * @RequireFeature('customers', { minimumAccess: 'read_only' })
 * @Get()
 * async findAll() { ... }
 * 
 * @example
 * // Full access required
 * @RequireFeature('customers', { minimumAccess: 'full' })
 * @Delete(':id')
 * async remove() { ... }
 */
export const RequireFeature = (
  featureCode: string,
  options?: {
    minimumAccess?: 'read_only' | 'limited' | 'full';
  },
): MethodDecorator & ClassDecorator => {
  const metadata: FeatureMetadata = {
    featureCode,
    minimumAccess: options?.minimumAccess,
  };

  return SetMetadata(FEATURE_KEY, metadata);
};


