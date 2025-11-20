/**
 * Base configuration interface for all integrations
 */
export interface IIntegrationConfig {
  authType: string;
  credentials: Record<string, any>;
  configuration?: Record<string, any>;
}

/**
 * WhatsApp Business API Configuration
 */
export interface IWhatsAppBusinessConfig extends IIntegrationConfig {
  authType: 'bearer_token';
  credentials: {
    accessToken: string;
    phoneNumberId: string;
    businessAccountId?: string;
  };
  configuration?: {
    apiUrl?: string;
    webhookVerifyToken?: string;
  };
}

/**
 * Twilio Configuration
 */
export interface ITwilioConfig extends IIntegrationConfig {
  authType: 'basic_auth';
  credentials: {
    accountSid: string;
    authToken: string;
  };
  configuration?: {
    phoneNumber?: string;
    messagingServiceSid?: string;
  };
}

/**
 * Type mapping for provider-specific configurations
 */
export type IntegrationConfigMap = {
  'whatsapp-business-api': IWhatsAppBusinessConfig;
  twilio: ITwilioConfig;
  // Add more providers as needed
};
