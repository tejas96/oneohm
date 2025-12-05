import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  OrganizationController,
  OrganizationPublicController,
  OrganizationSettingController,
} from './controllers';
import { OrganizationSettingEntity } from './entities/organization-setting.entity';
import { OrganizationEntity } from './entities/organization.entity';
import { OrganizationSettingRepository } from './repositories/organization-setting.repository';
import { OrganizationRepository } from './repositories/organization.repository';
import { OrganizationService } from './services/organization.service';
import { OrganizationSettingService } from './services/organization-setting.service';
import { IamModule } from '../iam/iam.module';
import { UsersModule } from '../users/users.module';

/**
 * Organizations Module
 * Manages organization entities, settings, and platform admin operations
 *
 * Features:
 * - Organization CRUD (platform_admin role required)
 * - Default role seeding on organization creation
 * - Super admin assignment and invitation
 * - Organization settings management
 * - Public organization search (no auth)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([OrganizationEntity, OrganizationSettingEntity]),
    forwardRef(() => IamModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [
    OrganizationController,
    OrganizationPublicController,
    OrganizationSettingController,
  ],
  providers: [
    OrganizationRepository,
    OrganizationSettingRepository,
    OrganizationService,
    OrganizationSettingService,
  ],
  exports: [
    OrganizationRepository,
    OrganizationSettingRepository,
    OrganizationService,
    OrganizationSettingService,
  ],
})
export class OrganizationsModule {}
