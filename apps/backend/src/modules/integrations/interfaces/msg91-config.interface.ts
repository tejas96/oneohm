import { IIntegrationConfig } from './integration-config.interface';

/**
 * MSG91 Configuration Interface
 * For MSG91 dedicated OTP API
 *
 * Documentation: https://docs.msg91.com/p/tf9GTextN/e/gYRDAGU5L/MSG91
 */
export interface IMsg91Config extends IIntegrationConfig {
  credentials: {
    authKey: string; // MSG91 Auth Key
    senderId?: string; // Sender ID (optional for OTP API)
  };
  configuration: {
    otpTemplateId: string; // DLT approved template ID for OTP
    otpLength: number; // 4 or 6 digits
    otpExpiry: number; // Expiry in seconds (e.g., 300 for 5 minutes)
    invisible?: boolean; // Invisible OTP (auto-read on Android)
    userip?: string; // User IP for better delivery
  };
}

/**
 * MSG91 OTP Send Response
 */
export interface IMsg91OtpResponse {
  type: string; // 'success' or 'error'
  message: string;
  request_id?: string; // Unique request ID from MSG91
}

/**
 * MSG91 OTP Verify Response
 */
export interface IMsg91VerifyResponse {
  type: string;
  message: string;
}

/**
 * MSG91 SMS Send Response
 */
export interface IMsg91SmsResponse {
  type: string;
  message: string;
  request_id?: string;
}
