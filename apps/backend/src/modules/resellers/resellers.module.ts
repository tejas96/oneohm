import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersModule } from '../users/users.module';
import { ResellerCommissionController } from './controllers/reseller-commission.controller';
import { ResellerController } from './controllers/reseller.controller';
import { ResellerCommissionEntity } from './entities/reseller-commission.entity';
import { ResellerProfileEntity } from './entities/reseller-profile.entity';
import { ResellerCommissionRepository } from './repositories/reseller-commission.repository';
import { ResellerProfileRepository } from './repositories/reseller-profile.repository';
import { ResellerCommissionService } from './services/reseller-commission.service';
import { ResellerService } from './services/reseller.service';

/**
 * Resellers Module
 * Manages reseller partner profiles and their commissions
 * Imports UsersModule for ProfileService (multi-org access verification)
 */
@Module({
  imports: [TypeOrmModule.forFeature([ResellerProfileEntity, ResellerCommissionEntity]), forwardRef(() => UsersModule)],
  controllers: [ResellerController, ResellerCommissionController],
  providers: [
    ResellerService,
    ResellerProfileRepository,
    ResellerCommissionService,
    ResellerCommissionRepository,
  ],
  exports: [
    ResellerService,
    ResellerProfileRepository,
    ResellerCommissionService,
    ResellerCommissionRepository,
  ],
})
export class ResellersModule {}
