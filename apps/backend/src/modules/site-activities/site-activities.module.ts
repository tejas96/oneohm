import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SiteActivityController } from './controllers/site-activity.controller';
import { SiteActivityEntity } from './entities/site-activity.entity';
import { SiteActivityRepository } from './repositories/site-activity.repository';
import { SiteActivityService } from './services/site-activity.service';
import { CustomersModule } from '../customers/customers.module';

@Module({
  imports: [TypeOrmModule.forFeature([SiteActivityEntity]), forwardRef(() => CustomersModule)],
  controllers: [SiteActivityController],
  providers: [SiteActivityService, SiteActivityRepository],
  exports: [SiteActivityService, SiteActivityRepository],
})
export class SiteActivitiesModule {}
