import { Injectable, Logger, Type, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { IntegrationProvider } from '@oneohm-epc/shared-types';

import { getProviderName } from '../decorators';
import type { IBaseIntegration } from '../interfaces';

/**
 * Provider Registry Service
 * Auto-discovers and registers all @IntegrationProvider decorated classes
 *
 * Implements the Registry Pattern for provider management
 */
@Injectable()
export class ProviderRegistry implements OnModuleInit {
  private readonly logger = new Logger(ProviderRegistry.name);
  private readonly providers = new Map<IntegrationProvider, Type<IBaseIntegration>>();

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
  ) {}

  /**
   * Auto-discover providers on module initialization
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('🔍 Auto-discovering integration providers...');
    await this.discoverProviders();
    this.logger.log(`✅ Registered ${this.providers.size} integration providers`);
  }

  /**
   * Register a provider manually (for testing or explicit registration)
   */
  register(providerName: IntegrationProvider, providerClass: Type<IBaseIntegration>): void {
    if (this.providers.has(providerName)) {
      this.logger.warn(`Provider ${providerName} is already registered. Overwriting...`);
    }

    this.providers.set(providerName, providerClass);
    this.logger.debug(`Registered provider: ${providerName}`);
  }

  /**
   * Get a provider class by name
   */
  get(providerName: IntegrationProvider): Type<IBaseIntegration> | undefined {
    return this.providers.get(providerName);
  }

  /**
   * Check if a provider is registered
   */
  has(providerName: IntegrationProvider): boolean {
    return this.providers.has(providerName);
  }

  /**
   * Get all registered provider names
   */
  getAll(): IntegrationProvider[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get provider count
   */
  count(): number {
    return this.providers.size;
  }

  /**
   * Auto-discover providers using NestJS Discovery Service
   * Scans for classes with @IntegrationProvider decorator
   */
  private async discoverProviders(): Promise<void> {
    // Get all providers (classes) in the application
    const providers = this.discoveryService.getProviders();

    for (const wrapper of providers) {
      const { instance, metatype } = wrapper;

      if (!metatype || !instance) {
        continue;
      }

      // Check if class has @IntegrationProvider metadata
      const providerName = getProviderName(metatype);

      if (providerName) {
        this.register(providerName, metatype as Type<IBaseIntegration>);
      }
    }
  }
}
