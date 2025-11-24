import { Injectable } from '@nestjs/common';
import {
  IntegrationProvider,
  IntegrationCategory,
  type IMessageResponse,
  type IOtpMessage,
  type ITextMessage,
} from '@oneohm-epc/shared-types';
import type { AxiosInstance } from 'axios';

import { BaseMessagingProvider } from '../base';
import {
  IntegrationProvider as IntegrationProviderDecorator,
  InjectCredential,
  InjectConfig,
  InjectHttpClient,
} from '../decorators';

/**
 * MSG91 Provider (New Architecture)
 * Implements MSG91 Dedicated OTP API and SMS API
 *
 * ✨ Features new decorator-driven architecture:
 * - Auto-injection of credentials
 * - Auto-injection of configuration
 * - Auto-setup of HTTP client
 * - Clean, minimal code
 *
 * API Documentation: https://docs.msg91.com/
 */
@Injectable()
@IntegrationProviderDecorator({
  provider: IntegrationProvider.MSG91,
  category: IntegrationCategory.MESSAGING,
  displayName: 'MSG91 SMS & OTP',
  description: 'Send OTP and SMS via MSG91 dedicated API',
  baseUrl: 'https://api.msg91.com/api/v5',
  icon: 'message-circle',
})
export class Msg91Provider extends BaseMessagingProvider {
  // ============================================
  // 🎯 Auto-Injected Credentials
  // ============================================

  @InjectCredential('authKey', { required: true })
  private readonly authKey!: string;

  @InjectCredential('senderId')
  private readonly senderId?: string;

  // ============================================
  // 🎯 Auto-Injected Configuration
  // ============================================

  @InjectConfig('otpTemplateId', { required: true })
  private readonly otpTemplateId!: string;

  @InjectConfig('otpLength', { default: 6 })
  private readonly otpLength!: number;

  @InjectConfig('otpExpiry', { default: 300 })
  private readonly otpExpiry!: number;

  @InjectConfig('invisible', { default: false })
  private readonly invisible!: boolean;

  // ============================================
  // 🎯 Auto-Configured HTTP Client
  // ============================================

  @InjectHttpClient({
    authHeader: 'authkey', // Uses this.authKey automatically
    timeout: 30000,
  })
  protected readonly http!: AxiosInstance;

  // ============================================
  // ✨ Business Logic (Clean & Simple!)
  // ============================================

  /**
   * Send OTP using MSG91 Dedicated OTP API
   */
  async sendOtp(message: IOtpMessage): Promise<IMessageResponse> {
    try {
      const response = await this.http.post('/otp', {
        template_id: this.otpTemplateId,
        mobile: this.cleanPhone(message.to),
        otp: message.otp,
        otp_expiry: message.expiryMinutes || this.otpExpiry / 60,
        otp_length: this.otpLength,
        invisible: this.invisible,
      });

      if (response.data.type === 'success') {
        return this.createSuccessResponse(response.data.request_id || `msg91-${Date.now()}`, {
          mobile: message.to,
          templateId: this.otpTemplateId,
        });
      }

      throw new Error(response.data.message || 'Failed to send OTP');
    } catch (error) {
      return this.createFailedResponse(error, 'sendOtp');
    }
  }

  /**
   * Send text message via MSG91 SMS API
   */
  async sendText(message: ITextMessage): Promise<IMessageResponse> {
    try {
      const response = await this.http.post('/flow', {
        sender: this.senderId || 'MSGIND',
        route: '4', // Transactional route
        country: '91',
        sms: [
          {
            message: message.body,
            to: [this.cleanPhone(message.to)],
          },
        ],
      });

      return this.createSuccessResponse(response.data.request_id || `msg91-sms-${Date.now()}`, {
        mobile: message.to,
        route: 'transactional',
      });
    } catch (error) {
      return this.createFailedResponse(error, 'sendText');
    }
  }

  /**
   * Check if provider is configured
   */
  isConfigured(): boolean {
    return !!(this.authKey && this.otpTemplateId);
  }

  /**
   * Validate credentials by checking balance
   */
  async validateCredentials(): Promise<{ valid: boolean; error?: string }> {
    try {
      const response = await this.http.get('/balance');

      if (response.status === 200) {
        this.logger.log('MSG91 credentials validated successfully');
        return { valid: true };
      }

      return { valid: false, error: 'Invalid response from MSG91' };
    } catch (error: any) {
      this.logger.error('MSG91 credential validation failed', error);
      return {
        valid: false,
        error: error.response?.data?.message || error.message || 'Validation failed',
      };
    }
  }

  /**
   * Get provider name
   */
  protected getProviderName(): IntegrationProvider {
    return IntegrationProvider.MSG91;
  }

  // ============================================
  // 🎁 Bonus Features (Optional)
  // ============================================

  /**
   * Resend OTP
   */
  async resendOtp(mobile: string): Promise<IMessageResponse> {
    try {
      const response = await this.http.post('/otp/retry', {
        authkey: this.authKey,
        mobile: this.cleanPhone(mobile),
        retrytype: 'text',
      });

      if (response.data?.type === 'success') {
        return this.createSuccessResponse(
          response.data.request_id || `msg91-resend-${Date.now()}`,
          {
            mobile,
            type: 'resend',
          },
        );
      }

      throw new Error(response.data?.message || 'Failed to resend OTP');
    } catch (error) {
      return this.createFailedResponse(error, 'resendOtp');
    }
  }

  /**
   * Get delivery report
   */
  async getDeliveryReport(requestId: string): Promise<any> {
    try {
      const response = await this.http.get(`/report/${requestId}`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get delivery report', error);
      return null;
    }
  }
}
