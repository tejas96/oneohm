import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SavedViewEntity } from '../entities/saved-view.entity';
import { type SavedViewResource } from '../types/saved-view-resource';

@Injectable()
export class SavedViewRepository {
  constructor(
    @InjectRepository(SavedViewEntity)
    private readonly repository: Repository<SavedViewEntity>,
  ) {}

  /**
   * List saved views for one (org, user, resource) triplet, ordered by
   * most-recently-updated first so the bar reflects recent activity.
   */
  async findForUser(userId: string, resource: SavedViewResource): Promise<SavedViewEntity[]> {
    return this.repository.find({
      where: { userId, resource },
      order: { updatedAt: 'DESC' },
    });
  }

  async countForUser(userId: string, resource: SavedViewResource): Promise<number> {
    return this.repository.count({ where: { userId, resource } });
  }

  /**
   * Find by id but ALWAYS scoped by organization+user — the only paths
   * into a single saved view. Returning null lets the service decide
   * whether to throw 404; callers must never bypass these scopes.
   */
  async findOneScoped(id: string, userId: string): Promise<SavedViewEntity | null> {
    return this.repository.findOne({ where: { id, userId } });
  }

  async findByName(
    userId: string,
    resource: SavedViewResource,
    name: string,
  ): Promise<SavedViewEntity | null> {
    return this.repository.findOne({
      where: { userId, resource, name },
    });
  }

  async create(data: Partial<SavedViewEntity>): Promise<SavedViewEntity> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async save(entity: SavedViewEntity): Promise<SavedViewEntity> {
    return this.repository.save(entity);
  }

  async deleteScoped(id: string, userId: string): Promise<boolean> {
    const result = await this.repository.delete({ id, userId });
    return (result.affected ?? 0) > 0;
  }
}
