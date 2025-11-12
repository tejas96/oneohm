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
 * TaskTimeLogEntity
 * Tracks time spent on project tasks for billing and reporting
 */
@Entity('task_time_logs')
@Index(['taskId'])
@Index(['userId'])
@Index(['workDate'])
export class TaskTimeLogEntity {
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

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  // ============================================
  // FOREIGN KEYS
  // ============================================
  @Column({ name: 'task_id', type: 'uuid' })
  taskId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  // ============================================
  // TIME TRACKING
  // ============================================
  @Column({ name: 'time_spent_hours', type: 'decimal', precision: 10, scale: 2 })
  timeSpentHours!: number;

  @Column({ name: 'work_date', type: 'date', default: () => 'CURRENT_DATE' })
  workDate!: Date;

  // ============================================
  // DESCRIPTION
  // ============================================
  @Column({ type: 'text', nullable: true })
  workDescription?: string;

  // ============================================
  // BILLING
  // ============================================
  @Column({ name: 'is_billable', type: 'boolean', default: true })
  isBillable!: boolean;

  // ============================================
  // AUDIT FIELDS
  // ============================================
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;
}
