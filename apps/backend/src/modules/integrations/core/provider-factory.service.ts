import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { IntegrationProvider } from '@oneohm-epc/shared-types';
import axios, { AxiosInstance } from 'axios';

import {
  getProviderMetadata,
  getCredentialMetadata,
  getConfigMetadata,
  getHttpClientMetadata,
} from '../decorators';
import { IntegrationEntity } from '../entities';
import type { IBaseIntegration } from '../interfaces';
import { ProviderRegistry } from './provider-registry.service';
import { IntegrationCredentialService } from '../services/integration-credential.service';

/**
 * Provider Factory Service
 * Dynamically creates provider instances with dependency injection
 *
 * Implements the Factory Pattern with automatic dependency injection
 */
@Injectable()
export class ProviderFactory {
  private readonly logger = new Logger(ProviderFactory.name);

  constructor(
    private readonly providerRegistry: ProviderRegistry,
    private readonly credentialService: IntegrationCredentialService,
  ) {}

  /**
   * Create a provider instance from database configuration
   * Automatically injects credentials, config, and HTTP client
   */
  async create(
    providerName: IntegrationProvider,
    integrationEntity: IntegrationEntity,
  ): Promise<IBaseIntegration> {
    // 1. Get provider class from registry
    const ProviderClass = this.providerRegistry.get(providerName);

    if (!ProviderClass) {
      throw new BadRequestException(
        `Provider ${providerName} is not registered. Available providers: ${this.providerRegistry.getAll().join(', ')}`,
      );
    }

    this.logger.debug(`Creating provider instance: ${providerName}`);

    // 2. Create empty instance
    const instance = new ProviderClass() as any;

    // 3. Decrypt credentials
    const decryptedCredentials = this.credentialService.decrypt(
      integrationEntity.credentials.encrypted,
    );

    // 4. Inject credentials
    this.injectCredentials(instance, ProviderClass, decryptedCredentials);

    // 5. Inject configuration
    this.injectConfiguration(instance, ProviderClass, integrationEntity.configuration || {});

    // 6. Setup HTTP client
    this.injectHttpClient(instance, ProviderClass, decryptedCredentials);

    this.logger.debug(`✅ Provider instance created: ${providerName}`);

    return instance as IBaseIntegration;
  }

  /**
   * Inject credentials into provider instance
   */
  private injectCredentials(
    instance: any,
    ProviderClass: any,
    credentials: Record<string, any>,
  ): void {
    const metadata = getCredentialMetadata(ProviderClass);

    if (!metadata || Object.keys(metadata).length === 0) {
      return;
    }

    for (const [propertyKey, meta] of Object.entries(metadata)) {
      const value = credentials[meta.key];

      // Validation
      if (meta.required && (value === undefined || value === null)) {
        throw new BadRequestException(
          `Required credential '${meta.key}' is missing for ${ProviderClass.name}`,
        );
      }

      // Inject value
      instance[propertyKey] = value ?? meta.default;
      this.logger.debug(`  ✓ Injected credential: ${propertyKey} ← ${meta.key}`);
    }
  }

  /**
   * Inject configuration into provider instance
   */
  private injectConfiguration(
    instance: any,
    ProviderClass: any,
    configuration: Record<string, any>,
  ): void {
    const metadata = getConfigMetadata(ProviderClass);

    if (!metadata || Object.keys(metadata).length === 0) {
      return;
    }

    for (const [propertyKey, meta] of Object.entries(metadata)) {
      const value = configuration[meta.key];

      // Validation
      if (meta.required && (value === undefined || value === null)) {
        throw new BadRequestException(
          `Required config '${meta.key}' is missing for ${ProviderClass.name}`,
        );
      }

      // Inject value
      instance[propertyKey] = value ?? meta.default;
      this.logger.debug(`  ✓ Injected config: ${propertyKey} ← ${meta.key}`);
    }
  }

  /**
   * Setup and inject HTTP client into provider instance
   */
  private injectHttpClient(
    instance: any,
    ProviderClass: any,
    credentials: Record<string, any>,
  ): void {
    const httpMetadata = getHttpClientMetadata(ProviderClass);

    if (!httpMetadata) {
      return;
    }

    const { propertyKey, options } = httpMetadata;

    // Get base URL from @IntegrationProvider metadata
    const providerMetadata = getProviderMetadata(ProviderClass);

    if (!providerMetadata?.baseUrl) {
      this.logger.warn(
        `No baseUrl found in @IntegrationProvider metadata for ${ProviderClass.name}`,
      );
      return;
    }

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.additionalHeaders,
    };

    // Add auth header if specified
    if (options.authHeader) {
      const authValue = credentials[options.authHeader];
      if (authValue) {
        headers[options.authHeader] = authValue;
      } else {
        this.logger.warn(
          `Auth credential '${options.authHeader}' not found for HTTP client in ${ProviderClass.name}`,
        );
      }
    }

    // Create HTTP client
    const httpClient: AxiosInstance = axios.create({
      baseURL: providerMetadata.baseUrl,
      headers,
      timeout: options.timeout || 30000,
    });

    // Inject into instance
    instance[propertyKey] = httpClient;
    this.logger.debug(`  ✓ Injected HTTP client: ${propertyKey} → ${providerMetadata.baseUrl}`);
  }
}
