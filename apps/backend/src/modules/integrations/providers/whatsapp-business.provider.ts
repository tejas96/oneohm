import { Injectable, Logger } from '@nestjs/common';
import {
  IntegrationProvider,
  IntegrationStatus,
  ITextMessage,
  ITemplateMessage,
  IMediaMessage,
  IMessageResponse,
  IOtpMessage,
  IAlertMessage,
  MessageType,
} from '@oneohm-epc/shared-types';

import type { IMessagingProvider } from '../interfaces';
import type { IWhatsAppBusinessConfig } from '../interfaces/integration-config.interface';

// WhatsApp API Response Types
interface WhatsAppApiResponse {
  messages?: Array<{ id: string }>;
  contacts?: Array<{ wa_id: string }>;
  error?: {
    message: string;
    code: string;
    error_data?: Record<string, unknown>;
  };
  [key: string]: unknown;
}

interface TemplateComponent {
  type: string;
  parameters?: Array<{ type: string; text: string }> | unknown[];
  sub_type?: string;
}

/**
 * WhatsApp Business API Provider
 * Implements messaging via WhatsApp Business API (Meta/Facebook)
 * Accepts dynamic configuration per organization
 */
@Injectable()
export class WhatsAppBusinessProvider implements IMessagingProvider {
  protected readonly logger = new Logger(WhatsAppBusinessProvider.name);

  private readonly apiUrl: string;
  private readonly accessToken: string;
  private readonly phoneNumberId: string;
  private readonly businessAccountId: string;

  constructor(config: IWhatsAppBusinessConfig) {
    this.apiUrl = config.configuration?.apiUrl || 'https://graph.facebook.com/v18.0';
    this.accessToken = config.credentials.accessToken;
    this.phoneNumberId = config.credentials.phoneNumberId;
    this.businessAccountId = config.credentials.businessAccountId || '';
  }

  /**
   * Check if provider is configured
   */
  isConfigured(): boolean {
    return !!(this.apiUrl && this.accessToken && this.phoneNumberId);
  }

  /**
   * Validate credentials by making a test API call
   */
  async validateCredentials(): Promise<{ valid: boolean; error?: string }> {
    try {
      // Test the credentials by fetching phone number details
      const url = `${this.apiUrl}/${this.phoneNumberId}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = (await response.json()) as WhatsAppApiResponse;
        return {
          valid: false,
          error: errorData.error?.message || 'Invalid credentials',
        };
      }

      return { valid: true };
    } catch (error) {
      this.logger.error('Credential validation failed', error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      };
    }
  }

  /**
   * Send a text message
   */
  async sendTextMessage(message: ITextMessage): Promise<IMessageResponse> {
    this.validateMessage(message);

    try {
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: this.formatPhoneNumber(message.to),
        type: 'text',
        text: {
          preview_url: false,
          body: message.body,
        },
      };

      const response = await this.makeApiRequest('messages', payload);

      return {
        messageId: response.messages?.[0]?.id || '',
        status: IntegrationStatus.SENT,
        provider: IntegrationProvider.WHATSAPP_BUSINESS,
        timestamp: new Date(),
        metadata: {
          whatsappMessageId: response.messages?.[0]?.id,
          contactId: response.contacts?.[0]?.wa_id,
        },
      };
    } catch (error) {
      this.logger.error('Failed to send text message', error);
      return this.createErrorResponse(error, 'Send text message');
    }
  }

  /**
   * Send a template message
   */
  async sendTemplateMessage(message: ITemplateMessage): Promise<IMessageResponse> {
    this.validateMessage(message);

    try {
      const components = this.buildTemplateComponents(message.templateParameters || {});

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: this.formatPhoneNumber(message.to),
        type: 'template',
        template: {
          name: message.templateName,
          language: {
            code: message.templateLanguage || 'en',
          },
          components,
        },
      };

      const response = await this.makeApiRequest('messages', payload);

      return {
        messageId: response.messages?.[0]?.id || '',
        status: IntegrationStatus.SENT,
        provider: IntegrationProvider.WHATSAPP_BUSINESS,
        timestamp: new Date(),
        metadata: {
          whatsappMessageId: response.messages?.[0]?.id,
          contactId: response.contacts?.[0]?.wa_id,
          templateName: message.templateName,
        },
      };
    } catch (error) {
      this.logger.error('Failed to send template message', error);
      return this.createErrorResponse(error, 'Send template message');
    }
  }

  /**
   * Send a media message (image, document, video, audio)
   */
  async sendMediaMessage(message: IMediaMessage): Promise<IMessageResponse> {
    this.validateMessage(message);

    try {
      const mediaType = message.type.toLowerCase();
      const mediaObject: Record<string, string> = {};

      // Use media ID if provided, otherwise use URL
      if (message.mediaId) {
        mediaObject.id = message.mediaId;
      } else if (message.mediaUrl) {
        mediaObject.link = message.mediaUrl;
      } else {
        throw new Error('Either mediaId or mediaUrl must be provided');
      }

      // Add caption for supported media types
      if (
        message.caption &&
        (message.type === MessageType.IMAGE ||
          message.type === MessageType.VIDEO ||
          message.type === MessageType.DOCUMENT)
      ) {
        mediaObject.caption = message.caption;
      }

      // Add filename for documents
      if (message.type === MessageType.DOCUMENT && message.filename) {
        mediaObject.filename = message.filename;
      }

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: this.formatPhoneNumber(message.to),
        type: mediaType,
        [mediaType]: mediaObject,
      };

      const response = await this.makeApiRequest('messages', payload);

      return {
        messageId: response.messages?.[0]?.id || '',
        status: IntegrationStatus.SENT,
        provider: IntegrationProvider.WHATSAPP_BUSINESS,
        timestamp: new Date(),
        metadata: {
          whatsappMessageId: response.messages?.[0]?.id,
          contactId: response.contacts?.[0]?.wa_id,
          mediaType: message.type,
        },
      };
    } catch (error) {
      this.logger.error('Failed to send media message', error);
      return this.createErrorResponse(error, 'Send media message');
    }
  }

  /**
   * Send an OTP message
   */
  async sendOtpMessage(message: IOtpMessage): Promise<IMessageResponse> {
    // Format OTP message as text
    const expiryText = message.expiryMinutes
      ? ` This code will expire in ${message.expiryMinutes} minutes.`
      : '';

    const textMessage: ITextMessage = {
      to: message.to,
      type: MessageType.TEXT,
      body: `Your verification code is: ${message.otp}${expiryText}\n\nDo not share this code with anyone.`,
      metadata: message.metadata,
    };

    return this.sendTextMessage(textMessage);
  }

  /**
   * Send an alert message
   */
  async sendAlertMessage(message: IAlertMessage): Promise<IMessageResponse> {
    const priorityEmoji: Record<string, string> = {
      low: 'ℹ️',
      medium: '⚠️',
      high: '🚨',
      critical: '🔴',
    };

    const emoji = priorityEmoji[message.priority || 'medium'];
    const title = message.title ? `*${message.title}*\n\n` : '';
    const body = `${emoji} ${title}${message.body}`;

    const textMessage: ITextMessage = {
      to: message.to,
      type: MessageType.TEXT,
      body,
      metadata: message.metadata,
    };

    return this.sendTextMessage(textMessage);
  }

  /**
   * Get message status
   */
  async getMessageStatus(messageId: string): Promise<IMessageResponse> {
    try {
      const response = await this.makeApiRequest(`messages/${messageId}`, null, 'GET');

      const statusValue = typeof response.status === 'string' ? response.status : 'pending';

      return {
        messageId,
        status: this.mapWhatsAppStatus(statusValue),
        provider: IntegrationProvider.WHATSAPP_BUSINESS,
        timestamp: new Date(),
        metadata: response,
      };
    } catch (error) {
      this.logger.error('Failed to get message status', error);
      return this.createErrorResponse(error, 'Get message status');
    }
  }

  /**
   * Generic send message method
   */
  async sendMessage(message: {
    type: MessageType;
    to: string;
    [key: string]: unknown;
  }): Promise<IMessageResponse> {
    const msgType = message.type;

    switch (msgType) {
      case MessageType.TEXT:
        return this.sendTextMessage(message as unknown as ITextMessage);
      case MessageType.TEMPLATE:
        return this.sendTemplateMessage(message as unknown as ITemplateMessage);
      case MessageType.IMAGE:
      case MessageType.DOCUMENT:
      case MessageType.VIDEO:
      case MessageType.AUDIO:
        return this.sendMediaMessage(message as unknown as IMediaMessage);
      case MessageType.OTP:
        return this.sendOtpMessage(message as unknown as IOtpMessage);
      case MessageType.ALERT:
        return this.sendAlertMessage(message as unknown as IAlertMessage);

      case MessageType.LOCATION:
      case MessageType.CONTACT:
      case MessageType.NOTIFICATION:
        throw new Error(`Message type ${String(msgType)} is not yet implemented`);

      default:
        throw new Error(`Unsupported message type: ${String(msgType)}`);
    }
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    // Must be between 10-15 digits
    return cleaned.length >= 10 && cleaned.length <= 15;
  }

  /**
   * Upload media to WhatsApp
   */
  async uploadMedia(mediaUrl: string, mimeType: string): Promise<string> {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        file: mediaUrl,
        type: mimeType,
      };

      const response = await this.makeApiRequest('media', payload);
      const mediaId = response.id;
      if (typeof mediaId === 'string') {
        return mediaId;
      }
      if (typeof mediaId === 'number') {
        return mediaId.toString();
      }
      return '';
    } catch (error) {
      this.logger.error('Upload media failed', error);
      throw new Error('Failed to upload media');
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Validate message has required fields
   */
  private validateMessage(message: { to?: string }): void {
    if (!message.to) {
      throw new Error('Recipient phone number is required');
    }
  }

  /**
   * Format phone number for WhatsApp
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    return phone.replace(/\D/g, '');
  }

  /**
   * Create error response
   */
  private createErrorResponse(error: unknown, _operation: string): IMessageResponse {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorCode = (error as { code?: string }).code || 'UNKNOWN_ERROR';
    const errorDetails = (error as { details?: unknown }).details;

    return {
      messageId: '',
      status: IntegrationStatus.FAILED,
      provider: IntegrationProvider.WHATSAPP_BUSINESS,
      timestamp: new Date(),
      error: {
        code: errorCode,
        message: errorMessage,
        details: errorDetails,
      },
    };
  }

  /**
   * Make API request to WhatsApp Business API
   */
  private async makeApiRequest(
    endpoint: string,
    data: Record<string, unknown> | null,
    method: 'GET' | 'POST' = 'POST',
  ): Promise<WhatsAppApiResponse> {
    const url = `${this.apiUrl}/${this.phoneNumberId}/${endpoint}`;

    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    };

    if (data && method === 'POST') {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      const responseData = (await response.json()) as WhatsAppApiResponse;

      if (!response.ok) {
        const error = new Error(responseData.error?.message || 'API request failed');
        (error as { code?: string }).code = responseData.error?.code || 'API_ERROR';
        (error as { details?: unknown }).details = responseData.error;
        throw error;
      }

      return responseData;
    } catch (error) {
      this.logger.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  /**
   * Build template components from parameters
   */
  private buildTemplateComponents(parameters: Record<string, unknown>): TemplateComponent[] {
    const components: TemplateComponent[] = [];

    // Header parameters
    if (parameters.header) {
      components.push({
        type: 'header',
        parameters: Array.isArray(parameters.header) ? parameters.header : [parameters.header],
      });
    }

    // Body parameters
    if (parameters.body) {
      const bodyValue = parameters.body;
      const bodyParams = Array.isArray(bodyValue)
        ? bodyValue.map((value: unknown) => ({
            type: 'text',
            text: typeof value === 'string' ? value : JSON.stringify(value),
          }))
        : [
            {
              type: 'text',
              text: typeof bodyValue === 'string' ? bodyValue : JSON.stringify(bodyValue),
            },
          ];

      components.push({
        type: 'body',
        parameters: bodyParams,
      });
    }

    // Button parameters
    if (parameters.buttons) {
      components.push({
        type: 'button',
        sub_type: 'quick_reply',
        parameters: Array.isArray(parameters.buttons) ? parameters.buttons : [parameters.buttons],
      });
    }

    return components;
  }

  /**
   * Map WhatsApp status to internal status
   */
  private mapWhatsAppStatus(status: string): IntegrationStatus {
    const statusMap: Record<string, IntegrationStatus> = {
      sent: IntegrationStatus.SENT,
      delivered: IntegrationStatus.DELIVERED,
      read: IntegrationStatus.READ,
      failed: IntegrationStatus.FAILED,
      pending: IntegrationStatus.PENDING,
    };

    return statusMap[status] || IntegrationStatus.PENDING;
  }
}
