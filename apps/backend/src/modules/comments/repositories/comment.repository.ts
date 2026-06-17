// ============================================
// IMPORTS
// ============================================
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CommentEntityType } from '@tejas96/shared/types';
import { IsNull, Repository } from 'typeorm';

import { CommentEntity } from '../entities/comment.entity';

/**
 * CommentRepository
 * Handles database operations for comments with polymorphic queries
 */
@Injectable()
export class CommentRepository {
  constructor(
    @InjectRepository(CommentEntity)
    private readonly repository: Repository<CommentEntity>,
  ) {}

  // ============================================
  // CREATE
  // ============================================
  async create(data: Partial<CommentEntity>): Promise<CommentEntity> {
    const comment = this.repository.create(data);
    return this.repository.save(comment);
  }

  // ============================================
  // READ - BASIC
  // ============================================
  async findById(id: string): Promise<CommentEntity | null> {
    return this.repository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['createdByUser', 'parentComment'],
    });
  }

  async findAll(): Promise<CommentEntity[]> {
    return this.repository.find({
      where: { deletedAt: IsNull() },
      relations: ['createdByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  // ============================================
  // READ - POLYMORPHIC QUERIES
  // ============================================
  /**
   * Find all comments for a specific entity
   */
  async findByEntity(
    entityType: CommentEntityType,
    entityId: string,
    includeReplies = true,
  ): Promise<CommentEntity[]> {
    const query = this.repository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.createdByUser', 'user')
      .where('comment.entity_type = :entityType', { entityType })
      .andWhere('comment.entity_id = :entityId', { entityId })
      .andWhere('comment.deleted_at IS NULL');

    if (!includeReplies) {
      query.andWhere('comment.parent_comment_id IS NULL');
    }

    query.orderBy('comment.created_at', 'ASC');

    return query.getMany();
  }

  /**
   * Find all replies for a specific comment
   */
  async findReplies(parentCommentId: string): Promise<CommentEntity[]> {
    return this.repository.find({
      where: { parentCommentId, deletedAt: IsNull() },
      relations: ['createdByUser'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Find comments where a user is mentioned
   */
  async findByMentionedUser(userId: string): Promise<CommentEntity[]> {
    return this.repository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.createdByUser', 'user')
      .where(':userId = ANY(comment.mentioned_user_ids)', { userId })
      .andWhere('comment.deleted_at IS NULL')
      .orderBy('comment.created_at', 'DESC')
      .getMany();
  }

  /**
   * Find comments by organization
   */
  async findByOrganization(organizationId: string): Promise<CommentEntity[]> {
    return this.repository.find({
      where: { organizationId, deletedAt: IsNull() },
      relations: ['createdByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find comments created by a user
   */
  async findByUser(userId: string): Promise<CommentEntity[]> {
    return this.repository.find({
      where: { createdBy: userId, deletedAt: IsNull() },
      relations: ['createdByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  // ============================================
  // UPDATE
  // ============================================
  async update(id: string, data: Record<string, unknown>): Promise<CommentEntity | null> {
    await this.repository.update({ id, deletedAt: IsNull() }, data);
    return this.findById(id);
  }

  // ============================================
  // DELETE (SOFT)
  // ============================================
  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }

  // ============================================
  // STATISTICS
  // ============================================
  /**
   * Count comments for a specific entity
   */
  async countByEntity(entityType: CommentEntityType, entityId: string): Promise<number> {
    return this.repository.count({
      where: { entityType, entityId, deletedAt: IsNull() },
    });
  }

  /**
   * Count unread mentions for a user
   */
  async countUnreadMentions(userId: string): Promise<number> {
    return this.repository
      .createQueryBuilder('comment')
      .where(':userId = ANY(comment.mentioned_user_ids)', { userId })
      .andWhere('comment.deleted_at IS NULL')
      .getCount();
  }
}
