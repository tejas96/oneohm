import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { formatPhoneForWhatsApp } from '@oneohm-epc/shared/utils';
import axios from 'axios';

import { ConfigService } from '../../../config/config.service';

interface Msg91OtpResponse {
  type?: string;
  message?: string;
  request_id?: string;
}

export type OtpSmsPurpose = 'login' | 'password-reset';

@Injectable()
export class PlatformSmsService {
  private readonly logger = new Logger(PlatformSmsService.name);
  private readonly otpEndpoint = 'https://api.msg91.com/api/v5/otp';
  private readonly otpExpiryMinutes = 5;
  private readonly otpLength = 6;

  constructor(private readonly configService: ConfigService) {}

  async sendOtp(phone: string, otp: string, purpose: OtpSmsPurpose = 'login'): Promise<void> {
    const authKey = this.configService.integrations.msg91AuthKey;
    const templateId = this.getTemplateId(purpose);

    if (!authKey || !templateId) {
      if (this.configService.isDevelopment) {
        this.logger.warn(
          `[DEV ONLY] MSG91 is not configured. OTP for ${this.maskPhone(phone)} is ${otp}`,
        );
        return;
      }
      throw new BadRequestException('OTP service is not configured');
    }

    // formatPhoneForWhatsApp strips non-digits and prepends 91 for 10-digit numbers.
    // Input is already E.164 (+919876543210) so this produces MSG91-ready format (919876543210).
    const mobile = formatPhoneForWhatsApp(phone);

    try {
      const response = await axios.post<Msg91OtpResponse>(
        this.otpEndpoint,
        {
          template_id: templateId,
          mobile,
          otp,
          otp_expiry: this.otpExpiryMinutes,
          otp_length: this.otpLength,
        },
        {
          headers: {
            authkey: authKey,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        },
      );

      if (response.data?.type !== 'success') {
        this.logger.warn(
          `MSG91 OTP send failed for ${mobile}. Response: ${response.data?.message || 'unknown'}`,
        );
        throw new BadRequestException('Failed to send OTP. Please try again.');
      }

      this.logger.log(
        `MSG91 OTP sent successfully to ${mobile} (request_id: ${response.data?.request_id ?? 'n/a'})`,
      );
      if (this.configService.isDevelopment) {
        this.logger.debug(`[DEV] OTP sent to ${this.maskPhone(phone)}: ${otp}`);
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`MSG91 OTP send failed for ${mobile}`, error);
      throw new BadRequestException('Failed to send OTP. Please try again.');
    }
  }

  private maskPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 4) return phone;
    return `+${digits.slice(0, 2)}${digits.slice(2, 4)}****${digits.slice(-2)}`;
  }

  private getTemplateId(purpose: OtpSmsPurpose): string | undefined {
    const integrations = this.configService.integrations;
    if (purpose === 'password-reset') {
      return integrations.msg91PasswordResetTemplateId;
    }
    return integrations.msg91LoginTemplateId;
  }
}
