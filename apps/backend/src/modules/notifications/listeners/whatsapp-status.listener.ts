import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectDataSource } from '@nestjs/typeorm';
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
        await this.dataSource.query(
          `UPDATE task_whatsapp_messages
              SET status = 'delivered', delivered_at = $2, updated_at = now()
            WHERE provider_message_id = $1 AND status NOT IN ('delivered', 'read')`,
          [event.providerMessageId, at],
        );
      } else if (event.status === 'read') {
        await this.dataSource.query(
          `UPDATE task_whatsapp_messages
              SET status = 'read', read_at = $2, updated_at = now()
            WHERE provider_message_id = $1 AND status <> 'read'`,
          [event.providerMessageId, at],
        );
      } else if (event.status === 'failed') {
        await this.dataSource.query(
          `UPDATE task_whatsapp_messages
              SET status = 'failed', reason = $2, updated_at = now()
            WHERE provider_message_id = $1 AND status NOT IN ('delivered', 'read')`,
          [event.providerMessageId, describeWhatsappError(event.errors)],
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
}
