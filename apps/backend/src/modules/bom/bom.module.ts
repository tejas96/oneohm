import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { InventoryModule } from '../inventory/inventory.module';
import { BomItemsController } from './controllers/bom-items.controller';
import { BomController } from './controllers/bom.controller';
import { BomChangeEntity, BomEntity, BomItemEntity, BomItemSerialEntity } from './entities';
import { BomChangeRepository } from './repositories/bom-change.repository';
import { BomRepository } from './repositories/bom.repository';
import { BomService } from './services/bom.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([BomEntity, BomItemEntity, BomChangeEntity, BomItemSerialEntity]),
    forwardRef(() => InventoryModule),
  ],
  controllers: [BomController, BomItemsController],
  providers: [BomService, BomRepository, BomChangeRepository],
  exports: [BomService, BomChangeRepository],
})
export class BomModule {}
