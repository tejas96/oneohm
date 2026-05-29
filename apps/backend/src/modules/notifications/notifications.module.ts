import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NotificationController } from './controllers/notification.controller';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationRepository } from './repositories/notification.repository';
import { FcmService } from './services/fcm.service';
import { NotificationService } from './services/notification.service';
import { PermissionGuard } from '../iam/guards/permission.guard';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationEntity]), forwardRef(() => UsersModule)],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationRepository, FcmService, PermissionGuard],
  exports: [NotificationService],
})
export class NotificationsModule {}
