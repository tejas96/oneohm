import {
  IntegrationStatus,
  type IAlertMessage,
  type IMediaMessage,
  type IMessage,
  type IMessageResponse,
  type IOtpMessage,
  type ITemplateMessage,
  type ITextMessage,
} from '@tejas96/shared/types';

import { BaseIntegrationProvider } from './base-integration-provider';

/**
 * Base Messaging Provider
 * Abstract base class for all messaging providers (SMS, WhatsApp, etc.)
 *
 * Provides common functionality for messaging:
 * - Success response formatting
 * - Error response formatting
 * - Phone number utilities
 *
 * NOTE: Full interface implementation will be done in future PR
 * when integration system refactor is complete
 */
export abstract class BaseMessagingProvider extends BaseIntegrationProvider {
  async sendTextMessage(message: ITextMessage): Promise<IMessageResponse> {
    return this.sendText(message);
  }

  async sendTemplateMessage(message: ITemplateMessage): Promise<IMessageResponse> {
    return this.sendTemplate(message);
  }

  async sendMediaMessage(message: IMediaMessage): Promise<IMessageResponse> {
    return this.sendMedia(message);
  }

  async sendOtpMessage(message: IOtpMessage): Promise<IMessageResponse> {
    return this.sendOtp(message);
  }

  async sendAlertMessage(message: IAlertMessage): Promise<IMessageResponse> {
    return this.sendAlert(message);
  }

  sendText(_message: ITextMessage): Promise<IMessageResponse> {
    return Promise.resolve(this.createUnsupportedResponse('sendText'));
  }

  sendTemplate(_message: ITemplateMessage): Promise<IMessageResponse> {
    return Promise.resolve(this.createUnsupportedResponse('sendTemplate'));
  }

  sendMedia(_message: IMediaMessage): Promise<IMessageResponse> {
    return Promise.resolve(this.createUnsupportedResponse('sendMedia'));
  }

  sendOtp(_message: IOtpMessage): Promise<IMessageResponse> {
    return Promise.resolve(this.createUnsupportedResponse('sendOtp'));
  }

  sendAlert(_message: IAlertMessage): Promise<IMessageResponse> {
    return Promise.resolve(this.createUnsupportedResponse('sendAlert'));
  }

  sendMessage(_message: IMessage): Promise<IMessageResponse> {
    return Promise.resolve(this.createUnsupportedResponse('sendMessage'));
  }

  /**
   * Create a success response
   */
  protected createSuccessResponse(
    messageId: string,
    metadata?: Record<string, unknown>,
  ): IMessageResponse {
    return {
      messageId,
      status: IntegrationStatus.SENT,
      provider: this.getProviderName(),
      timestamp: new Date(),
      metadata,
    };
  }

  /**
   * Create a failed response
   */
  protected createFailedResponse(error: unknown, operation: string): IMessageResponse {
    const errorData = this.handleError(error, operation);

    return {
      messageId: `error-${Date.now()}`,
      status: IntegrationStatus.FAILED,
      provider: this.getProviderName(),
      timestamp: new Date(),
      ...errorData,
    };
  }

  private createUnsupportedResponse(operation: string): IMessageResponse {
    return {
      messageId: `unsupported-${Date.now()}`,
      status: IntegrationStatus.FAILED,
      provider: this.getProviderName(),
      timestamp: new Date(),
      error: {
        code: 'UNSUPPORTED_OPERATION',
        message: `${operation} is not supported by ${this.getProviderName()}`,
      },
    };
  }
}
