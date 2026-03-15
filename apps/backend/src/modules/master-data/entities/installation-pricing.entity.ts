import { ProjectType, InstallationCostComponents } from '@oneohm-epc/shared/types';
import { Column, Entity, JoinColumn, ManyToOne, Index } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';

/**
 * Installation Pricing Entity
 *
 * Stores installation cost configuration based on system size ranges.
 * Uses a hybrid approach:
 * - Fixed columns for frequently queried/calculated fields (size range, rates, tax)
 * - JSONB for all cost components (flexible, no schema changes needed)
 *
 * @example
 * For a 3KW residential system:
 * {
 *   minSystemSizeKw: 3,
 *   maxSystemSizeKw: 3,
 *   projectType: 'residential',
 *   transportRatePerKm: 35,
 *   floorIncrementPercent: 25,
 *   gstRate: 18,
 *   costComponents: {
 *     electrical_work: 4200,
 *     fixed_material: 8500,
 *     variable_floor: 4548,
 *     structure_cost: 13336,
 *     installation_labor: 4400,
 *     msedcl_charges: 1500,
 *     loading_unloading: 1500
 *   }
 * }
 */
@Entity('installation_pricing')
@Index(['organizationId', 'isActive'])
@Index(['organizationId', 'minSystemSizeKw', 'maxSystemSizeKw'])
@Index(['organizationId', 'projectType', 'isActive'])
export class InstallationPricing extends BaseEntity {
  // ==================== IDENTITY ====================

  /**
   * Organization this pricing belongs to
   */
  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => OrganizationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: OrganizationEntity;

  /**
   * Display name for this pricing tier
   * Example: "Installation Charges 3KW"
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  name: string | null;

  /**
   * Unique code for this pricing tier
   * Example: "INST-3KW"
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  code: string | null;

  // ==================== SIZE RANGE ====================

  /**
   * Minimum system size (in KW) this pricing applies to (inclusive)
   */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'min_system_size_kw',
  })
  minSystemSizeKw: number;

  /**
   * Maximum system size (in KW) this pricing applies to (inclusive)
   */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'max_system_size_kw',
  })
  maxSystemSizeKw: number;

  // ==================== APPLICABILITY ====================

  /**
   * Project type this pricing applies to
   */
  @Column({
    type: 'varchar',
    length: 30,
    name: 'project_type',
    default: ProjectType.RESIDENTIAL,
  })
  projectType: ProjectType;

  // ==================== VARIABLE RATES (Separate calculation needed) ====================

  /**
   * Transport cost per km in INR
   * Calculated as: transportRatePerKm * distance
   */
  @Column({
    type: 'decimal',
    precision: 8,
    scale: 2,
    name: 'transport_rate_per_km',
    default: 35,
  })
  transportRatePerKm: number;

  /**
   * Floor increment percentage
   * Additional percentage added per floor for variable_floor cost
   * Example: 25% means each floor adds 25% more to the variable_floor cost
   */
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    name: 'floor_increment_percent',
    default: 25,
  })
  floorIncrementPercent: number;

  // ==================== TAX ====================

  /**
   * GST rate on installation services (typically 18%)
   */
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    name: 'gst_rate',
    default: 18,
  })
  gstRate: number;

  // ==================== DYNAMIC COST COMPONENTS ====================

  /**
   * All cost components in INR (JSONB)
   *
   * Standard keys:
   * - electrical_work: Wiring, junction boxes, DB installation
   * - fixed_material: Cables, connectors, earthing kit
   * - variable_floor: Per-floor additional cost (base amount)
   * - structure_cost: Mounting structure cost
   * - installation_labor: Labor charges
   * - msedcl_charges: Grid connection charges
   * - loading_unloading: Material handling charges
   *
   * Add any new cost component without schema change!
   *
   * @example
   * {
   *   "electrical_work": 4200,
   *   "fixed_material": 8500,
   *   "variable_floor": 4548,
   *   "structure_cost": 13336,
   *   "installation_labor": 4400,
   *   "msedcl_charges": 1500,
   *   "loading_unloading": 1500
   * }
   */
  @Column({
    type: 'jsonb',
    name: 'cost_components',
    default: '{}',
  })
  costComponents: InstallationCostComponents;

  // ==================== VALIDITY ====================

  /**
   * Date from which this pricing is effective
   */
  @Column({
    type: 'date',
    name: 'effective_from',
  })
  effectiveFrom: Date;

  /**
   * Date until which this pricing is effective
   * NULL means no end date (currently active)
   */
  @Column({
    type: 'date',
    name: 'effective_to',
    nullable: true,
  })
  effectiveTo: Date | null;

  // ==================== STATUS ====================

  /**
   * Whether this pricing configuration is active
   */
  @Column({
    type: 'boolean',
    name: 'is_active',
    default: true,
  })
  isActive: boolean;

  // ==================== METADATA ====================

  /**
   * Optional notes about this pricing tier
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  notes: string | null;

  // ==================== HELPER METHODS ====================

  /**
   * Get total of all fixed cost components (excludes variable_floor)
   */
  getFixedCostsTotal(): number {
    let total = 0;
    for (const [key, value] of Object.entries(this.costComponents)) {
      if (key !== 'variable_floor' && typeof value === 'number') {
        total += value;
      }
    }
    return total;
  }

  /**
   * Get variable floor base cost
   */
  getVariableFloorBase(): number {
    return this.costComponents.variable_floor || 0;
  }

  /**
   * Get all cost component keys
   */
  getCostComponentKeys(): string[] {
    return Object.keys(this.costComponents);
  }
}
