import { ServiceTicketStatus } from '@tejas96/shared/types';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { UserEntity } from '../../users/entities/user.entity';

import { ServiceTicketEntity } from './service-ticket.entity';

/**
 * One row per status transition, including the ticket's creation
 * (`fromStatus` null, `toStatus` open).
 *
 * Append-only — rows are never updated or deleted individually. This is what
 * answers "who closed this, and when".
 */
@Entity('service_ticket_status_history')
@Index('idx_ticket_status_history_ticket', ['ticketId', 'createdAt'])
export class ServiceTicketStatusHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ServiceTicketEntity, (ticket) => ticket.statusHistory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ticket_id' })
  ticket: ServiceTicketEntity;

  @Column({ name: 'ticket_id', type: 'uuid' })
  ticketId: string;

  /** Null on the creation row. */
  @Column({ name: 'from_status', type: 'varchar', length: 20, nullable: true })
  fromStatus: ServiceTicketStatus | null;

  @Column({ name: 'to_status', type: 'varchar', length: 20 })
  toStatus: ServiceTicketStatus;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'changed_by' })
  changedByUser: UserEntity;

  @Column({ name: 'changed_by', type: 'uuid', nullable: true })
  changedBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
