import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IntegrationCategory, IntegrationProvider } from '@tejas96/shared/types';

import { IntegrationEntity } from '../entities';
import type { IBaseIntegration } from '../interfaces';
import { IntegrationRepository } from '../repositories';
import { ProviderFactory } from './provider-factory.service';

/**
 * Resolves active integrations (app-scoped) and creates configured provider instances.
 */
@Injectable()
export class ProviderResolver {
  private readonly logger = new Logger(ProviderResolver.name);

  constructor(
    private readonly integrationRepository: IntegrationRepository,
    private readonly providerFactory: ProviderFactory,
  ) {}

  async resolve(
    category: IntegrationCategory,
    providerName?: IntegrationProvider,
  ): Promise<IBaseIntegration> {
    this.logger.debug(
      `Resolving provider for category: ${category}, provider: ${providerName || 'auto'}`,
    );

    const integration = await this.findActiveIntegration(category, providerName);

    if (!integration) {
      const providerMsg = providerName ? ` with provider ${providerName}` : '';
      throw new NotFoundException(
        `No active ${category} integration configured${providerMsg}. Contact your administrator.`,
      );
    }

    const provider = await this.providerFactory.create(
      integration.provider as IntegrationProvider,
      integration,
    );

    this.logger.debug(`Resolved provider: ${integration.provider}`);

    return provider;
  }

  async getActiveIntegration(
    category: IntegrationCategory,
    providerName?: IntegrationProvider,
  ): Promise<IntegrationEntity | null> {
    return this.findActiveIntegration(category, providerName);
  }

  async hasIntegration(
    category: IntegrationCategory,
    providerName?: IntegrationProvider,
  ): Promise<boolean> {
    const integration = await this.findActiveIntegration(category, providerName);
    return !!integration;
  }

  private async findActiveIntegration(
    category: IntegrationCategory,
    providerName?: IntegrationProvider,
  ): Promise<IntegrationEntity | null> {
    if (providerName) {
      const integration = await this.integrationRepository.findActiveByProviderAndCategory(
        providerName,
        category,
      );

      const duplicates = await this.integrationRepository.findAllActiveByProviderAndCategory(
        providerName,
        category,
      );
      if (duplicates.length > 1) {
        this.logger.warn(
          `Multiple active ${providerName}/${category} integrations found (${duplicates.length}). Using newest.`,
        );
      }

      return integration;
    }

    const integrations = await this.integrationRepository.findAllActiveByCategory(category);
    if (integrations.length > 1) {
      this.logger.warn(
        `Multiple active ${category} integrations found (${integrations.length}). Using newest.`,
      );
    }
    return integrations[0] || null;
  }
}
