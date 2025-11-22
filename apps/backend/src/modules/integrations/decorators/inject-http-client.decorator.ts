import 'reflect-metadata';

/**
 * HTTP Client Injection Options
 */
export interface InjectHttpClientOptions {
  authHeader?: string; // e.g., 'authkey' - will use credential with this name
  timeout?: number;
  additionalHeaders?: Record<string, string>;
}

/**
 * HTTP Client Metadata
 */
export interface HttpClientMetadata {
  propertyKey: string;
  options: InjectHttpClientOptions;
}

/**
 * @InjectHttpClient Decorator
 * Automatically configures and injects an Axios HTTP client
 * 
 * Usage:
 * ```typescript
 * @InjectHttpClient({
 *   authHeader: 'authkey', // Uses this.authKey credential
 *   timeout: 30000,
 * })
 * protected readonly http!: AxiosInstance;
 * ```
 * 
 * The decorator stores metadata that the ProviderFactory uses to:
 * 1. Create Axios instance with baseURL from @IntegrationProvider
 * 2. Add auth header from credentials
 * 3. Configure timeout and other options
 * 4. Inject into the property
 */
export function InjectHttpClient(options: InjectHttpClientOptions = {}) {
  return function (target: any, propertyKey: string) {
    // Store metadata
    const metadata: HttpClientMetadata = {
      propertyKey,
      options,
    };

    Reflect.defineMetadata('integration:http', metadata, target.constructor);
  };
}

/**
 * Get HTTP client metadata from a class
 */
export function getHttpClientMetadata(target: any): HttpClientMetadata | undefined {
  return Reflect.getMetadata('integration:http', target);
}

