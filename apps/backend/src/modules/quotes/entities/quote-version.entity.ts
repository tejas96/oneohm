import { PaymentMilestone, SystemType, QuoteConfigSnapshot } from '@oneohm-epc/shared-types';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { QuoteLineItemEntity } from './quote-line-item.entity';
import { QuoteEntity } from './quote.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Quote Version Entity
 * Maintains immutable version history of quotes
 */
@Entity('quote_versions')
export class QuoteVersionEntity extends BaseEntity {
  // ==================== Relations ====================
  @Column({ type: 'uuid', name: 'quote_id' })
  quoteId!: string;

  @ManyToOne(() => QuoteEntity, (quote) => quote.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quote_id' })
  quote!: QuoteEntity;

  @OneToMany(() => QuoteLineItemEntity, (lineItem) => lineItem.quoteVersion, { cascade: true })
  lineItems!: QuoteLineItemEntity[];

  // ==================== Version Info ====================
  @Column({ type: 'integer', name: 'version_number' })
  versionNumber!: number;

  // ==================== System Details ====================
  @Column({
    type: 'varchar',
    length: 50,
    name: 'system_type',
    enum: SystemType,
  })
  systemType!: SystemType;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'system_size_kw' })
  systemSizeKw!: number;

  @Column({ type: 'integer', name: 'total_wattage_wp' })
  totalWattageWp!: number;

  // ==================== Pricing Details ====================
  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'base_price' })
  basePrice!: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'gst_12_on_70_percent',
    nullable: true,
  })
  gst12On70Percent?: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'gst_18_on_30_percent',
    nullable: true,
  })
  gst18On30Percent?: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'total_gst', nullable: true })
  totalGst?: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'total_price' })
  totalPrice!: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'discount_amount',
    default: 0,
  })
  discountAmount!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'final_price' })
  finalPrice!: number;

  // ==================== Subsidy ====================
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'subsidy_amount',
    default: 0,
  })
  subsidyAmount!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'effective_price', nullable: true })
  effectivePrice?: number;

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

  @Column({ type: 'boolean', name: 'is_current', default: true })
  isCurrent!: boolean;

  // ==================== Configuration Snapshot ====================
  /**
   * Captures the pricing configuration at time of quote creation.
   * This ensures historical quotes can be audited even if prices change.
   */
  @Column({ type: 'jsonb', name: 'config_snapshot', nullable: true })
  configSnapshot?: QuoteConfigSnapshot;

  // ==================== Audit ====================
  @Column({ type: 'uuid', name: 'created_by' })
  createdBy!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'created_by' })
  creator!: UserEntity;
}
