import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BomEntity } from './bom.entity';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * BOM Item Entity
 *
 * A single line item in a bill of materials.  All fields are *snapshot* values
 * captured at BOM creation time -- product catalog changes afterwards do not
 * affect the BOM.
 *
 * Type-specific attributes are stored in the `specifications` JSONB column
 * for extensibility:
 *   Panel:     { isDcr, technology, wattagePerPanel, pricePerWatt, performanceWarrantyYears }
 *   Inverter:  { capacityKw }
 *   Structure: { structureType }
 */
@Entity('bom_items')
@Index(['bomId'])
@Index(['bomId', 'groupKey'])
@Index(['serialNumber'])
@Index(['bomId', 'serialNumber'], {
  unique: true,
  where: '"serial_number" IS NOT NULL',
})
export class BomItemEntity extends BaseEntity {
  // ==================== Parent ====================
  @Column({ name: 'bom_id', type: 'uuid' })
  bomId!: string;

  @ManyToOne(() => BomEntity, (bom) => bom.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bom_id' })
  bom!: BomEntity;

  // ==================== Classification ====================
  @Column({ name: 'item_type', type: 'varchar', length: 50 })
  itemType!: string;

  // Traceability reference only -- no FK constraint (product may change/be deleted)
  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId?: string;

  // ==================== Snapshot Fields ====================
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  brand?: string;

  @Column({ type: 'jsonb', default: '{}' })
  specifications!: Record<string, unknown>;

  // ==================== Quantity & Pricing ====================
  @Column({ type: 'integer', default: 1 })
  quantity!: number;

  @Column({ type: 'varchar', length: 20, default: 'nos' })
  unit!: string;

  @Column({ name: 'unit_price', type: 'decimal', precision: 15, scale: 2, nullable: true })
  unitPrice?: number;

  @Column({ name: 'total_price', type: 'decimal', precision: 15, scale: 2, nullable: true })
  totalPrice?: number;

  @Column({ name: 'gst_rate', type: 'decimal', precision: 5, scale: 2, nullable: true })
  gstRate?: number;

  @Column({ name: 'gst_amount', type: 'decimal', precision: 15, scale: 2, nullable: true })
  gstAmount?: number;

  // ==================== Warranty ====================
  @Column({ name: 'warranty_years', type: 'integer', nullable: true })
  warrantyYears?: number;

  // ==================== Serialization ====================
  @Column({ name: 'serial_number', type: 'varchar', length: 100, nullable: true })
  serialNumber?: string;

  @Column({ name: 'group_key', type: 'varchar', length: 64, nullable: true })
  groupKey?: string;

  @Column({ name: 'unit_index', type: 'integer', nullable: true })
  unitIndex?: number;

  // ==================== Ordering ====================
  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder!: number;
}
