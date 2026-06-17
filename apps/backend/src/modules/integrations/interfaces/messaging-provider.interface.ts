import {
  type IMessage,
  type IMessageResponse,
  type ITextMessage,
  type ITemplateMessage,
  type IMediaMessage,
  type IOtpMessage,
  type IAlertMessage,
} from '@tejas96/shared/types';

import { type IBaseIntegration } from './base-integration.interface';

/**
 * Messaging Provider Interface
 * Extends base integration for messaging-specific operations
 */
export interface IMessagingProvider extends IBaseIntegration {
  /**
   * Send a text message
   */
  sendTextMessage(message: ITextMessage): Promise<IMessageResponse>;

  /**
   * Send a template message
   */
  sendTemplateMessage(message: ITemplateMessage): Promise<IMessageResponse>;

  /**
   * Send a media message (image, document, video, audio)
   */
  sendMediaMessage(message: IMediaMessage): Promise<IMessageResponse>;

  /**
   * Send an OTP message
   */
  sendOtpMessage(message: IOtpMessage): Promise<IMessageResponse>;

  /**
   * Send an alert message
   */
  sendAlertMessage(message: IAlertMessage): Promise<IMessageResponse>;

  /**
   * Generic send message method
   */
  sendMessage(message: IMessage): Promise<IMessageResponse>;

  /**
   * Get message status
   */
  getMessageStatus(messageId: string): Promise<IMessageResponse>;

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phoneNumber: string): boolean;
}
