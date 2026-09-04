import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { InventoryModule } from '../inventory/inventory.module';
import { MasterDataModule } from '../master-data/master-data.module';
import { ProjectsModule } from '../projects/projects.module';
import { BomItemsController } from './controllers/bom-items.controller';
import { BomController } from './controllers/bom.controller';
import { ProjectBomController } from './controllers/project-bom.controller';
import { BomChangeEntity, BomEntity, BomItemEntity, BomItemSerialEntity } from './entities';
import { BomChangeRepository } from './repositories/bom-change.repository';
import { BomRepository } from './repositories/bom.repository';
import { BomBaselineService } from './services/bom-baseline.service';
import { BomEditService } from './services/bom-edit.service';
import { BomReadService } from './services/bom-read.service';
import { BomSerialService } from './services/bom-serial.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([BomEntity, BomItemEntity, BomChangeEntity, BomItemSerialEntity]),
    InventoryModule,
    // For PricingService — the only place that knows how per_unit, per_watt
    // and per_kw differ. BOM never computes a price itself.
    MasterDataModule,
    // For ProjectTeamGuard, which ProjectBomController puts on every route.
    // forwardRef both ways because ProjectsModule imports this module back for
    // BomBaselineService and BomReadService — a BOM belongs to a project and a
    // project owns a BOM, so the cycle is in the domain, not an accident.
    forwardRef(() => ProjectsModule),
    // QuoteVersionEntity, which BomBaselineService reads, needs no forFeature:
    // it goes through the shared DataSource, which knows every entity.
  ],
  controllers: [BomController, BomItemsController, ProjectBomController],
  providers: [
    BomRepository,
    BomChangeRepository,
    BomReadService,
    BomEditService,
    BomBaselineService,
    BomSerialService,
  ],
  // BomEditService is exported for applyRebaseline, which drives the same four
  // operations with source = 'office'.
  //
  // BomBaselineService and BomReadService are exported for ProjectService:
  // seeding a new project's BOM at conversion, the idempotency check that
  // guards it, and the report providers' panel serials.
  exports: [
    BomReadService,
    BomEditService,
    BomBaselineService,
    BomSerialService,
    BomChangeRepository,
  ],
})
export class BomModule {}
