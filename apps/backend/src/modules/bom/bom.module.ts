import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { InventoryModule } from '../inventory/inventory.module';
import { BomItemsController } from './controllers/bom-items.controller';
import { BomController } from './controllers/bom.controller';
import { BomEntity, BomItemEntity } from './entities';
import { BomRepository } from './repositories/bom.repository';
import { BomService } from './services/bom.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([BomEntity, BomItemEntity]),
    forwardRef(() => InventoryModule),
  ],
  controllers: [BomController, BomItemsController],
  providers: [BomService, BomRepository],
  exports: [BomService],
})
export class BomModule {}
