import { Injectable, Logger } from '@nestjs/common';
import axios, { type AxiosError } from 'axios';

import { ConfigService } from '../../../config/config.service';

const MSG91_FLOW_URL = 'https://control.msg91.com/api/v5/flow';

/**
 * MSG91 OTP Client (app-level)
 * Sends OTP SMS via MSG91 Flow API using app config (env: MSG91_AUTH_KEY, MSG91_DLT_TEMPLATE_ID).
 * Used by auth OTP flow; for org-level messaging use IntegrationsModule Msg91Provider.
 */
@Injectable()
export class Msg91OtpClient {
  private readonly logger = new Logger(Msg91OtpClient.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Send OTP SMS via MSG91 Flow API (DLT-compliant for India).
   * No-op if MSG91 is not configured (dev: logs OTP; prod: logs warning).
   */
  async sendOtp(phone: string, otp: string): Promise<void> {
    const authKey = this.configService.integrations.msg91AuthKey;
    const templateId = this.configService.integrations.msg91DltTemplateId;
    const isDev = this.configService.isDevelopment;

    // In dev mode — always log OTP to terminal so you can test without SMS
    if (isDev) {
      this.logger.warn(
        `🔐 DEV MODE OTP for ${this.maskPhone(phone)}: ${otp}  (use this on /otp-verify page)`,
      );
    }

    if (!authKey || !templateId) {
      if (isDev) {
        this.logger.warn('MSG91 not configured — SMS skipped in dev. Use OTP logged above.');
        return;
      }
      this.logger.error(
        'MSG91 not configured (MSG91_AUTH_KEY, MSG91_DLT_TEMPLATE_ID). Cannot send OTP in production.',
      );
      throw new Error(
        'OTP service is not configured. Please set MSG91_AUTH_KEY and MSG91_DLT_TEMPLATE_ID.',
      );
    }

    const mobile = this.toMsg91Mobile(phone);

    try {
      const response = await axios.post<{ type: string; message?: string }>(
        MSG91_FLOW_URL,
        {
          template_id: templateId,
          short_url: '0',
          recipients: [
            {
              mobiles: mobile,
              OTP: otp,
            },
          ],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            authkey: authKey,
          },
          timeout: 15000,
        },
      );

      if (response.data?.type !== 'success') {
        const msg = response.data?.message ?? 'Unknown MSG91 error';
        this.logger.error(`MSG91 send OTP failed: ${msg}`);
        // In dev — don't throw, SMS failure should not block login testing
        if (isDev) {
          this.logger.warn('MSG91 failed but dev mode — use OTP logged above to continue.');
          return;
        }
        throw new Error(`Failed to send OTP: ${msg}`);
      }

      this.logger.log(`OTP sent via MSG91 to ${this.maskPhone(phone)}`);
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      const message =
        axiosError.response?.data?.message ??
        (axiosError instanceof Error ? axiosError.message : 'Unknown error');
      this.logger.error(`MSG91 send OTP error: ${message}`, axiosError.response?.data ?? err);
      // In dev — don't throw, use logged OTP above
      if (isDev) {
        this.logger.warn('MSG91 error in dev mode — use OTP logged above to continue.');
        return;
      }
      throw new Error(`Failed to send OTP: ${message}`);
    }
  }

  /** Check if MSG91 is configured for sending OTP. */
  isConfigured(): boolean {
    return !!(
      this.configService.integrations.msg91AuthKey &&
      this.configService.integrations.msg91DltTemplateId
    );
  }

  /** E.164 (+919876543210) -> MSG91 format (919876543210). */
  private toMsg91Mobile(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  private maskPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 4) return '***';
    return `${digits.slice(0, 3)}*****${digits.slice(-4)}`;
  }
}
