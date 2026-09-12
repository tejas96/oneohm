import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectDataSource } from '@nestjs/typeorm';
import { type TaskWhatsappRecord } from '@tejas96/shared/types';
import { DataSource } from 'typeorm';

import {
  WHATSAPP_EVENTS,
  WhatsappMessageStatusEvent,
  type WhatsappStatusError,
} from '../../integrations/events/whatsapp.events';

function describeWhatsappError(errors: WhatsappStatusError[]): string {
  const first = errors[0];
  if (!first) return 'WhatsApp reported a failure';
  const title = first.title ?? first.message ?? `WhatsApp error ${first.code ?? ''}`.trim();
  const details = first.error_data?.details;
  return details && details !== title ? `${title}: ${details}` : title;
}

/**
 * Moves a customer step update along as Meta reports it. Statuses for messages
 * this app did not log (quotes, OTPs) match no row and change nothing.
 *
 * Order rules: delivered never overwrites read; failed never overwrites
 * delivered or read, because Meta can report them out of order.
 */
@Injectable()
export class WhatsappStatusListener {
  private readonly logger = new Logger(WhatsappStatusListener.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @OnEvent(WHATSAPP_EVENTS.MESSAGE_STATUS, { async: true })
  async handle(event: WhatsappMessageStatusEvent): Promise<void> {
    const at =
      event.timestamp && /^\d+$/.test(event.timestamp)
        ? new Date(Number(event.timestamp) * 1000)
        : new Date();

    try {
      if (event.status === 'delivered') {
        await this.apply(
          event.providerMessageId,
          { status: 'delivered', deliveredAt: at.toISOString() },
          `customer_whatsapp ->> 'status' NOT IN ('delivered', 'read')`,
        );
      } else if (event.status === 'read') {
        await this.apply(
          event.providerMessageId,
          { status: 'read', readAt: at.toISOString() },
          `customer_whatsapp ->> 'status' <> 'read'`,
        );
      } else if (event.status === 'failed') {
        await this.apply(
          event.providerMessageId,
          { status: 'failed', reason: describeWhatsappError(event.errors) },
          `customer_whatsapp ->> 'status' NOT IN ('delivered', 'read')`,
        );
      }
      // 'sent' is already recorded by the send itself.
    } catch (error) {
      this.logger.error(
        `Could not record WhatsApp ${event.status} for message ${event.providerMessageId}`,
        error,
      );
    }
  }

  /**
   * Merges Meta's outcome into the task carrying that message id. The partial
   * index on the id means this reads only tasks that were actually messaged,
   * and a status for someone else's message (a quote, an OTP) matches nothing.
   */
  private async apply(
    providerMessageId: string,
    patch: Partial<TaskWhatsappRecord>,
    guard: string,
  ): Promise<void> {
    await this.dataSource.query(
      `UPDATE project_tasks
          SET customer_whatsapp = customer_whatsapp || $2::jsonb
        WHERE customer_whatsapp ->> 'providerMessageId' = $1
          AND ${guard}`,
      [providerMessageId, JSON.stringify({ ...patch, updatedAt: new Date().toISOString() })],
    );
  }
}
