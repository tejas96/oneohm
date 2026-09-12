/**
 * One delivery status from Meta's WhatsApp webhook. The webhook only logged
 * these; anything that tracks its own messages (the customer step updates)
 * listens for this instead of the integrations module knowing about it.
 */
export const WHATSAPP_EVENTS = {
  MESSAGE_STATUS: 'whatsapp.message.status',
} as const;

export interface WhatsappStatusError {
  code?: number | string;
  title?: string;
  message?: string;
  error_data?: { details?: string };
}

export class WhatsappMessageStatusEvent {
  constructor(
    public readonly providerMessageId: string,
    /** sent, delivered, read or failed */
    public readonly status: string,
    /** Meta's Unix time in seconds, as sent. */
    public readonly timestamp: string | null,
    public readonly errors: WhatsappStatusError[],
  ) {}
}
