import 'reflect-metadata';

/**
 * Configuration Injection Options
 */
export interface InjectConfigOptions {
  required?: boolean;
  default?: unknown;
}

/**
 * Configuration Metadata
 */
export interface ConfigMetadata {
  key: string;
  required: boolean;
  default?: unknown;
}

/**
 * @InjectConfig Decorator
 * Automatically injects configuration values from database configuration
 *
 * Usage:
 * ```typescript
 * @InjectConfig('otpTemplateId', { required: true })
 * private readonly otpTemplateId!: string;
 *
 * @InjectConfig('otpLength', { default: 6 })
 * private readonly otpLength!: number;
 * ```
 *
 * The decorator stores metadata that the ProviderFactory uses to:
 * 1. Extract the config from integration.configuration.{key}
 * 2. Validate if required
 * 3. Use default if not provided
 * 4. Inject into the property
 */
export function InjectConfig(configKey: string, options: InjectConfigOptions = {}) {
  return function (target: object, propertyKey: string) {
    // Get existing metadata or create new
    const existingMetadata: Record<string, ConfigMetadata> =
      Reflect.getMetadata('integration:config', target.constructor) || {};

    // Add this property's mapping
    existingMetadata[propertyKey] = {
      key: configKey,
      required: options.required ?? false,
      default: options.default,
    };

    // Store back
    Reflect.defineMetadata('integration:config', existingMetadata, target.constructor);
  };
}

/**
 * Get configuration metadata from a class
 */
export function getConfigMetadata(target: object): Record<string, ConfigMetadata> {
  return Reflect.getMetadata('integration:config', target) || {};
}
