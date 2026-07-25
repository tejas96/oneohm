import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { IamModule } from '../iam/iam.module';
import { DiscomController } from './controllers/discom.controller';
import { DiscomEntity } from './entities/discom.entity';
import { DiscomRepository } from './repositories/discom.repository';
import { DiscomService } from './services/discom.service';

@Module({
  imports: [TypeOrmModule.forFeature([DiscomEntity]), IamModule],
  controllers: [DiscomController],
  providers: [DiscomService, DiscomRepository],
  exports: [DiscomService, DiscomRepository],
})
export class DiscomsModule {}
