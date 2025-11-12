// ============================================
// IMPORTS
// ============================================
// Third-party imports
import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

// Local imports
import { ProjectTaskEntity } from './project-task.entity';
// Cross-module entity imports
import { UserEntity } from '../../users/entities/user.entity';

/**
 * TaskActivityLogEntity
 * Tracks all changes and activities on project tasks
 * Provides detailed audit trail for task modifications
 */
@Entity('task_activity_log')
@Index(['taskId'])
@Index(['createdAt'])
@Index(['activityType'])
export class TaskActivityLogEntity {
  // ============================================
  // PRIMARY KEY
  // ============================================
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ============================================
  // RELATIONS (Many-to-One)
  // ============================================
  @ManyToOne(() => ProjectTaskEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task?: ProjectTaskEntity;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  // ============================================
  // FOREIGN KEYS
  // ============================================
  @Column({ name: 'task_id', type: 'uuid' })
  taskId!: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string;

  // ============================================
  // ACTIVITY TYPE
  // ============================================
  @Column({ name: 'activity_type', type: 'varchar', length: 50 })
  activityType!: string; // 'status_changed', 'assigned', 'commented', 'updated'

  // ============================================
  // CHANGE DETAILS
  // ============================================
  @Column({ name: 'field_name', type: 'varchar', length: 100, nullable: true })
  fieldName?: string;

  @Column({ name: 'old_value', type: 'text', nullable: true })
  oldValue?: string;

  @Column({ name: 'new_value', type: 'text', nullable: true })
  newValue?: string;

  // ============================================
  // TIMESTAMP
  // ============================================
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
