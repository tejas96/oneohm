import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { NotificationEntity } from '../entities/notification.entity';

@Injectable()
export class NotificationRepository {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly repository: Repository<NotificationEntity>,
  ) {}

  async create(data: Partial<NotificationEntity>): Promise<NotificationEntity> {
    const notification = this.repository.create(data);
    return this.repository.save(notification);
  }

  async findById(id: string, userId: string): Promise<NotificationEntity | null> {
    return this.repository.findOne({ where: { id, userId } });
  }

  async findByUser(
    userId: string,
    organizationId: string,
    page = 1,
    limit = 20,
    unreadOnly = false,
  ): Promise<{ notifications: NotificationEntity[]; total: number }> {
    const where: Record<string, unknown> = { userId, organizationId };
    if (unreadOnly) where.readAt = IsNull();

    const [notifications, total] = await this.repository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { notifications, total };
  }

  async getUnreadCount(userId: string, organizationId: string): Promise<number> {
    return this.repository.count({
      where: { userId, organizationId, readAt: IsNull() },
    });
  }

  async markRead(id: string, userId: string): Promise<void> {
    await this.repository.update({ id, userId }, { readAt: new Date() });
  }

  async markAllRead(userId: string, organizationId: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(NotificationEntity)
      .set({ readAt: new Date() })
      .where('user_id = :userId', { userId })
      .andWhere('organization_id = :organizationId', { organizationId })
      .andWhere('read_at IS NULL')
      .execute();
  }

  async existsByDedupeKey(userId: string, dedupeKey: string): Promise<boolean> {
    const count = await this.repository.count({ where: { userId, dedupeKey } });
    return count > 0;
  }
}
