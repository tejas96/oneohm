import {
  ProjectPriority,
  ProjectStatus,
  type ProjectMetadata,
  type TaskStatusConfig,
} from '@tejas96/shared/types';
import {
  Column,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';

import { ProjectMaterialEntity } from './project-material.entity';
import { ProjectTaskEntity } from './project-task.entity';
import { ProjectTeamMemberEntity } from './project-team-member.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { CustomerPropertyEntity } from '../../customers/entities/customer-property.entity';
import { WarehouseEntity } from '../../inventory/entities/warehouse.entity';
import { QuoteEntity } from '../../quotes/entities/quote.entity';
import { ServiceTicketEntity } from '../../service-tickets/entities/service-ticket.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * ProjectEntity
 * Represents a solar installation project from quote acceptance to handover.
 *
 * Organization, customer, address, and coordinates are derived from the
 * required property relation (OneToOne: one property = one project).
 */
@Entity('projects')
export class ProjectEntity extends BaseEntity {
  // ==================== Identity ====================

  @Column({ type: 'varchar', length: 50, unique: true, name: 'project_number' })
  projectNumber!: string;

  @Column({ type: 'varchar', length: 255, name: 'name' })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // ==================== Quote Reference ====================

  @Column({ type: 'uuid', name: 'quote_id' })
  quoteId!: string;

  /**
   * The quote version this project's contract was struck from, pinned at
   * conversion (migration 1851000000001).
   *
   * Without it, every reader re-derived contract value by taking the LATEST
   * version of the quote — so revising a quote after conversion silently
   * re-priced a signed deal. This is provenance, not a cached total: contract
   * value itself stays derived as SUM(payment_milestones.amount_paise).
   */
  @Column({ type: 'uuid', name: 'contract_quote_version_id', nullable: true })
  contractQuoteVersionId?: string | null;

  // ==================== Status & Progress ====================

  @Column({ type: 'varchar', length: 50, default: ProjectStatus.ACTIVE })
  status!: ProjectStatus;

  @Column({ type: 'varchar', length: 20, default: ProjectPriority.NORMAL })
  priority!: ProjectPriority;

  @Column({ type: 'int', default: 0, name: 'progress_percentage' })
  progressPercentage!: number;

  // ==================== Dates ====================

  @Column({ type: 'date', nullable: true, name: 'start_date' })
  startDate?: Date;

  @Column({ type: 'date', nullable: true, name: 'end_date' })
  endDate?: Date;

  // ==================== Workflow Configuration ====================

  @Column({ name: 'excluded_step_ids', type: 'uuid', array: true, nullable: true })
  excludedStepIds?: string[];

  @Column({ name: 'default_transitions', type: 'jsonb', nullable: true })
  defaultTransitions?: Record<string, string[]>;

  // ==================== Inventory ====================

  /**
   * Default warehouse for stock allocation.
   * Set once by the user; locked (service-layer 409) once any active allocation exists.
   * Required before "Reserve Stock" can run on the BOM tab.
   */
  @Column({ name: 'default_warehouse_id', type: 'uuid', nullable: true })
  defaultWarehouseId?: string;

  @ManyToOne(() => WarehouseEntity, { nullable: true })
  @JoinColumn({ name: 'default_warehouse_id' })
  defaultWarehouse?: WarehouseEntity;

  // ==================== Metadata ====================

  @Column({ type: 'jsonb', nullable: true })
  metadata?: ProjectMetadata;

  @Column({ name: 'task_statuses', type: 'jsonb', nullable: true })
  taskStatuses?: TaskStatusConfig[];

  // ==================== Ownership / Audit ====================

  @Column({ type: 'uuid', name: 'property_id' })
  propertyId!: string;

  @Column({ type: 'uuid', name: 'created_by' })
  createdBy!: string;

  @Column({ type: 'uuid', name: 'updated_by', nullable: true })
  updatedBy?: string;

  @DeleteDateColumn({ type: 'timestamp', nullable: true, name: 'deleted_at' })
  deletedAt?: Date;

  // ==================== Relations ====================

  @OneToOne(() => CustomerPropertyEntity, (property) => property.project)
  @JoinColumn({ name: 'property_id' })
  property!: CustomerPropertyEntity;

  @ManyToOne(() => QuoteEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'quote_id' })
  quote!: QuoteEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'created_by' })
  creator!: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updater?: UserEntity;

  @OneToMany(() => ProjectTaskEntity, (task) => task.project)
  tasks!: ProjectTaskEntity[];

  @OneToMany(() => ProjectMaterialEntity, (material) => material.project)
  materials!: ProjectMaterialEntity[];

  /**
   * Declared purely so the list query can `loadRelationCountAndMap` the active
   * ticket count onto `activeTicketCount`. Never eagerly selected.
   */
  @OneToMany(() => ServiceTicketEntity, (ticket) => ticket.project)
  serviceTickets?: ServiceTicketEntity[];

  /**
   * Open or in-progress tickets. Not a column — populated by
   * `loadRelationCountAndMap` on list queries only.
   */
  activeTicketCount?: number;

  @OneToMany(() => ProjectTeamMemberEntity, (teamMember) => teamMember.project)
  teamMembers!: ProjectTeamMemberEntity[];
}
