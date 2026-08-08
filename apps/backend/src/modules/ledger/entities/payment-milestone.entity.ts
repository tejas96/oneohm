import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { ProjectEntity } from '../../projects/entities/project.entity';
import { paiseTransformer } from '../domain/paise';

export type MilestoneSource = 'quote_snapshot' | 'manual' | 'change_order';
export type MilestoneStatus = 'active' | 'waived';
export type MilestonePayerType = 'customer' | 'lender';
export type DueDateSource = 'unset' | 'manual' | 'stage_event' | 'offset';

/**
 * PaymentMilestoneEntity — the plan: what this project is expected to collect.
 *
 * Unlike the ledger tables this one IS mutable (a plan can legitimately be
 * amended), so it carries `created_at`/`updated_at` and the standard
 * `trg_payment_milestones_updated_at` trigger.
 *
 * ⚠️ There is deliberately NO `paidAmount` column. That cache — maintained by
 * `POST /receipts` but silently ignored by the legacy `PATCH /payments/:id` —
 * is the single defect this rebuild exists to remove. `pending`/`partial`/`paid`
 * are DERIVED in `v_milestone_balance`; the only stored states are `active` and
 * `waived`.
 *
 * There is also no `deleted_at`. "Cancel" is a hard DELETE, guarded by
 * `ON DELETE RESTRICT` from `ledger_allocations`: a milestone with money against
 * it cannot be removed, one without it can. That is strictly safer than
 * soft-delete, which lets you orphan money by forgetting a `WHERE` predicate —
 * and it removes that predicate from every query in the module.
 */
@Entity('payment_milestones')
@Index(['projectId', 'displayOrder'])
export class PaymentMilestoneEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @ManyToOne(() => ProjectEntity)
  @JoinColumn({ name: 'project_id' })
  project?: ProjectEntity;

  // ============================================
  // PROVENANCE
  // ============================================
  @Column({ name: 'source', type: 'varchar', length: 30, default: 'manual' })
  source!: MilestoneSource;

  @Column({ name: 'source_quote_version_id', type: 'uuid', nullable: true })
  sourceQuoteVersionId?: string | null;

  // ============================================
  // IDENTITY
  // ============================================
  @Column({ name: 'stage', type: 'varchar', length: 100 })
  stage!: string;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'display_order', type: 'int' })
  displayOrder!: number;

  // ============================================
  // AMOUNT
  // ============================================
  @Column({ name: 'amount_paise', type: 'bigint', transformer: paiseTransformer })
  amountPaise!: number;

  /**
   * Display only — `amountPaise` is authoritative. Never recompute an amount
   * from this: the old `expected_percentage` was write-only, never validated to
   * sum to 100, and absent entirely from backfilled rows.
   */
  @Column({ name: 'percentage', type: 'numeric', precision: 9, scale: 6, nullable: true })
  percentage?: number | null;

  /**
   * Who is expected to pay. On a 10/70/20 loan-financed project the 70% is
   * `lender`, so the customer is never chased for the bank's share.
   */
  @Column({ name: 'payer_type', type: 'varchar', length: 20, default: 'customer' })
  payerType!: MilestonePayerType;

  // ============================================
  // DUE DATE
  // ============================================
  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate?: string | null;

  @Column({ name: 'due_date_source', type: 'varchar', length: 20, default: 'unset' })
  dueDateSource!: DueDateSource;

  /** Project stage whose completion makes this milestone due. */
  @Column({ name: 'due_basis_stage', type: 'varchar', length: 100, nullable: true })
  dueBasisStage?: string | null;

  @Column({ name: 'due_offset_days', type: 'int', nullable: true })
  dueOffsetDays?: number | null;

  // ============================================
  // STATUS — stored states only; the rest is derived
  // ============================================
  @Column({ name: 'status', type: 'varchar', length: 10, default: 'active' })
  status!: MilestoneStatus;

  @Column({ name: 'waived_reason', type: 'varchar', length: 500, nullable: true })
  waivedReason?: string | null;

  @Column({ name: 'waived_at', type: 'timestamptz', nullable: true })
  waivedAt?: Date | null;

  @Column({ name: 'waived_by', type: 'uuid', nullable: true })
  waivedBy?: string | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string | null;

  /**
   * Nullable because 39 of 84 migrated `project_payment_terms` rows have no
   * creator recorded, and there is no system user account to attribute them to.
   * Inventing a UUID would violate an FK to `users` if one is ever added.
   */
  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string | null;
}
