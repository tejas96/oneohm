/**
 * Integration Provider Types
 * Defines all supported integration providers
 */
export enum IntegrationProvider {
  WHATSAPP_BUSINESS = 'whatsapp-business-api',
  TWILIO = 'twilio',
}

/**
 * Integration Category
 * Categorizes integrations by their primary function
 */
export enum IntegrationCategory {
  MESSAGING = 'messaging',
  SMS = 'sms',
  EMAIL = 'email',
  VOICE = 'voice',
}

/**
 * Message Type
 * Defines different types of messages that can be sent
 */
export enum MessageType {
  TEXT = 'text',
  TEMPLATE = 'template',
  IMAGE = 'image',
  DOCUMENT = 'document',
  VIDEO = 'video',
  AUDIO = 'audio',
  LOCATION = 'location',
  CONTACT = 'contact',
  OTP = 'otp',
  ALERT = 'alert',
  NOTIFICATION = 'notification',
}

/**
 * Integration Status
 * Tracks the status of integration operations
 */
export enum IntegrationStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  PENDING = 'pending',
  DELIVERED = 'delivered',
  READ = 'read',
  SENT = 'sent',
  QUEUED = 'queued',
}
