import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { IntegrationProvider } from '@tejas96/shared/types';
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
 */
@Injectable()
export class ProviderFactory {
  private readonly logger = new Logger(ProviderFactory.name);

  constructor(
    private readonly providerRegistry: ProviderRegistry,
    private readonly credentialService: IntegrationCredentialService,
  ) {}

  async create(
    providerName: IntegrationProvider,
    integrationEntity: IntegrationEntity,
  ): Promise<IBaseIntegration> {
    const ProviderClass = this.providerRegistry.get(providerName);

    if (!ProviderClass) {
      throw new BadRequestException(
        `Provider ${providerName} is not registered. Available providers: ${this.providerRegistry.getAll().join(', ')}`,
      );
    }

    this.logger.debug(`Creating provider instance: ${providerName}`);

    const instance = new ProviderClass() as unknown as Record<string, unknown>;
    const decryptedCredentials = this.credentialService.decrypt(
      integrationEntity.credentials.encrypted,
    );

    this.injectCredentials(instance, ProviderClass, decryptedCredentials);
    this.injectConfiguration(instance, ProviderClass, integrationEntity.configuration || {});
    this.injectHttpClient(instance, ProviderClass, decryptedCredentials);

    this.logger.debug(`Provider instance created: ${providerName}`);

    return instance as unknown as IBaseIntegration;
  }

  private injectCredentials(
    instance: Record<string, unknown>,
    ProviderClass: new (...args: unknown[]) => object,
    credentials: Record<string, unknown>,
  ): void {
    const metadata = getCredentialMetadata(ProviderClass);

    if (!metadata || Object.keys(metadata).length === 0) {
      return;
    }

    for (const [propertyKey, meta] of Object.entries(metadata)) {
      const value = credentials[meta.key];

      if (meta.required && (value === undefined || value === null)) {
        throw new BadRequestException(
          `Required credential '${meta.key}' is missing for ${ProviderClass.name}`,
        );
      }

      instance[propertyKey] = value ?? meta.default;
      this.logger.debug(`  Injected credential: ${propertyKey} <- ${meta.key}`);
    }
  }

  private injectConfiguration(
    instance: Record<string, unknown>,
    ProviderClass: new (...args: unknown[]) => object,
    configuration: Record<string, unknown>,
  ): void {
    const metadata = getConfigMetadata(ProviderClass);

    if (!metadata || Object.keys(metadata).length === 0) {
      return;
    }

    for (const [propertyKey, meta] of Object.entries(metadata)) {
      const value = configuration[meta.key];

      if (meta.required && (value === undefined || value === null)) {
        throw new BadRequestException(
          `Required config '${meta.key}' is missing for ${ProviderClass.name}`,
        );
      }

      instance[propertyKey] = value ?? meta.default;
      this.logger.debug(`  Injected config: ${propertyKey} <- ${meta.key}`);
    }
  }

  private injectHttpClient(
    instance: Record<string, unknown>,
    ProviderClass: new (...args: unknown[]) => object,
    credentials: Record<string, unknown>,
  ): void {
    const httpMetadata = getHttpClientMetadata(ProviderClass);

    if (!httpMetadata) {
      return;
    }

    const { propertyKey, options } = httpMetadata;
    const providerMetadata = getProviderMetadata(ProviderClass);

    if (!providerMetadata?.baseUrl) {
      this.logger.warn(
        `No baseUrl found in @IntegrationProvider metadata for ${ProviderClass.name}`,
      );
      return;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.additionalHeaders,
    };

    if (options.authBearerCredential) {
      const token = credentials[options.authBearerCredential];
      if (typeof token === 'string' && token) {
        headers.Authorization = `Bearer ${token}`;
      } else {
        this.logger.warn(
          `Bearer credential '${options.authBearerCredential}' not found for ${ProviderClass.name}`,
        );
      }
    } else if (options.authHeader) {
      const authValue = credentials[options.authHeader];
      if (typeof authValue === 'string' && authValue) {
        headers[options.authHeader] = authValue;
      } else if (authValue) {
        this.logger.warn(
          `Auth credential '${options.authHeader}' is not a string for ${ProviderClass.name}`,
        );
      } else {
        this.logger.warn(
          `Auth credential '${options.authHeader}' not found for HTTP client in ${ProviderClass.name}`,
        );
      }
    }

    const httpClient: AxiosInstance = axios.create({
      baseURL: providerMetadata.baseUrl,
      headers,
      timeout: options.timeout || 30000,
    });

    instance[propertyKey] = httpClient;
    this.logger.debug(`  Injected HTTP client: ${propertyKey} -> ${providerMetadata.baseUrl}`);
  }
}
