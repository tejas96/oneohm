// ============================================
// IMPORTS
// ============================================
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CommentEntityType } from '@tejas96/shared/types';

import { CreateCommentDto, UpdateCommentDto } from '../dto';
import { CommentEntity } from '../entities/comment.entity';
import { CommentRepository } from '../repositories/comment.repository';

/**
 * CommentService
 * Business logic for comments with threading and mentions
 */
@Injectable()
export class CommentService {
  constructor(private readonly commentRepository: CommentRepository) {}

  // ============================================
  // CREATE
  // ============================================
  async create(dto: CreateCommentDto, userId: string): Promise<CommentEntity> {
    // Validate parent comment if replying
    if (dto.parentCommentId) {
      const parentComment = await this.commentRepository.findById(dto.parentCommentId);
      if (!parentComment) {
        throw new NotFoundException(`Parent comment with ID ${dto.parentCommentId} not found`);
      }

      // Ensure reply is for the same entity
      if (parentComment.entityType !== dto.entityType || parentComment.entityId !== dto.entityId) {
        throw new BadRequestException('Reply must be for the same entity as parent comment');
      }
    }

    // Create comment
    const comment = await this.commentRepository.create({
      ...dto,
      createdBy: userId,
    });

    return comment;
  }

  // ============================================
  // READ
  // ============================================
  async findById(id: string): Promise<CommentEntity> {
    const comment = await this.commentRepository.findById(id);
    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }
    return comment;
  }

  async findAll(): Promise<CommentEntity[]> {
    return this.commentRepository.findAll();
  }

  /**
   * Find all comments for a specific entity
   */
  async findByEntity(
    entityType: CommentEntityType,
    entityId: string,
    includeReplies = true,
  ): Promise<CommentEntity[]> {
    return this.commentRepository.findByEntity(entityType, entityId, includeReplies);
  }

  /**
   * Find all replies for a comment (threading)
   */
  async findReplies(commentId: string): Promise<CommentEntity[]> {
    // Verify comment exists
    await this.findById(commentId);
    return this.commentRepository.findReplies(commentId);
  }

  /**
   * Find comments where user is mentioned
   */
  async findMentions(userId: string): Promise<CommentEntity[]> {
    return this.commentRepository.findByMentionedUser(userId);
  }

  /**
   * Find comments by organization
   */
  async findByOrganization(): Promise<CommentEntity[]> {
    return this.commentRepository.findByOrganization();
  }

  /**
   * Find comments by user
   */
  async findByUser(userId: string): Promise<CommentEntity[]> {
    return this.commentRepository.findByUser(userId);
  }

  // ============================================
  // UPDATE
  // ============================================
  async update(id: string, dto: UpdateCommentDto, userId: string): Promise<CommentEntity> {
    const comment = await this.findById(id);

    // Verify user is the author
    if (comment.createdBy !== userId) {
      throw new BadRequestException('You can only edit your own comments');
    }

    // Update comment and mark as edited
    const updatedComment = await this.commentRepository.update(id, {
      ...dto,
      isEdited: true,
      editedAt: new Date(),
    });

    if (!updatedComment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    return updatedComment;
  }

  // ============================================
  // DELETE
  // ============================================
  async delete(id: string, userId: string): Promise<void> {
    const comment = await this.findById(id);

    // Verify user is the author
    if (comment.createdBy !== userId) {
      throw new BadRequestException('You can only delete your own comments');
    }

    await this.commentRepository.softDelete(id);
  }

  // ============================================
  // STATISTICS
  // ============================================
  async getCommentStats(
    entityType: CommentEntityType,
    entityId: string,
  ): Promise<{
    totalComments: number;
    topLevelComments: number;
    replies: number;
  }> {
    const allComments = await this.commentRepository.findByEntity(entityType, entityId, true);
    const topLevelComments = allComments.filter((c) => !c.parentCommentId);
    const replies = allComments.filter((c) => c.parentCommentId);

    return {
      totalComments: allComments.length,
      topLevelComments: topLevelComments.length,
      replies: replies.length,
    };
  }

  async getUnreadMentionsCount(userId: string): Promise<number> {
    return this.commentRepository.countUnreadMentions(userId);
  }

  // ============================================
  // THREADING HELPERS
  // ============================================
  /**
   * Build threaded comment tree structure
   */
  async buildCommentTree(
    entityType: CommentEntityType,
    entityId: string,
  ): Promise<CommentEntity[]> {
    const allComments = await this.commentRepository.findByEntity(entityType, entityId, true);

    // Create a map for quick lookup
    const commentMap = new Map<string, CommentEntity & { replies?: CommentEntity[] }>();
    allComments.forEach((comment) => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Build tree structure
    const rootComments: CommentEntity[] = [];
    commentMap.forEach((comment) => {
      if (comment.parentCommentId) {
        const parent = commentMap.get(comment.parentCommentId);
        if (parent) {
          parent.replies?.push(comment);
        }
      } else {
        rootComments.push(comment);
      }
    });

    return rootComments;
  }
}
