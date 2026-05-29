import { Injectable } from '@nestjs/common';

import { RegisterDeviceTokenDto } from '../dto/register-device-token.dto';
import { UserDeviceTokenRepository } from '../repositories/user-device-token.repository';

@Injectable()
export class DeviceTokenService {
  constructor(private readonly deviceTokenRepository: UserDeviceTokenRepository) {}

  async register(userId: string, dto: RegisterDeviceTokenDto): Promise<{ registered: true }> {
    await this.deviceTokenRepository.upsertForUser({
      userId,
      token: dto.token,
      platform: dto.os,
      deviceModel: dto.deviceModel,
    });

    return { registered: true };
  }

  async getActiveTokensForUser(userId: string): Promise<string[]> {
    return this.deviceTokenRepository.findActiveTokensByUserId(userId);
  }

  async deactivateTokens(tokens: string[]): Promise<void> {
    return this.deviceTokenRepository.deactivateTokens(tokens);
  }
}
