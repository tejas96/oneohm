/**
 * Consumer Notification Events — Typed event payloads for consumer-facing push notifications
 *
 * Each event class carries the minimum data needed by the ConsumerNotificationListener
 * to build a notification and resolve the recipient userId.
 *
 * Layer: modules/notifications/events
 */

// ─── Event Name Constants ────────────────────────────────────────────────
export const CONSUMER_EVENTS = {
  PROPERTY_CREATED: 'consumer.property.created',
  QUOTATION_CREATED: 'consumer.quotation.created',
  PROJECT_ONBOARDED: 'consumer.project.onboarded',
  PROJECT_COMPLETED: 'consumer.project.completed',
  CHAT_MESSAGE: 'consumer.chat.message',
} as const;

// ─── Event Payloads ──────────────────────────────────────────────────────

export class PropertyCreatedEvent {
  constructor(
    public readonly propertyId: string,
    public readonly customerId: string,
    public readonly propertyName?: string,
  ) {}
}

export class QuotationCreatedEvent {
  constructor(
    public readonly quoteId: string,
    public readonly propertyId: string,
    public readonly customerId: string,
    public readonly quoteNumber: string,
  ) {}
}

export class ProjectOnboardedEvent {
  constructor(
    public readonly projectId: string,
    public readonly propertyId: string,
    public readonly projectName: string,
    public readonly projectNumber: string,
  ) {}
}

export class ProjectCompletedEvent {
  constructor(
    public readonly projectId: string,
    public readonly propertyId: string,
    public readonly projectName: string,
  ) {}
}

export class ChatMessageEvent {
  constructor(
    public readonly projectId: string,
    public readonly propertyId: string,
    public readonly messageId: string,
    public readonly senderUserId: string,
    public readonly messagePreview: string,
  ) {}
}
