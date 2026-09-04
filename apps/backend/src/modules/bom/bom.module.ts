import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { InventoryModule } from '../inventory/inventory.module';
import { MasterDataModule } from '../master-data/master-data.module';
import { BomEditController } from './controllers/bom-edit.controller';
import { BomItemsController } from './controllers/bom-items.controller';
import { BomController } from './controllers/bom.controller';
import { BomChangeEntity, BomEntity, BomItemEntity, BomItemSerialEntity } from './entities';
import { BomChangeRepository } from './repositories/bom-change.repository';
import { BomRepository } from './repositories/bom.repository';
import { BomBaselineService } from './services/bom-baseline.service';
import { BomEditService } from './services/bom-edit.service';
import { BomReadService } from './services/bom-read.service';
import { BomService } from './services/bom.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([BomEntity, BomItemEntity, BomChangeEntity, BomItemSerialEntity]),
    InventoryModule,
    // For PricingService — the only place that knows how per_unit, per_watt
    // and per_kw differ. BOM never computes a price itself.
    MasterDataModule,
  ],
  controllers: [BomController, BomItemsController, BomEditController],
  providers: [
    BomService,
    BomReadService,
    BomEditService,
    BomBaselineService,
    BomRepository,
    BomChangeRepository,
  ],
  // BomEditService is exported for Task 15's applyRebaseline, which drives the
  // same four operations with source = 'office'.
  //
  // BomBaselineService and BomReadService are exported for ProjectService:
  // seeding a new project's BOM at conversion, and the idempotency check that
  // guards it.
  exports: [
    BomService,
    BomReadService,
    BomEditService,
    BomBaselineService,
    BomChangeRepository,
  ],
})
export class BomModule {}
