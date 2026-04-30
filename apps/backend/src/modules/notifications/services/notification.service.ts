import { Injectable, Logger } from '@nestjs/common';
import { NotificationSeverity, NotificationType } from '@oneohm-epc/shared/types';

import { NotificationEntity } from '../entities/notification.entity';
import { NotificationRepository } from '../repositories/notification.repository';

export interface CreateNotificationInput {
  organizationId: string;
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

  constructor(private readonly notificationRepository: NotificationRepository) {}

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

      return await this.notificationRepository.create({
        organizationId: input.organizationId,
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        severity: input.severity ?? NotificationSeverity.INFO,
        link: input.link,
        metadata: input.metadata,
        dedupeKey: input.dedupeKey,
      });
    } catch (err) {
      this.logger.error('Failed to create notification', err);
      return null;
    }
  }

  async list(
    userId: string,
    organizationId: string,
    page = 1,
    limit = 20,
    unreadOnly = false,
  ): Promise<{ notifications: NotificationEntity[]; total: number }> {
    return this.notificationRepository.findByUser(userId, organizationId, page, limit, unreadOnly);
  }

  async getUnreadCount(userId: string, organizationId: string): Promise<number> {
    return this.notificationRepository.getUnreadCount(userId, organizationId);
  }

  async markRead(id: string, userId: string): Promise<void> {
    return this.notificationRepository.markRead(id, userId);
  }

  async markAllRead(userId: string, organizationId: string): Promise<void> {
    return this.notificationRepository.markAllRead(userId, organizationId);
  }
}
