import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OrganizationSettingController } from './controllers/organization-setting.controller';
import { OrganizationController } from './controllers/organization.controller';
import { OrganizationSettingEntity } from './entities/organization-setting.entity';
import { OrganizationEntity } from './entities/organization.entity';
import { OrganizationSettingRepository } from './repositories/organization-setting.repository';
import { OrganizationRepository } from './repositories/organization.repository';
import { OrganizationSettingService } from './services/organization-setting.service';
import { OrganizationService } from './services/organization.service';

/**
 * Organizations Module
 * Manages organization and organization settings
 */
@Module({
  imports: [TypeOrmModule.forFeature([OrganizationEntity, OrganizationSettingEntity])],
  controllers: [OrganizationController, OrganizationSettingController],
  providers: [
    OrganizationRepository,
    OrganizationSettingRepository,
    OrganizationService,
    OrganizationSettingService,
  ],
  exports: [OrganizationRepository, OrganizationService, OrganizationSettingService],
})
export class OrganizationsModule {}
