/**
 * Consumer Notification Listener
 *
 * Handles all consumer-facing push notification events.
 * Uses @InjectDataSource() for user resolution to avoid circular module dependencies
 * (same pattern as LowStockAlertService).
 *
 * Layer: modules/notifications/listeners
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectDataSource } from '@nestjs/typeorm';
import { NotificationSeverity, NotificationType } from '@tejas96/shared/types';
import { DataSource } from 'typeorm';

import {
  CONSUMER_EVENTS,
  ChatMessageEvent,
  ProjectCompletedEvent,
  ProjectOnboardedEvent,
  PropertyCreatedEvent,
  QuotationCreatedEvent,
} from '../events/consumer-notification.events';
import { NotificationService } from '../services/notification.service';

@Injectable()
export class ConsumerNotificationListener {
  private readonly logger = new Logger(ConsumerNotificationListener.name);

  constructor(
    private readonly notificationService: NotificationService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  // ─── Event Handlers ──────────────────────────────────────────────────

  @OnEvent(CONSUMER_EVENTS.PROPERTY_CREATED, { async: true })
  async handlePropertyCreated(event: PropertyCreatedEvent): Promise<void> {
    try {
      const userId = await this.resolveConsumerUserId(event.customerId);
      if (!userId) {
        this.logger.debug(
          `No userId found for customer ${event.customerId} — skipping notification`,
        );
        return;
      }

      const propertyLabel = event.propertyName || 'your property';

      await this.notificationService.create({
        userId,
        type: NotificationType.PROPERTY_CREATED,
        title: 'Property Registered ✅',
        body: `Your property "${propertyLabel}" has been registered successfully.`,
        severity: NotificationSeverity.INFO,
        link: `/consumer/properties`,
        metadata: {
          routeType: 'HOME_TAB',
          propertyId: event.propertyId,
        },
        dedupeKey: `property-created:${event.propertyId}`,
      });

      this.logger.log(`📱 Property notification sent → user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to send property-created notification`, error);
    }
  }

  @OnEvent(CONSUMER_EVENTS.QUOTATION_CREATED, { async: true })
  async handleQuotationCreated(event: QuotationCreatedEvent): Promise<void> {
    try {
      const userId = await this.resolveConsumerUserId(event.customerId);
      if (!userId) {
        this.logger.debug(
          `No userId found for customer ${event.customerId} — skipping notification`,
        );
        return;
      }

      await this.notificationService.create({
        userId,
        type: NotificationType.QUOTATION_CREATED,
        title: 'New Quotation Ready 📋',
        body: `A quotation (${event.quoteNumber}) has been prepared for your property.`,
        severity: NotificationSeverity.INFO,
        link: `/consumer/quotations/${event.quoteId}`,
        metadata: {
          routeType: 'QUOTATION_DETAIL',
          quotationId: event.quoteId,
          propertyId: event.propertyId,
        },
        dedupeKey: `quotation-sent:${event.quoteId}`,
      });

      this.logger.log(`📱 Quotation notification sent → user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to send quotation-created notification`, error);
    }
  }

  @OnEvent(CONSUMER_EVENTS.PROJECT_ONBOARDED, { async: true })
  async handleProjectOnboarded(event: ProjectOnboardedEvent): Promise<void> {
    try {
      const { userId } = await this.resolveConsumerUserIdFromProperty(event.propertyId);
      if (!userId) {
        this.logger.debug(
          `No userId found for property ${event.propertyId} — skipping notification`,
        );
        return;
      }

      await this.notificationService.create({
        userId,
        type: NotificationType.PROJECT_ONBOARDED,
        title: 'Project Started! 🎉',
        body: `Your solar installation project (${event.projectNumber}) is now active.`,
        severity: NotificationSeverity.INFO,
        link: `/consumer/projects/${event.projectId}`,
        metadata: {
          routeType: 'PROJECTS_TAB',
          projectId: event.projectId,
        },
        dedupeKey: `project-onboarded:${event.projectId}`,
      });

      this.logger.log(`📱 Project-onboarded notification sent → user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to send project-onboarded notification`, error);
    }
  }

  @OnEvent(CONSUMER_EVENTS.PROJECT_COMPLETED, { async: true })
  async handleProjectCompleted(event: ProjectCompletedEvent): Promise<void> {
    try {
      this.logger.debug(
        `handleProjectCompleted listener triggered. event=${JSON.stringify(event)}`,
      );
      const { userId, customerId } = await this.resolveConsumerUserIdFromProperty(event.propertyId);
      this.logger.debug(
        `resolveConsumerUserIdFromProperty result for propertyId ${event.propertyId}: userId=${userId}, customerId=${customerId}`,
      );
      if (!userId) {
        this.logger.warn(
          `No userId found for property ${event.propertyId} (customerId: ${customerId}) — skipping notification`,
        );
        return;
      }

      const notificationResult = await this.notificationService.create({
        userId,
        type: NotificationType.PROJECT_COMPLETED,
        title: 'Project Completed! ✅',
        body: `Your solar installation "${event.projectName}" has been completed successfully.`,
        severity: NotificationSeverity.INFO,
        link: `/consumer/projects/${event.projectId}`,
        metadata: {
          routeType: 'PROJECTS_TAB',
          projectId: event.projectId,
        },
        dedupeKey: `project-completed:${event.projectId}`,
      });

      this.logger.debug(`notificationService.create result: ${JSON.stringify(notificationResult)}`);

      this.logger.log(`📱 Project-completed notification sent → user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to send project-completed notification`, error);
    }
  }

  @OnEvent(CONSUMER_EVENTS.CHAT_MESSAGE, { async: true })
  async handleChatMessage(event: ChatMessageEvent): Promise<void> {
    try {
      const { userId } = await this.resolveConsumerUserIdFromProperty(event.propertyId);
      if (!userId) {
        this.logger.debug(
          `No userId found for property ${event.propertyId} — skipping notification`,
        );
        return;
      }

      const senderName = await this.resolveSenderName(event.senderUserId);

      await this.notificationService.create({
        userId,
        type: NotificationType.CHAT_MESSAGE,
        title: `New Message from ${senderName}`,
        body: event.messagePreview,
        severity: NotificationSeverity.INFO,
        link: `/consumer/projects/${event.projectId}/chat`,
        metadata: {
          routeType: 'PROJECT_CHAT',
          projectId: event.projectId,
        },
        dedupeKey: `chat-message:${event.messageId}`,
      });

      this.logger.log(`📱 Chat-message notification sent → user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to send chat-message notification`, error);
    }
  }

  // ─── Private Resolvers ────────────────────────────────────────────────

  /**
   * Resolve consumer userId from customerId.
   * Uses raw SQL via DataSource to avoid circular module dependency.
   */
  private async resolveConsumerUserId(customerId: string): Promise<string | null> {
    const rows = await this.dataSource.query(
      `SELECT user_id AS "userId" FROM customer_profiles WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [customerId],
    );
    return (rows[0]?.userId as string) ?? null;
  }

  /**
   * Resolve consumer userId from propertyId (property → customer → userId).
   * Single-query join to avoid N+1.
   */
  private async resolveConsumerUserIdFromProperty(
    propertyId: string,
  ): Promise<{ userId: string | null; customerId: string | null }> {
    const rows = await this.dataSource.query(
      `SELECT cp.user_id AS "userId", prop.customer_id AS "customerId"
       FROM customer_properties prop
       INNER JOIN customer_profiles cp ON cp.id = prop.customer_id AND cp.deleted_at IS NULL
       WHERE prop.id = $1 AND prop.deleted_at IS NULL
       LIMIT 1`,
      [propertyId],
    );
    return {
      userId: (rows[0]?.userId as string) ?? null,
      customerId: (rows[0]?.customerId as string) ?? null,
    };
  }

  /**
   * Resolve display name for a sender userId.
   */
  private async resolveSenderName(userId: string): Promise<string> {
    const rows = await this.dataSource.query(
      `SELECT first_name AS "firstName", last_name AS "lastName" FROM users WHERE id = $1 LIMIT 1`,
      [userId],
    );
    const name = [rows[0]?.firstName, rows[0]?.lastName].filter(Boolean).join(' ');
    return name || 'Team Member';
  }
}
