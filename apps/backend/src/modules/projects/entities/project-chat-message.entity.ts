import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { ProjectEntity } from './project.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * ProjectChatMessageEntity
 * Represents a chat message between consumers and project team members
 */
@Entity('project_chat_messages')
@Index(['projectId', 'createdAt'])
export class ProjectChatMessageEntity extends BaseEntity {
  // ==================== Relations ====================

  @ManyToOne(() => ProjectEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: ProjectEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_id' })
  sender!: UserEntity;

  // ==================== Foreign Keys ====================

  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @Column({ name: 'sender_id', type: 'uuid' })
  senderId!: string;

  // ==================== Content ====================

  @Column({ name: 'message_text', type: 'text' })
  messageText!: string;

  // ==================== Soft Delete ====================

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp with time zone' })
  deletedAt?: Date;
}
