import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IntegrationCategory, IntegrationProvider } from '@oneohm-epc/shared-types';

import type { IBaseIntegration } from '../interfaces';
import { IntegrationRepository } from '../repositories';
import { ProviderFactory } from './provider-factory.service';

/**
 * Provider Resolver Service
 * Resolves and creates provider instances for specific organizations
 * 
 * Implements the Resolver Pattern - finds active integration and creates provider
 */
@Injectable()
export class ProviderResolver {
  private readonly logger = new Logger(ProviderResolver.name);

  constructor(
    private readonly integrationRepository: IntegrationRepository,
    private readonly providerFactory: ProviderFactory,
  ) {}

  /**
   * Resolve and create a provider for an organization
   * Finds the active integration and returns a configured provider instance
   * 
   * @param organizationId - Organization ID
   * @param category - Integration category (e.g., MESSAGING)
   * @param providerName - Optional specific provider (e.g., MSG91)
   * @returns Configured provider instance
   */
  async resolve(
    organizationId: string,
    category: IntegrationCategory,
    providerName?: IntegrationProvider,
  ): Promise<IBaseIntegration> {
    this.logger.debug(
      `Resolving provider for org ${organizationId}, category: ${category}, provider: ${providerName || 'auto'}`,
    );

    // Find active integration
    const integration = await this.findActiveIntegration(
      organizationId,
      category,
      providerName,
    );

    if (!integration) {
      throw new NotFoundException(
        `No active ${category} integration found for organization ${organizationId}${providerName ? ` with provider ${providerName}` : ''}`,
      );
    }

    // Create provider instance
    const provider = await this.providerFactory.create(
      integration.provider as IntegrationProvider,
      integration,
    );

    this.logger.debug(
      `✅ Resolved provider: ${integration.provider} for org ${organizationId}`,
    );

    return provider;
  }

  /**
   * Check if an organization has an active integration
   */
  async hasIntegration(
    organizationId: string,
    category: IntegrationCategory,
    providerName?: IntegrationProvider,
  ): Promise<boolean> {
    const integration = await this.findActiveIntegration(
      organizationId,
      category,
      providerName,
    );
    return !!integration;
  }

  /**
   * Find active integration from database
   */
  private async findActiveIntegration(
    organizationId: string,
    category: IntegrationCategory,
    providerName?: IntegrationProvider,
  ) {
    if (providerName) {
      // Find specific provider
      return this.integrationRepository.findByOrgProviderCategory(
        organizationId,
        providerName,
        category,
      );
    } 
      // Find any active provider in category
      const integrations = await this.integrationRepository.findByCategoryAndOrg(
        category,
        organizationId,
      );
      return integrations[0] || null; // Return first or null
    
  }
}

