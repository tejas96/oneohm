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

@Module({
  imports: [TypeOrmModule.forFeature([IntegrationEntity]), ConfigModule, DiscoveryModule],
  controllers: [AdminIntegrationController, MessagingController, WhatsappWebhookController],
  providers: [
    IntegrationRepository,
    IntegrationCredentialService,
    IntegrationService,
    ProviderRegistry,
    ProviderFactory,
    ProviderResolver,
    Msg91Provider,
    WhatsAppBusinessProvider,
  ],
  exports: [IntegrationService, ProviderResolver],
})
export class IntegrationsModule {}
