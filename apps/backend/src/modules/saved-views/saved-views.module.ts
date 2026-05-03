import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SavedViewController } from './controllers/saved-view.controller';
import { SavedViewEntity } from './entities/saved-view.entity';
import { SavedViewRepository } from './repositories/saved-view.repository';
import { SavedViewService } from './services/saved-view.service';
import { PermissionGuard } from '../iam/guards/permission.guard';

@Module({
  imports: [TypeOrmModule.forFeature([SavedViewEntity])],
  controllers: [SavedViewController],
  providers: [SavedViewService, SavedViewRepository, PermissionGuard],
  exports: [SavedViewService, SavedViewRepository],
})
export class SavedViewsModule {}
