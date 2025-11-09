import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ResellerCommissionController } from './controllers/reseller-commission.controller';
import { ResellerController } from './controllers/reseller.controller';
import { ResellerCommissionEntity } from './entities/reseller-commission.entity';
import { ResellerEntity } from './entities/reseller.entity';
import { ResellerCommissionRepository } from './repositories/reseller-commission.repository';
import { ResellerRepository } from './repositories/reseller.repository';
import { ResellerCommissionService } from './services/reseller-commission.service';
import { ResellerService } from './services/reseller.service';

/**
 * Resellers Module
 * Manages reseller partners and their commissions
 */
@Module({
  imports: [TypeOrmModule.forFeature([ResellerEntity, ResellerCommissionEntity])],
  controllers: [ResellerController, ResellerCommissionController],
  providers: [
    ResellerService,
    ResellerRepository,
    ResellerCommissionService,
    ResellerCommissionRepository,
  ],
  exports: [
    ResellerService,
    ResellerRepository,
    ResellerCommissionService,
    ResellerCommissionRepository,
  ],
})
export class ResellersModule {}
