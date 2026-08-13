import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { paiseTransformer } from '../../ledger/domain/paise';

export type PendingKind = 'receipt' | 'expense' | 'reversal';
export type PendingStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

/**
 * Money that has been claimed but not yet verified.
 *
 * Unlike {@link LedgerEntryEntity} this row IS mutable — it has a status — and
 * that is exactly why it cannot live in `ledger_entries`, which is INSERT-only
 * and deliberately carries no status machine.
 *
 * Nothing here counts towards any balance. `v_project_balance`,
 * `v_milestone_balance`, the AR and outstanding queries and the KPIs all read
 * `ledger_entries`, which this table does not touch until approval inserts a
 * row there.
 *
 * `amountPaise` follows the ledger's signed convention: money in positive,
 * money out negative. A reversal carries the opposite sign to its target.
 */
@Entity('pending_ledger_entries')
@Index(['status', 'submittedAt'])
export class PendingLedgerEntryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'request_no', type: 'varchar', length: 30, unique: true })
  requestNo!: string;

  @Column({ type: 'varchar', length: 20 })
  kind!: PendingKind;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: PendingStatus;

  // ============================================
  // PAYLOAD — the shape the ledger entry will take
  // ============================================

  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId?: string | null;

  @Column({ name: 'entry_type', type: 'varchar', length: 30 })
  entryType!: string;

  @Column({ type: 'varchar', length: 3 })
  direction!: 'in' | 'out';

  @Column({ name: 'amount_paise', type: 'bigint', transformer: paiseTransformer })
  amountPaise!: number;

  /** The real payment date. Approval never changes it. */
  @Column({ name: 'value_date', type: 'date' })
  valueDate!: string;

  @Column({ name: 'payment_method', type: 'varchar', length: 50, nullable: true })
  paymentMethod?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  counterparty?: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  category?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reference?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  /**
   * Caller-supplied milestone targeting for a receipt. Null means let the FIFO
   * waterfall decide at approval.
   *
   * Opaque here — it is read back whole and handed to `LedgerWriteService`,
   * which validates it against live balances when the payment is approved.
   */
  @Column({ type: 'jsonb', nullable: true })
  allocations?: Array<{ milestoneId: string; amountPaise: number }> | null;

  // ============================================
  // REVERSAL REQUESTS ONLY
  // ============================================

  @Column({ name: 'reverses_entry_id', type: 'uuid', nullable: true })
  reversesEntryId?: string | null;

  @Column({ name: 'reversal_reason', type: 'varchar', length: 500, nullable: true })
  reversalReason?: string | null;

  // ============================================
  // VERIFICATION
  // ============================================

  /** The customer's own evidence — what the approver checks against. */
  @Column({ name: 'proof_document_id', type: 'uuid', nullable: true })
  proofDocumentId?: string | null;

  @Column({ name: 'submitted_by', type: 'uuid' })
  submittedBy!: string;

  @Column({ name: 'submitted_at', type: 'timestamptz' })
  submittedAt!: Date;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy?: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt?: Date | null;

  @Column({ name: 'rejection_reason', type: 'varchar', length: 500, nullable: true })
  rejectionReason?: string | null;

  /** Set on approval. A DB constraint requires it whenever status is approved. */
  @Column({ name: 'ledger_entry_id', type: 'uuid', nullable: true })
  ledgerEntryId?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
