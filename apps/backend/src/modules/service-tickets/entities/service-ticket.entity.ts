import {
  ServiceTicketPriority,
  ServiceTicketStatus,
  type ServiceTicketPhoto,
} from '@tejas96/shared/types';
import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { ServiceTicketStatusHistoryEntity } from './service-ticket-status-history.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { CustomerProfileEntity } from '../../customers/entities/customer-profile.entity';
import { EmployeeProfileEntity } from '../../employees/entities/employee-profile.entity';
import { ProjectEntity } from '../../projects/entities/project.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Service Ticket
 *
 * Post-handover complaints, AMC queries and general issues raised against a
 * completed project.
 *
 * Property is intentionally NOT stored here — it is derived through
 * `project.propertyId` (which is NOT NULL) so it cannot go stale if a project
 * is ever re-pointed at a different property.
 */
@Entity('service_tickets')
export class ServiceTicketEntity extends BaseEntity {
  @Column({ name: 'ticket_number', type: 'varchar', length: 50, unique: true })
  ticketNumber: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 20, default: ServiceTicketPriority.MEDIUM })
  priority: ServiceTicketPriority;

  @Column({ type: 'varchar', length: 20, default: ServiceTicketStatus.OPEN })
  status: ServiceTicketStatus;

  // ============================================
  // RELATIONS
  // ============================================

  @ManyToOne(() => CustomerProfileEntity)
  @JoinColumn({ name: 'customer_id' })
  customer: CustomerProfileEntity;

  @Index('idx_service_tickets_customer')
  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @ManyToOne(() => ProjectEntity)
  @JoinColumn({ name: 'project_id' })
  project: ProjectEntity;

  @Index('idx_service_tickets_project')
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @ManyToOne(() => EmployeeProfileEntity, { nullable: true })
  @JoinColumn({ name: 'assigned_to_employee_id' })
  assignedToEmployee: EmployeeProfileEntity | null;

  @Index('idx_service_tickets_assignee')
  @Column({ name: 'assigned_to_employee_id', type: 'uuid', nullable: true })
  assignedToEmployeeId: string | null;

  @Column({ name: 'assigned_at', type: 'timestamptz', nullable: true })
  assignedAt: Date | null;

  // ============================================
  // PHOTOS
  // ============================================

  /** Issue photos, max MAX_SERVICE_TICKET_PHOTOS. Editable until the ticket closes. */
  @Column({ type: 'jsonb', nullable: true })
  photos: ServiceTicketPhoto[] | null;

  // ============================================
  // RESOLUTION
  // ============================================

  @Column({ name: 'resolution_note', type: 'text', nullable: true })
  resolutionNote: string | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt: Date | null;

  // ============================================
  // HISTORY
  // ============================================

  @OneToMany(() => ServiceTicketStatusHistoryEntity, (entry) => entry.ticket)
  statusHistory: ServiceTicketStatusHistoryEntity[];

  // ============================================
  // AUDIT
  // ============================================

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByUser: UserEntity;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser: UserEntity;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt: Date | null;
}
