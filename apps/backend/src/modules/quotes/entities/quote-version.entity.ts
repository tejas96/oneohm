import { PaymentMilestone, QuoteSnapshot } from '@tejas96/shared/types';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { QuoteEntity } from './quote.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Quote Version Entity
 * Maintains immutable version history of quotes.
 * Single source of truth for all calculation data.
 */
@Entity('quote_versions')
export class QuoteVersionEntity extends BaseEntity {
  // ==================== Relations ====================
  @Column({ type: 'uuid', name: 'quote_id' })
  quoteId!: string;

  @ManyToOne(() => QuoteEntity, (quote) => quote.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quote_id' })
  quote!: QuoteEntity;

  // ==================== Version Info ====================
  @Column({ type: 'integer', name: 'version_number' })
  versionNumber!: number;

  // ==================== System Details ====================
  @Column({
    type: 'varchar',
    length: 50,
    name: 'system_type',
  })
  systemType!: string;

  @Column({ type: 'integer', name: 'total_wattage_wp' })
  totalWattageWp!: number;

  // ==================== Project Type (moved from quotes) ====================
  @Column({
    type: 'varchar',
    length: 50,
    name: 'project_type',
  })
  projectType!: string;

  // ==================== Top-level Pricing (sortable/filterable) ====================
  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'final_price' })
  finalPrice!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'effective_price', nullable: true })
  effectivePrice?: number;

  // ==================== Quote Snapshot (JSONB) ====================
  @Column({ type: 'jsonb', name: 'quote_snapshot', nullable: true })
  quoteSnapshot?: QuoteSnapshot;

  // ==================== Payment Milestones (JSONB) ====================
  @Column({ type: 'jsonb', name: 'payment_milestones', nullable: true })
  paymentMilestones?: PaymentMilestone[];

  // ==================== Timeline ====================
  @Column({
    type: 'integer',
    name: 'project_completion_weeks',
    default: 4,
  })
  projectCompletionWeeks!: number;

  // ==================== Version Metadata ====================
  @Column({ type: 'text', name: 'change_summary', nullable: true })
  changeSummary?: string;

  // ==================== Audit ====================
  @Column({ type: 'uuid', name: 'created_by' })
  createdBy!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'created_by' })
  creator!: UserEntity;
}
