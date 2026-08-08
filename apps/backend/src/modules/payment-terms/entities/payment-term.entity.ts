import { PaymentTermSource, PaymentTermStatus } from '@tejas96/shared/types';
import {
  Column,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  VersionColumn,
} from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { ProjectEntity } from '../../projects/entities/project.entity';

/**
 * PaymentTermEntity
 *
 * Planned receivable installment for a project. Backed by table
 * `project_payment_terms` (migration 1830000000000). Optimistic concurrency
 * is enforced via the `version` column (TypeORM @VersionColumn) — concurrent
 * updates fail-fast with `OptimisticLockVersionMismatchError`, which the
 * service translates to 409 ConflictException.
 */
@Entity('project_payment_terms')
@Index(['projectId', 'displayOrder'])
@Index(['projectId', 'status'])
export class PaymentTermEntity extends BaseEntity {
  @ManyToOne(() => ProjectEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project?: ProjectEntity;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @Column({ name: 'source_quote_version_id', type: 'uuid', nullable: true })
  sourceQuoteVersionId?: string | null;

  @Column({
    name: 'source',
    type: 'varchar',
    length: 30,
    default: PaymentTermSource.MANUAL,
  })
  source!: PaymentTermSource;

  @Column({ name: 'stage', type: 'varchar', length: 100 })
  stage!: string;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'display_order', type: 'int', default: 1 })
  displayOrder!: number;

  @Column({
    name: 'expected_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
  })
  expectedAmount!: number;

  @Column({
    name: 'expected_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  expectedPercentage?: number | null;

  @Column({ name: 'currency', type: 'varchar', length: 3, default: 'INR' })
  currency!: string;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate?: string | null;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 30,
    default: PaymentTermStatus.PENDING,
  })
  status!: PaymentTermStatus;

  @Column({
    name: 'paid_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  paidAmount!: number;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date | null;

  @Column({ name: 'waived_reason', type: 'varchar', length: 500, nullable: true })
  waivedReason?: string | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string | null;

  @VersionColumn({ name: 'version', type: 'int', default: 0 })
  version!: number;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt?: Date | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string | null;
}
