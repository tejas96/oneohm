import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { LedgerEntryEntity } from './ledger-entry.entity';
import { PaymentMilestoneEntity } from './payment-milestone.entity';
import { paiseTransformer } from '../domain/paise';

/**
 * LedgerAllocationEntity — which milestone a given entry pays, and how much.
 *
 * Kept SEPARATE from the cash row on purpose. Welding `milestone_id` onto an
 * immutable `ledger_entries` row would have frozen the ₹1,04,24,814 of
 * production misallocation permanently; with allocations as their own append-only
 * table, attribution can be corrected after the fact without ever touching the
 * record of the money itself. It is also what lets one receipt split across
 * several milestones — the spill-over behaviour the old system lacked entirely.
 *
 * ⚠️ Like `LedgerEntryEntity`, this deliberately does NOT extend `BaseEntity`:
 * the append-only trigger rejects UPDATE and DELETE.
 *
 * `projectId` is denormalised for exactly one reason — it carries the composite
 * foreign keys `(entry_id, project_id)` and `(milestone_id, project_id)`, which
 * make a cross-project allocation impossible at the database level rather than
 * by code review.
 */
@Entity('ledger_allocations')
@Index(['milestoneId'])
@Index(['entryId'])
export class LedgerAllocationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'entry_id', type: 'uuid' })
  entryId!: string;

  @Column({ name: 'milestone_id', type: 'uuid' })
  milestoneId!: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  /**
   * Signed integer paise, matching the sign of its entry. A reversal's mirror
   * allocations are negative, so `SUM` over this column is self-correcting.
   */
  @Column({ name: 'amount_paise', type: 'bigint', transformer: paiseTransformer })
  amountPaise!: number;

  /**
   * True for allocations derived by the migration waterfall rather than recorded
   * by an operator — the same honesty flag as `valueDateIsInferred`.
   */
  @Column({ name: 'is_inferred', type: 'boolean', default: false })
  isInferred!: boolean;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @ManyToOne(() => LedgerEntryEntity)
  @JoinColumn({ name: 'entry_id' })
  entry?: LedgerEntryEntity;

  @ManyToOne(() => PaymentMilestoneEntity)
  @JoinColumn({ name: 'milestone_id' })
  milestone?: PaymentMilestoneEntity;
}
