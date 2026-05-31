import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  AdminIntegrationController,
  MessagingController,
  WhatsappWebhookController,
} from './controllers';
import { ProviderRegistry, ProviderFactory, ProviderResolver } from './core';
import { IntegrationEntity } from './entities';
import { Msg91Provider, WhatsAppBusinessProvider } from './providers-v2';
import { IntegrationRepository } from './repositories';
import { IntegrationService, IntegrationCredentialService } from './services';
import { ConfigModule } from '../../config';

/**
 * Integrations Module
 * Handles all third-party integrations (messaging, payment, storage, etc.)
 * Database-driven, multi-tenant architecture with encrypted credentials
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([IntegrationEntity]),
    ConfigModule,
    DiscoveryModule, // Required for auto-discovery
  ],
  controllers: [AdminIntegrationController, MessagingController, WhatsappWebhookController],
  providers: [
    // Repositories
    IntegrationRepository,

    // Services
    IntegrationCredentialService,
    IntegrationService,

    // Core architecture (decorator-driven)
    ProviderRegistry,
    ProviderFactory,
    ProviderResolver,

    // Provider implementations (auto-discovered via decorators)
    Msg91Provider,
    WhatsAppBusinessProvider,
  ],
  exports: [IntegrationService, ProviderResolver],
})
export class IntegrationsModule {}
