import { Injectable, Logger } from '@nestjs/common';
import { NotificationSeverity, NotificationType } from '@tejas96/shared/types';

import { FcmService } from './fcm.service';
import { NotificationEntity } from '../entities/notification.entity';
import { NotificationRepository } from '../repositories/notification.repository';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType | string;
  title: string;
  body?: string;
  severity?: NotificationSeverity | string;
  link?: string;
  metadata?: Record<string, unknown>;
  dedupeKey?: string;
}

/**
 * Notification Service
 * Creates and manages in-app notifications.
 * Idempotent on dedupeKey — silently skips duplicate notifications.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly fcmService: FcmService,
  ) {}

  /**
   * Create notification — idempotent on dedupeKey.
   * If dedupeKey already exists for this user, silently returns null.
   */
  async create(input: CreateNotificationInput): Promise<NotificationEntity | null> {
    try {
      if (input.dedupeKey) {
        const exists = await this.notificationRepository.existsByDedupeKey(
          input.userId,
          input.dedupeKey,
        );
        if (exists) return null;
      }

      let notification: NotificationEntity;
      try {
        notification = await this.notificationRepository.create({
          userId: input.userId,
          type: input.type,
          title: input.title,
          body: input.body,
          severity: input.severity ?? NotificationSeverity.INFO,
          link: input.link,
          metadata: input.metadata,
          dedupeKey: input.dedupeKey,
        });
      } catch (dbErr: any) {
        if (dbErr?.code === '23505') {
          this.logger.warn(
            `Duplicate notification creation blocked by unique index for user ${input.userId} and dedupeKey ${input.dedupeKey}`,
          );
          return null;
        }
        throw dbErr;
      }

      try {
        await this.fcmService.sendToUser({
          userId: input.userId,
          title: input.title,
          body: input.body,
          data: {
            notificationId: notification.id,
            type: notification.type,
            severity: notification.severity,
            link: notification.link,
            ...notification.metadata,
          },
        });
      } catch (fcmErr) {
        this.logger.error(
          `FCM push dispatch failed for notification ID ${notification.id} (user: ${input.userId})`,
          fcmErr,
        );
      }

      return notification;
    } catch (err) {
      this.logger.error('Failed to create notification', err);
      return null;
    }
  }

  async list(
    userId: string,
    page = 1,
    limit = 20,
    unreadOnly = false,
  ): Promise<{ notifications: NotificationEntity[]; total: number }> {
    return this.notificationRepository.findByUser(userId, page, limit, unreadOnly);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.getUnreadCount(userId);
  }

  async markRead(id: string, userId: string): Promise<void> {
    return this.notificationRepository.markRead(id, userId);
  }

  async markAllRead(userId: string): Promise<void> {
    return this.notificationRepository.markAllRead(userId);
  }
}
