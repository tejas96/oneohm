import 'reflect-metadata';

/**
 * Credential Injection Options
 */
export interface InjectCredentialOptions {
  required?: boolean;
  default?: any;
}

/**
 * Credential Metadata
 */
export interface CredentialMetadata {
  key: string;
  required: boolean;
  default?: any;
}

/**
 * @InjectCredential Decorator
 * Automatically injects credential values from database configuration
 *
 * Usage:
 * ```typescript
 * @InjectCredential('authKey', { required: true })
 * private readonly authKey!: string;
 *
 * @InjectCredential('senderId')
 * private readonly senderId?: string;
 * ```
 *
 * The decorator stores metadata that the ProviderFactory uses to:
 * 1. Extract the credential from integration.credentials.{key}
 * 2. Validate if required
 * 3. Inject into the property
 */
export function InjectCredential(credentialKey: string, options: InjectCredentialOptions = {}) {
  return function (target: any, propertyKey: string) {
    // Get existing metadata or create new
    const existingMetadata: Record<string, CredentialMetadata> =
      Reflect.getMetadata('integration:credentials', target.constructor) || {};

    // Add this property's mapping
    existingMetadata[propertyKey] = {
      key: credentialKey,
      required: options.required ?? false,
      default: options.default,
    };

    // Store back
    Reflect.defineMetadata('integration:credentials', existingMetadata, target.constructor);
  };
}

/**
 * Get credential metadata from a class
 */
export function getCredentialMetadata(target: any): Record<string, CredentialMetadata> {
  return Reflect.getMetadata('integration:credentials', target) || {};
}
