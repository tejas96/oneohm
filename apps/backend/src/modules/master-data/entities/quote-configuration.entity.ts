import type {
  GstConfig,
  WattageRoundingConfig,
  PaymentMilestoneConfig,
} from '@oneohm-epc/shared-types';
import { Column, Entity, JoinColumn, ManyToOne, Index } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';

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
 * - Wattage rounding rules
 */
@Entity('quote_configurations')
@Index(['organizationId', 'isActive'], { unique: true, where: '"is_active" = true' })
export class QuoteConfiguration extends BaseEntity {
  // ==================== Foreign Keys ====================

  /**
   * Organization this configuration belongs to
   */
  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId!: string;

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

  // ==================== Wattage Rounding ====================

  /**
   * Wattage Rounding Configuration (JSONB)
   *
   * Example: Round to nearest 10W, 5+ rounds up
   * {
   *   roundTo: 10,
   *   roundUpThreshold: 5
   * }
   *
   * So 547W → 550W (7 >= 5, rounds up)
   * And 544W → 540W (4 < 5, rounds down)
   */
  @Column({
    type: 'jsonb',
    name: 'wattage_rounding',
    default: '{"roundTo": 10, "roundUpThreshold": 5}',
  })
  wattageRounding!: WattageRoundingConfig;

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

  // ==================== Validation ====================

  /**
   * Minimum profit margin percentage (optional)
   * Used for validation during manual pricing
   */
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    name: 'min_profit_margin_percent',
    nullable: true,
  })
  minProfitMarginPercent?: number;

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

  // ==================== Relationships ====================

  /**
   * Organization relationship
   * @lazy Load with: .relations(['organization'])
   */
  @ManyToOne(() => OrganizationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization?: OrganizationEntity;
}
