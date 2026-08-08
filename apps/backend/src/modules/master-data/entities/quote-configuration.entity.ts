import type { GstConfig, PaymentMilestoneConfig, ProfitMarginTier } from '@tejas96/shared/types';
import { Column, DeleteDateColumn, Entity, Index } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Quote Configuration Entity
 * Stores organization-level quote settings
 * Each organization has ONE active configuration
 *
 * This controls:
 * - Quote validity period
 * - Version limits
 * - GST split configuration
 * - Default payment milestones
 */
@Entity('quote_configurations')
@Index(['isActive'], { unique: true, where: '"is_active" = true' })
export class QuoteConfiguration extends BaseEntity {
  // ==================== Foreign Keys ====================

  /**
   * Organization this configuration belongs to
   */

  // ==================== Quote Settings ====================

  /**
   * Default quote validity in days (default: 30)
   */
  @Column({
    type: 'int',
    name: 'default_validity_days',
    default: 30,
  })
  defaultValidityDays!: number;

  /**
   * Maximum allowed versions per quote (default: 3)
   */
  @Column({
    type: 'int',
    name: 'max_versions',
    default: 3,
  })
  maxVersions!: number;

  /**
   * Default project completion weeks
   */
  @Column({
    type: 'int',
    name: 'default_completion_weeks',
    default: 4,
  })
  defaultCompletionWeeks!: number;

  // ==================== GST Configuration ====================

  /**
   * GST Configuration (JSONB)
   *
   * Composite GST for solar EPC:
   * - rate1 (5%): Solar equipment portion (panels + inverters)
   * - rate2 (18%): Services portion (structure + installation)
   * - rate1Percentage (70%): % of base price taxed at rate1
   * - rate2Percentage (30%): % of base price taxed at rate2
   */
  @Column({
    type: 'jsonb',
    name: 'gst_config',
    default: '{"rate1": 5, "rate1Percentage": 70, "rate2": 18, "rate2Percentage": 30}',
  })
  gstConfig!: GstConfig;

  // ==================== Payment Configuration ====================

  /**
   * Default Payment Milestones (JSONB)
   *
   * Example:
   * [
   *   { stage: "advance", name: "Advance", percentage: 10, order: 1 },
   *   { stage: "installation_complete", name: "Installation Complete", percentage: 85, order: 2 },
   *   { stage: "commissioning", name: "Commissioning", percentage: 5, order: 3 }
   * ]
   */
  @Column({
    type: 'jsonb',
    name: 'payment_milestones',
    default:
      '[{"stage":"advance","name":"Advance","percentage":10,"order":1},{"stage":"installation_complete","name":"Installation Complete","percentage":85,"order":2},{"stage":"commissioning","name":"Commissioning","percentage":5,"order":3}]',
  })
  paymentMilestones!: PaymentMilestoneConfig[];

  /**
   * Payment milestones for loan-financed sites (JSONB).
   *
   * When the property has `wants_loan`, the customer funds a smaller advance and
   * the lender releases the bulk on installation — 10/70/20 rather than the
   * self-financed 10/85/5. Nothing branched on the loan flag before this: the
   * onboarding wizard promised "only 10% advance (vs 30% without)" while every
   * quote, financed or not, got the single org template.
   *
   * Configurable rather than a constant because lenders change their release
   * schedules, and because every other number on this table (gst_config,
   * payment_milestones, profit_margin_tiers) is org-editable from the same
   * admin screen. An empty array means "no loan-specific template" and falls
   * back to {@link paymentMilestones}.
   */
  @Column({
    type: 'jsonb',
    name: 'payment_milestones_loan',
    default:
      '[{"stage":"advance","name":"Advance","percentage":10,"order":1},{"stage":"installation_complete","name":"Installation Complete","percentage":70,"order":2},{"stage":"commissioning","name":"Commissioning","percentage":20,"order":3}]',
  })
  paymentMilestonesLoan!: PaymentMilestoneConfig[];

  @Column({
    type: 'jsonb',
    name: 'profit_margin_tiers',
    default: '[]',
  })
  profitMarginTiers!: ProfitMarginTier[];

  // ==================== UI Settings ====================

  /**
   * Whether to show real-time inventory stock in quote UI
   */
  @Column({
    type: 'boolean',
    name: 'show_inventory_stock',
    default: true,
  })
  showInventoryStock!: boolean;

  // ==================== Status ====================

  /**
   * Whether this configuration is currently active
   */
  @Column({
    type: 'boolean',
    name: 'is_active',
    default: true,
  })
  isActive!: boolean;

  // ==================== Metadata ====================

  /**
   * Optional notes
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  notes?: string;

  // ==================== Audit ====================

  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at', nullable: true })
  deletedAt?: Date;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy?: string;

  @Column({ type: 'uuid', name: 'updated_by', nullable: true })
  updatedBy?: string;

  // ==================== Relationships ====================
}
