import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NotificationController } from './controllers/notification.controller';
import { NotificationEntity } from './entities/notification.entity';
import { ConsumerNotificationListener } from './listeners/consumer-notification.listener';
import { NotificationRepository } from './repositories/notification.repository';
import { FcmService } from './services/fcm.service';
import { NotificationService } from './services/notification.service';
import { TaskWhatsappService } from './services/task-whatsapp.service';
import { IntegrationsModule } from '../integrations/integrations.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationEntity]),
    forwardRef(() => UsersModule),
    // Sends the customer WhatsApp updates. IntegrationsModule imports neither
    // this module nor the projects module, so there is no cycle.
    IntegrationsModule,
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationRepository,
    FcmService,
    ConsumerNotificationListener,
    TaskWhatsappService,
  ],
  exports: [NotificationService],
})
export class NotificationsModule {}
