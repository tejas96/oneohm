import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminIntegrationController, MessagingController } from './controllers';
import { IntegrationEntity } from './entities';
import { IntegrationProviderFactory } from './factories';
import { IntegrationRepository } from './repositories';
import { IntegrationService, IntegrationCredentialService } from './services';
import { ConfigModule } from '../../config';

/**
 * Integrations Module
 * Handles all third-party integrations (messaging, payment, storage, etc.)
 * Database-driven, multi-tenant architecture with encrypted credentials
 */
@Module({
  imports: [TypeOrmModule.forFeature([IntegrationEntity]), ConfigModule],
  controllers: [AdminIntegrationController, MessagingController],
  providers: [
    IntegrationRepository,
    IntegrationCredentialService,
    IntegrationProviderFactory,
    IntegrationService,
  ],
  exports: [IntegrationService],
})
export class IntegrationsModule {}
