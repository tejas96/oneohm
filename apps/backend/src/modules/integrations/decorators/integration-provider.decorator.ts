import 'reflect-metadata';
import {
  IntegrationProvider as IntegrationProviderEnum,
  IntegrationCategory,
} from '@oneohm-epc/shared-types';

/**
 * Integration Provider Metadata
 * Defines provider characteristics and requirements
 */
export interface IntegrationProviderMetadata {
  provider: IntegrationProviderEnum;
  category: IntegrationCategory;
  displayName: string;
  description: string;
  baseUrl: string;
  icon?: string;
}

/**
 * @IntegrationProvider Decorator
 * Marks a class as an integration provider and stores metadata
 *
 * Usage:
 * ```typescript
 * @IntegrationProvider({
 *   provider: IntegrationProvider.MSG91,
 *   category: IntegrationCategory.MESSAGING,
 *   displayName: 'MSG91',
 *   description: 'MSG91 SMS and OTP service',
 *   baseUrl: 'https://api.msg91.com/api/v5',
 * })
 * export class Msg91Provider { }
 * ```
 */
export function IntegrationProvider(metadata: IntegrationProviderMetadata) {
  return function <T extends new (...args: unknown[]) => object>(target: T) {
    // Store metadata on the class
    Reflect.defineMetadata('integration:provider', metadata, target);

    // Store provider name for registry lookup
    Reflect.defineMetadata('integration:provider:name', metadata.provider, target);

    return target;
  };
}

/**
 * Get provider metadata from a class
 */
export function getProviderMetadata(target: object): IntegrationProviderMetadata | undefined {
  return Reflect.getMetadata('integration:provider', target);
}

/**
 * Get provider name from a class
 */
export function getProviderName(target: object): IntegrationProviderEnum | undefined {
  return Reflect.getMetadata('integration:provider:name', target);
}
