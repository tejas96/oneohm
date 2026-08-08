import { InstallationCostComponents } from '@tejas96/shared/types';
import { Column, Entity, Index } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('installation_pricing')
@Index(['isActive'])
@Index(['minSystemSizeKw', 'maxSystemSizeKw'])
export class InstallationPricing extends BaseEntity {
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'min_system_size_kw',
  })
  minSystemSizeKw: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'max_system_size_kw',
    nullable: true,
  })
  maxSystemSizeKw: number | null;

  @Column({
    type: 'decimal',
    precision: 8,
    scale: 2,
    name: 'transport_rate_per_km',
    default: 35,
  })
  transportRatePerKm: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    name: 'floor_increment_percent',
    default: 25,
  })
  floorIncrementPercent: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    name: 'gst_rate',
    default: 18,
  })
  gstRate: number;

  @Column({
    type: 'jsonb',
    name: 'cost_components',
    default: '{}',
  })
  costComponents: InstallationCostComponents;

  @Column({
    type: 'date',
    name: 'effective_from',
  })
  effectiveFrom: Date;

  @Column({
    type: 'date',
    name: 'effective_to',
    nullable: true,
  })
  effectiveTo: Date | null;

  @Column({
    type: 'boolean',
    name: 'is_active',
    default: true,
  })
  isActive: boolean;

  getFixedCostsTotal(): number {
    const NON_COST_KEYS = new Set(['variable_floor']);
    let total = 0;
    for (const [key, value] of Object.entries(this.costComponents)) {
      if (!NON_COST_KEYS.has(key) && typeof value === 'number') {
        total += value;
      }
    }
    return total;
  }

  getVariableFloorBase(): number {
    return this.costComponents.variable_floor || 0;
  }

  getCostComponentKeys(): string[] {
    return Object.keys(this.costComponents);
  }

  getDisplayLabel(): string {
    if (
      this.maxSystemSizeKw != null &&
      Number(this.maxSystemSizeKw) === Number(this.minSystemSizeKw)
    ) {
      return `${this.minSystemSizeKw}KW`;
    }
    const max = this.maxSystemSizeKw != null ? this.maxSystemSizeKw : '∞';
    return `${this.minSystemSizeKw}-${max}KW`;
  }
}
