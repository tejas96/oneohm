import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BomController } from './controllers/bom.controller';
import { BomEntity, BomItemEntity } from './entities';
import { BomRepository } from './repositories/bom.repository';
import { BomService } from './services/bom.service';

@Module({
  imports: [TypeOrmModule.forFeature([BomEntity, BomItemEntity])],
  controllers: [BomController],
  providers: [BomService, BomRepository],
  exports: [BomService],
})
export class BomModule {}
