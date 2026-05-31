import { Injectable } from '@nestjs/common';
import {
  IntegrationProvider,
  IntegrationCategory,
  type IMessageResponse,
  type ITextMessage,
  type ITemplateMessage,
  type IMediaMessage,
} from '@oneohm-epc/shared/types';
import type { AxiosInstance } from 'axios';

import { BaseMessagingProvider } from '../base';
import {
  IntegrationProvider as IntegrationProviderDecorator,
  InjectCredential,
  InjectConfig,
  InjectHttpClient,
} from '../decorators';

/**
 * WhatsApp Business API Provider (New Architecture)
 * Implements messaging via WhatsApp Business API (Meta/Facebook)
 *
 * ✨ Refactored with decorator-driven architecture
 */
@Injectable()
@IntegrationProviderDecorator({
  provider: IntegrationProvider.WHATSAPP_BUSINESS,
  category: IntegrationCategory.MESSAGING,
  displayName: 'WhatsApp Business API',
  description: 'Send messages via WhatsApp Business API',
  baseUrl: 'https://graph.facebook.com',
  icon: 'message-square',
})
export class WhatsAppBusinessProvider extends BaseMessagingProvider {
  // ============================================
  // 🎯 Auto-Injected Credentials
  // ============================================

  @InjectCredential('accessToken', { required: true })
  private readonly accessToken!: string;

  @InjectCredential('phoneNumberId', { required: true })
  private readonly phoneNumberId!: string;

  @InjectCredential('businessAccountId')
  private readonly businessAccountId?: string;

  // ============================================
  // 🎯 Auto-Injected Configuration
  // ============================================

  @InjectConfig('apiVersion', { default: 'v25.0' })
  private readonly apiVersion!: string;

  // ============================================
  // 🎯 Auto-Configured HTTP Client
  // ============================================

  @InjectHttpClient({
    timeout: 30000,
  })
  protected readonly http!: AxiosInstance;

  // ============================================
  // ✨ Business Logic
  // ============================================

  /**
   * Send text message
   */
  override async sendText(message: ITextMessage): Promise<IMessageResponse> {
    try {
      // Manually set auth header (temporary until factory supports dynamic headers)
      const response = await this.http.post(
        `/${this.apiVersion}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: this.cleanPhone(message.to),
          type: 'text',
          text: {
            body: message.body,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        },
      );

      const messageId = response.data.messages?.[0]?.id || `whatsapp-${Date.now()}`;

      return this.createSuccessResponse(messageId, {
        phoneNumberId: this.phoneNumberId,
        to: message.to,
      });
    } catch (error) {
      return this.createFailedResponse(error, 'sendText');
    }
  }

  /**
   * Send template message
   */
  override async sendTemplate(message: ITemplateMessage): Promise<IMessageResponse> {
    try {
      const components: Array<Record<string, unknown>> = [];

      if (message.templateParameters) {
        const header = message.templateParameters.header;
        if (this.isRecord(header)) {
          components.push({
            type: 'header',
            parameters: [this.buildTemplateParameter(header)],
          });
        }

        const body = message.templateParameters.body;
        const bodyParameters = this.buildBodyTemplateParameters(
          this.isRecord(body) || Array.isArray(body) ? body : message.templateParameters,
        );

        if (bodyParameters.length > 0) {
          components.push({
            type: 'body',
            parameters: bodyParameters,
          });
        }
      }

      const response = await this.http.post(
        `/${this.apiVersion}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: this.cleanPhone(message.to),
          type: 'template',
          template: {
            name: message.templateName,
            language: {
              code: message.templateLanguage || 'en',
            },
            components,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        },
      );

      const messageId = response.data.messages?.[0]?.id || `whatsapp-${Date.now()}`;

      return this.createSuccessResponse(messageId, {
        templateName: message.templateName,
        to: message.to,
      });
    } catch (error) {
      return this.createFailedResponse(error, 'sendTemplate');
    }
  }

  /**
   * Send media message (image, document, video, audio)
   */
  override async sendMedia(message: IMediaMessage): Promise<IMessageResponse> {
    try {
      const mediaType = message.type.toLowerCase(); // Convert enum to lowercase string for WhatsApp API

      const mediaPayload: Record<string, unknown> = {
        link: message.mediaUrl,
      };
      if ((mediaType === 'image' || mediaType === 'video') && message.caption) {
        mediaPayload.caption = message.caption;
      }
      if (mediaType === 'document' && message.filename) {
        mediaPayload.filename = message.filename;
      }

      const payload: Record<string, unknown> = {
        messaging_product: 'whatsapp',
        to: this.cleanPhone(message.to),
        type: mediaType,
        [mediaType]: mediaPayload,
      };

      const response = await this.http.post(
        `/${this.apiVersion}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        },
      );

      const messageId = response.data.messages?.[0]?.id || `whatsapp-${Date.now()}`;

      return this.createSuccessResponse(messageId, {
        mediaType,
        to: message.to,
      });
    } catch (error) {
      return this.createFailedResponse(error, 'sendMedia');
    }
  }

  /**
   * Check if configured
   */
  isConfigured(): boolean {
    return !!(this.accessToken && this.phoneNumberId);
  }

  /**
   * Validate credentials
   */
  async validateCredentials(): Promise<{ valid: boolean; error?: string }> {
    try {
      const response = await this.http.get(`/${this.apiVersion}/${this.phoneNumberId}`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (response.status === 200) {
        return { valid: true };
      }

      return { valid: false, error: 'Invalid response' };
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { error?: { message?: string } } };
        message?: string;
      };
      return {
        valid: false,
        error: err.response?.data?.error?.message || err.message,
      };
    }
  }

  /**
   * Get provider name
   */
  protected getProviderName(): IntegrationProvider {
    return IntegrationProvider.WHATSAPP_BUSINESS;
  }

  private buildBodyTemplateParameters(
    parameters: Record<string, unknown> | unknown[],
  ): Array<Record<string, unknown>> {
    if (Array.isArray(parameters)) {
      return parameters.map((value) => this.buildTemplateParameter(value));
    }

    return Object.entries(parameters)
      .filter(([key]) => key !== 'header')
      .map(([parameterName, value]) => ({
        ...this.buildTemplateParameter(value),
        parameter_name: parameterName,
      }));
  }

  private buildTemplateParameter(value: unknown): Record<string, unknown> {
    if (this.isRecord(value)) {
      const type = typeof value.type === 'string' ? value.type.toLowerCase() : 'text';
      if (type === 'document') {
        const document: Record<string, unknown> = {};
        if (typeof value.id === 'string') document.id = value.id;
        if (typeof value.link === 'string') document.link = value.link;
        if (typeof value.filename === 'string') document.filename = value.filename;

        return { type: 'document', document };
      }

      if (type === 'image' || type === 'video') {
        const media: Record<string, unknown> = {};
        if (typeof value.id === 'string') media.id = value.id;
        if (typeof value.link === 'string') media.link = value.link;

        return { type, [type]: media };
      }

      if (typeof value.text === 'string') {
        return { type: 'text', text: value.text };
      }
    }

    return { type: 'text', text: String(value) };
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
