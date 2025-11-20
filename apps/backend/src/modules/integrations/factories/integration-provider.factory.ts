import { Injectable, Logger } from '@nestjs/common';
import { IntegrationProvider, IntegrationCategory } from '@oneohm-epc/shared-types';

import { type IBaseIntegration, type IMessagingProvider } from '../interfaces';
import type { IWhatsAppBusinessConfig } from '../interfaces/integration-config.interface';
import { WhatsAppBusinessProvider } from '../providers/whatsapp-business.provider';

/**
 * Integration Provider Factory
 * Dynamically builds provider instances from database configuration
 */
@Injectable()
export class IntegrationProviderFactory {
  private readonly logger = new Logger(IntegrationProviderFactory.name);

  /**
   * Build a provider instance based on category, provider type, and config
   */
  build<T extends IBaseIntegration>(
    category: IntegrationCategory,
    provider: IntegrationProvider,
    config: Record<string, unknown>,
  ): T {
    this.logger.debug(`Building provider: ${category}/${provider}`);

    try {
      // Route to appropriate factory method based on category
      switch (category) {
        case IntegrationCategory.MESSAGING:
          return this.buildMessagingProvider(provider, config) as unknown as T;

        case IntegrationCategory.SMS:
        case IntegrationCategory.EMAIL:
        case IntegrationCategory.VOICE:
          throw new Error(`Integration category ${category} is not yet implemented`);

        default:
          throw new Error(`Unsupported integration category: ${String(category)}`);
      }
    } catch (error) {
      this.logger.error(`Failed to build provider ${category}/${provider}`, error);
      throw error;
    }
  }

  /**
   * Build messaging provider
   */
  private buildMessagingProvider(
    provider: IntegrationProvider,
    config: Record<string, unknown>,
  ): IMessagingProvider {
    switch (provider) {
      case IntegrationProvider.WHATSAPP_BUSINESS:
        return new WhatsAppBusinessProvider(config as unknown as IWhatsAppBusinessConfig);

      case IntegrationProvider.TWILIO:
        throw new Error(`Messaging provider ${provider} is not yet implemented`);

      default:
        throw new Error(`Unsupported messaging provider: ${String(provider)}`);
    }
  }
}
