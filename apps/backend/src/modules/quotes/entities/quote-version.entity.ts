import {
  CalculatorInputs,
  PaymentMilestone,
  PricingBreakdown,
  ProjectType,
  QuoteConfigSnapshot,
  SystemType,
} from '@oneohm-epc/shared/types';
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
    enum: SystemType,
  })
  systemType!: SystemType;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'system_size_kw' })
  systemSizeKw!: number;

  @Column({ type: 'integer', name: 'total_wattage_wp' })
  totalWattageWp!: number;

  // ==================== Project Type (moved from quotes) ====================
  @Column({
    type: 'varchar',
    length: 50,
    name: 'project_type',
    enum: ProjectType,
  })
  projectType!: ProjectType;

  // ==================== Top-level Pricing (sortable/filterable) ====================
  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'final_price' })
  finalPrice!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'effective_price', nullable: true })
  effectivePrice?: number;

  // ==================== Calculator Inputs (JSONB) ====================
  @Column({ type: 'jsonb', name: 'calculator_inputs', nullable: true })
  calculatorInputs?: CalculatorInputs;

  // ==================== Pricing Breakdown (JSONB) ====================
  @Column({ type: 'jsonb', name: 'pricing_breakdown' })
  pricingBreakdown!: PricingBreakdown;

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
  @Column({ type: 'jsonb', name: 'config_snapshot', nullable: true })
  configSnapshot?: QuoteConfigSnapshot;

  // ==================== Audit ====================
  @Column({ type: 'uuid', name: 'created_by' })
  createdBy!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'created_by' })
  creator!: UserEntity;
}
