// ============================================
// IMPORTS
// ============================================
import { CommentEntityType } from '@tejas96/shared/types';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { UserEntity } from '../../users/entities/user.entity';

/**
 * CommentEntity
 * Universal commenting system with polymorphic references
 * Supports threading, mentions, attachments, and edit tracking
 * Schema Reference: Lines 1004-1040
 */
@Entity('comments')
@Index(['entityType', 'entityId', 'deletedAt'])
@Index(['createdBy'])
@Index(['parentCommentId'])
@Index(['createdAt'])
export class CommentEntity {
  // ============================================
  // PRIMARY KEY
  // ============================================
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ============================================
  // RELATIONS
  // ============================================

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByUser?: UserEntity;

  @ManyToOne(() => CommentEntity, { nullable: true })
  @JoinColumn({ name: 'parent_comment_id' })
  parentComment?: CommentEntity;

  // ============================================
  // POLYMORPHIC REFERENCE
  // ============================================
  @Column({ name: 'entity_type', type: 'varchar', length: 50 })
  entityType!: CommentEntityType;

  @Column({ name: 'entity_id', type: 'uuid' })
  entityId!: string;

  // ============================================
  // COMMENT CONTENT
  // ============================================
  @Column({ name: 'comment_text', type: 'text' })
  commentText!: string;

  // ============================================
  // THREADING SUPPORT
  // ============================================
  @Column({ name: 'parent_comment_id', type: 'uuid', nullable: true })
  parentCommentId?: string;

  // ============================================
  // MENTIONS
  // ============================================
  @Column({ name: 'mentioned_user_ids', type: 'uuid', array: true, nullable: true })
  mentionedUserIds?: string[];

  // ============================================
  // ATTACHMENTS
  // ============================================
  @Column({ type: 'jsonb', nullable: true })
  attachments?: {
    fileName: string;
    fileUrl: string;
    fileSize?: number;
    mimeType?: string;
  }[];

  // ============================================
  // VISIBILITY
  // ============================================
  @Column({ name: 'is_internal', type: 'boolean', default: true })
  isInternal!: boolean;

  // ============================================
  // EDIT TRACKING
  // ============================================
  @Column({ name: 'is_edited', type: 'boolean', default: false })
  isEdited!: boolean;

  @Column({ name: 'edited_at', type: 'timestamptz', nullable: true })
  editedAt?: Date;

  // ============================================
  // AUDIT FIELDS
  // ============================================
  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt?: Date;
}
