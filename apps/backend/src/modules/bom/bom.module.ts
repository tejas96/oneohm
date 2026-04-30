import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PermissionGuard } from '../iam/guards/permission.guard';
import { InventoryModule } from '../inventory/inventory.module';
import { BomController } from './controllers/bom.controller';
import { BomEntity, BomItemEntity } from './entities';
import { BomRepository } from './repositories/bom.repository';
import { BomService } from './services/bom.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([BomEntity, BomItemEntity]),
    forwardRef(() => InventoryModule),
  ],
  controllers: [BomController],
  providers: [BomService, BomRepository, PermissionGuard],
  exports: [BomService],
})
export class BomModule {}
