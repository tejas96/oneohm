import { ProjectType } from '@oneohm-epc/shared-types';
import { Column, Entity, JoinColumn, ManyToOne, Index } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';

/**
 * Installation Pricing Entity
 * Stores installation cost configuration based on system size ranges
 *
 * Example: For 3-5KW systems
 * - Electrical work: ₹15,000
 * - Fixed material: ₹8,000
 * - Variable floor cost: ₹2,000 per floor
 * - MSEDCL charges: ₹5,000
 */
@Entity('installation_pricing')
@Index(['organizationId', 'isActive'])
@Index(['minSystemSizeKw', 'maxSystemSizeKw'])
export class InstallationPricing extends BaseEntity {
  /**
   * Organization this pricing belongs to
   */
  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => OrganizationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: OrganizationEntity;

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
   * Maximum system size (in KW) this pricing applies to (exclusive)
   * NULL means unlimited
   */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'max_system_size_kw',
    nullable: true,
  })
  maxSystemSizeKw: number | null;

  /**
   * Project type this pricing applies to
   */
  @Column({
    type: 'enum',
    enum: ProjectType,
    name: 'project_type',
    default: ProjectType.RESIDENTIAL,
  })
  projectType: ProjectType;

  /**
   * Electrical work cost in INR
   * Includes wiring, junction boxes, DB installation
   */
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'electrical_work_cost',
    default: 0,
  })
  electricalWorkCost: number;

  /**
   * Fixed material cost in INR
   * Includes cables, connectors, earthing kit
   */
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'fixed_material_cost',
    default: 0,
  })
  fixedMaterialCost: number;

  /**
   * Variable floor cost in INR (per floor)
   * Additional cost for each floor above ground level
   */
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'variable_floor_cost',
    default: 0,
  })
  variableFloorCost: number;

  /**
   * Floor increment percentage
   * Additional percentage added per floor (e.g., 5%)
   */
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    name: 'floor_increment_percent',
    default: 0,
  })
  floorIncrementPercent: number;

  /**
   * MSEDCL (utility) charges in INR
   * Grid connection and approval charges
   */
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'msedcl_charges',
    default: 0,
  })
  msedclCharges: number;

  /**
   * Supervision charges in INR
   */
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'supervision_charges',
    default: 0,
  })
  supervisionCharges: number;

  /**
   * Transport cost per km in INR
   */
  @Column({
    type: 'decimal',
    precision: 8,
    scale: 2,
    name: 'transport_cost_per_km',
    default: 0,
  })
  transportCostPerKm: number;

  /**
   * GST rate on installation services (typically 12%)
   */
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    name: 'gst_rate',
    default: 12,
  })
  gstRate: number;

  /**
   * Whether this pricing configuration is active
   */
  @Column({
    type: 'boolean',
    name: 'is_active',
    default: true,
  })
  isActive: boolean;

  /**
   * Optional notes about this pricing tier
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  notes: string | null;

  /**
   * Date from which this pricing is effective
   */
  @Column({
    type: 'date',
    name: 'effective_from',
    nullable: true,
  })
  effectiveFrom: Date | null;

  /**
   * Date until which this pricing is effective
   */
  @Column({
    type: 'date',
    name: 'effective_to',
    nullable: true,
  })
  effectiveTo: Date | null;
}
