import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LookupController } from './controllers/lookup.controller';
import { LookupEntity } from './entities/lookup.entity';
import { LookupRepository } from './repositories/lookup.repository';
import { LookupService } from './services/lookup.service';

@Module({
  imports: [TypeOrmModule.forFeature([LookupEntity])],
  controllers: [LookupController],
  providers: [LookupService, LookupRepository],
  exports: [LookupService, LookupRepository],
})
export class LookupsModule {}
