import { Column, DeleteDateColumn, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';

import { ProjectEntity } from './project.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * ProjectTeamMemberEntity
 * Represents a team member assigned to a project with their role
 */
@Entity('project_team_members')
@Unique('uq_project_team_member', ['projectId', 'userId'])
export class ProjectTeamMemberEntity extends BaseEntity {
  // ==================== Relations ====================

  @ManyToOne(() => ProjectEntity, (project) => project.teamMembers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: ProjectEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  // ==================== Foreign Keys ====================

  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  // ==================== Role Info ====================

  @Column({ name: 'role_name', type: 'varchar', length: 100 })
  roleName!: string;

  @Column({ name: 'is_project_manager', type: 'boolean', default: false })
  isProjectManager!: boolean;

  @Column({ name: 'rating', type: 'integer', nullable: true })
  rating?: number;

  @Column({ name: 'comment', type: 'text', nullable: true })
  comment?: string;

  // ==================== Timestamps ====================

  @Column({ name: 'joined_at', type: 'timestamp with time zone', default: () => 'NOW()' })
  joinedAt!: Date;

  // ==================== Soft Delete ====================

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp with time zone' })
  deletedAt?: Date;
}
