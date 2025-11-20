import {
  IntegrationProvider,
  IntegrationCategory,
  MessageType,
  IntegrationStatus,
} from '../enums/integration-provider.enum';

/**
 * Base Message Interface
 * Common structure for all message types
 */
export interface IMessage {
  to: string;
  type: MessageType;
  body?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Text Message
 */
export interface ITextMessage extends IMessage {
  type: MessageType.TEXT;
  body: string;
}

/**
 * Template Message
 */
export interface ITemplateMessage extends IMessage {
  type: MessageType.TEMPLATE;
  templateName: string;
  templateLanguage?: string;
  templateParameters?: Record<string, unknown>;
}

/**
 * Media Message (Image, Document, Video, Audio)
 */
export interface IMediaMessage extends IMessage {
  type: MessageType.IMAGE | MessageType.DOCUMENT | MessageType.VIDEO | MessageType.AUDIO;
  mediaUrl?: string;
  mediaId?: string;
  caption?: string;
  filename?: string;
  mimeType?: string;
}

/**
 * OTP Message
 */
export interface IOtpMessage extends IMessage {
  type: MessageType.OTP;
  otp: string;
  expiryMinutes?: number;
}

/**
 * Alert Message
 */
export interface IAlertMessage extends IMessage {
  type: MessageType.ALERT;
  title?: string;
  body: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Message Response
 */
export interface IMessageResponse {
  messageId: string;
  status: IntegrationStatus;
  provider: IntegrationProvider;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Integration Credentials
 */
export interface IIntegrationCredentials {
  provider: IntegrationProvider;
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  accountSid?: string;
  authToken?: string;
  [key: string]: unknown;
}

/**
 * Integration Configuration
 */
export interface IIntegrationConfig {
  provider: IntegrationProvider;
  category: IntegrationCategory;
  enabled: boolean;
  credentials: IIntegrationCredentials;
  settings?: Record<string, unknown>;
}
