import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserDeviceTokenEntity } from '../entities/user-device-token.entity';

@Injectable()
export class UserDeviceTokenRepository {
  constructor(
    @InjectRepository(UserDeviceTokenEntity)
    private readonly repository: Repository<UserDeviceTokenEntity>,
  ) {}

  async upsertForUser(input: {
    userId: string;
    token: string;
    platform: string;
    deviceModel?: string;
  }): Promise<UserDeviceTokenEntity> {
    await this.repository.upsert(
      {
        userId: input.userId,
        token: input.token,
        platform: input.platform,
        deviceModel: input.deviceModel,
        isActive: true,
        lastSeenAt: new Date(),
      },
      ['token'],
    );

    return this.repository.findOneOrFail({ where: { token: input.token } });
  }

  async findActiveTokensByUserId(userId: string): Promise<string[]> {
    const rows = await this.repository.find({
      where: { userId, isActive: true },
      select: { token: true },
    });

    return rows.map((row) => row.token);
  }

  async deactivateTokens(tokens: string[]): Promise<void> {
    if (tokens.length === 0) return;

    await this.repository
      .createQueryBuilder()
      .update(UserDeviceTokenEntity)
      .set({ isActive: false })
      .where('token IN (:...tokens)', { tokens })
      .execute();
  }
}
