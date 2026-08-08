import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { CustomerProfileEntity } from '../../customers/entities/customer-profile.entity';
import { ProjectEntity } from '../../projects/entities/project.entity';
import { paiseTransformer } from '../domain/paise';

export type LedgerDirection = 'in' | 'out';
export type LedgerEntryType = 'receipt' | 'expense' | 'refund' | 'write_off';

/**
 * LedgerEntryEntity — a single, immutable money fact.
 *
 * ⚠️ This entity deliberately does NOT extend `BaseEntity`.
 *
 * `common/entities/base.entity.ts` supplies `@UpdateDateColumn`, which makes
 * TypeORM emit an `UPDATE` on every `save()` of a loaded entity — and the
 * append-only trigger installed by migration 1851000000006 rejects `UPDATE`
 * outright. The same applies to `@DeleteDateColumn` and `@VersionColumn`: every
 * one of those columns exists to be mutated. `id` and `createdAt` are declared
 * locally instead.
 *
 * Write access is restricted to INSERT. To correct an entry, post a reversing
 * entry (`reverses_id` + negated `amount_paise`) — see `LedgerWriteService.reverse`.
 *
 * `amountPaise` is SIGNED. Money in is positive, money out is negative, and a
 * reversal carries the opposite sign to its target while keeping the same
 * `direction`. That is why `SUM(amount_paise)` is automatically net of
 * reversals everywhere, with no status machine to keep in sync — the defect that
 * made `project_payment_terms.paid_amount` drift.
 */
@Entity('ledger_entries')
@Index(['projectId', 'valueDate'])
@Index(['direction', 'valueDate'])
export class LedgerEntryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  // ============================================
  // SCOPE
  // ============================================

  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId?: string | null;

  @ManyToOne(() => ProjectEntity)
  @JoinColumn({ name: 'project_id' })
  project?: ProjectEntity;

  @ManyToOne(() => CustomerProfileEntity, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer?: CustomerProfileEntity;

  // ============================================
  // IDENTITY + AMOUNT
  // ============================================
  /** `RCP-2026-27-000058`. Migrated rows keep their original payment_number. */
  @Column({ name: 'entry_no', type: 'varchar', length: 60 })
  entryNo!: string;

  @Column({ name: 'entry_type', type: 'varchar', length: 30 })
  entryType!: LedgerEntryType;

  @Column({ name: 'direction', type: 'varchar', length: 3 })
  direction!: LedgerDirection;

  /** Signed integer paise. Never a decimal — see domain/paise.ts. */
  @Column({ name: 'amount_paise', type: 'bigint', transformer: paiseTransformer })
  amountPaise!: number;

  // ============================================
  // VALUE DATE
  // ============================================
  /** The IST business date the money actually moved — not the data-entry date. */
  @Column({ name: 'value_date', type: 'date' })
  valueDate!: string;

  /**
   * True only for rows backfilled from `created_at`, whose true value date is
   * unrecoverable because `payments.payment_date` was dropped by migration
   * 1787000000000. Never set on entries recorded through the API.
   */
  @Column({ name: 'value_date_is_inferred', type: 'boolean', default: false })
  valueDateIsInferred!: boolean;

  // ============================================
  // DETAIL
  // ============================================
  @Column({ name: 'payment_method', type: 'varchar', length: 50, nullable: true })
  paymentMethod?: string | null;

  /** Vendor or payee for money out. */
  @Column({ name: 'counterparty', type: 'varchar', length: 255, nullable: true })
  counterparty?: string | null;

  @Column({ name: 'category', type: 'varchar', length: 30, nullable: true })
  category?: string | null;

  /** UTR, cheque number, or other bank reference. */
  @Column({ name: 'reference', type: 'varchar', length: 255, nullable: true })
  reference?: string | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string | null;

  // ============================================
  // PROVENANCE — permanent, never nulled
  // ============================================
  @Column({ name: 'source_table', type: 'varchar', length: 63, nullable: true })
  sourceTable?: string | null;

  @Column({ name: 'source_id', type: 'uuid', nullable: true })
  sourceId?: string | null;

  // ============================================
  // CORRECTIONS
  // ============================================
  @Column({ name: 'reverses_id', type: 'uuid', nullable: true })
  reversesId?: string | null;

  @Column({ name: 'reversal_reason', type: 'varchar', length: 500, nullable: true })
  reversalReason?: string | null;

  @ManyToOne(() => LedgerEntryEntity, { nullable: true })
  @JoinColumn({ name: 'reverses_id' })
  reverses?: LedgerEntryEntity;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;
}
