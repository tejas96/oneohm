import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { InventoryModule } from '../inventory/inventory.module';
import { BomItemsController } from './controllers/bom-items.controller';
import { BomController } from './controllers/bom.controller';
import { BomChangeEntity, BomEntity, BomItemEntity, BomItemSerialEntity } from './entities';
import { BomChangeRepository } from './repositories/bom-change.repository';
import { BomRepository } from './repositories/bom.repository';
import { BomReadService } from './services/bom-read.service';
import { BomService } from './services/bom.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([BomEntity, BomItemEntity, BomChangeEntity, BomItemSerialEntity]),
    InventoryModule,
  ],
  controllers: [BomController, BomItemsController],
  providers: [BomService, BomReadService, BomRepository, BomChangeRepository],
  exports: [BomService, BomReadService, BomChangeRepository],
})
export class BomModule {}
