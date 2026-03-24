import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

import { ConfigService } from '../../../config/config.service';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly MSG91_AUTH_KEY: string;
  private readonly MSG91_FLOW_ID: string;

  constructor(private readonly configService: ConfigService) {
    this.MSG91_AUTH_KEY = this.configService.integrations.msg91AuthKey || '';
    this.MSG91_FLOW_ID = this.configService.integrations.msg91FlowId || '';

    if (!this.MSG91_AUTH_KEY) {
      this.logger.warn('MSG91_AUTH_KEY is not configured');
    }
    if (!this.MSG91_FLOW_ID) {
      this.logger.warn('MSG91_FLOW_ID is not configured');
    }
  }

  async sendOtp(phone: string, otp: string): Promise<boolean> {
    // Validate configuration
    if (!this.MSG91_AUTH_KEY || !this.MSG91_FLOW_ID) {
      const missingVars = [];
      if (!this.MSG91_AUTH_KEY) missingVars.push('MSG91_AUTH_KEY');
      if (!this.MSG91_FLOW_ID) missingVars.push('MSG91_FLOW_ID');
      throw new Error(`SMS Configuration missing: ${missingVars.join(', ')}`);
    }

    try {
      const payload = {
        data: {
          sendTo: [
            {
              to: [{ mobiles: phone }],
              variables: {
                var1: { type: 'text', value: otp },
              },
            },
          ],
        },
      };

      this.logger.debug(`Sending OTP to ${phone} via MSG91 Flow: ${this.MSG91_FLOW_ID}`);

      const response = await axios.post(
        `https://control.msg91.com/api/v5/oneapi/api/flow/${this.MSG91_FLOW_ID}/run`,
        payload,
        {
          headers: {
            authkey: this.MSG91_AUTH_KEY,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );

      if (response.data.status === 'success') {
        this.logger.log(`✓ OTP sent successfully to ${phone}`);
        return true;
      }
      throw new Error(`MSG91 API Error: ${response.data.message || 'Unknown error'}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`✗ Failed to send OTP to ${phone}: ${errorMessage}`);
      throw error;
    }
  }
}
