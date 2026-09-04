import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { BomChangeSource } from './bom-change.entity';
import { BomItemSerialEntity } from './bom-item-serial.entity';
import { BomEntity } from './bom.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { paiseTransformer } from '../../ledger/domain/paise';
import { ProductEntity } from '../../master-data/entities/product.entity';

/**
 * BOM Item Entity
 *
 * A single line item in a bill of materials. `product_id` is a real FK now,
 * so catalog attributes (name, brand, specifications, warranty) are reached
 * by joining `product` rather than snapshotted onto this row. Serial numbers
 * live on `BomItemSerialEntity`, one row per unit — see its own comment for
 * why this table went back to one row per product.
 */
@Entity('bom_items')
@Index(['bomId'])
@Index(['bomId', 'productId'], { unique: true })
export class BomItemEntity extends BaseEntity {
  // ==================== Parent ====================
  @Column({ name: 'bom_id', type: 'uuid' })
  bomId!: string;

  @ManyToOne(() => BomEntity, (bom) => bom.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bom_id' })
  bom!: BomEntity;

  // ==================== Product ====================
  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @ManyToOne(() => ProductEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product?: ProductEntity;

  // ==================== Quantity & Pricing ====================

  /**
   * What the project needs now. NUMERIC because cable is sold in metres and a
   * per_kw line's quantity IS its kW.
   *
   * TypeORM maps numeric to string to avoid float loss. Callers convert
   * deliberately — never assume a number here.
   */
  @Column({ type: 'numeric', precision: 12, scale: 3 })
  quantity!: string;

  /** What the baseline said. NULL means this line was never quoted. */
  @Column({ name: 'quoted_quantity', type: 'numeric', precision: 12, scale: 3, nullable: true })
  quotedQuantity?: string | null;

  @Column({ type: 'varchar', length: 20 })
  unit!: string;

  /**
   * Resolved once through PricingService when the line was added, then never
   * re-read. A catalog price change must not move a signed project's figures.
   */
  @Column({ name: 'unit_price_paise', type: 'bigint', transformer: paiseTransformer })
  unitPricePaise!: number;

  /**
   * per_unit | per_watt | per_kw, snapshotted from the product type. Tells a
   * reader what `quantity` counts even if the type's basis is edited later.
   */
  @Column({ name: 'pricing_basis', type: 'varchar', length: 20 })
  pricingBasis!: string;

  @Column({ type: 'varchar', length: 10 })
  source!: BomChangeSource;

  // ==================== Ordering ====================
  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder!: number;

  // ==================== Audit ====================
  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string | null;

  // ==================== Serialization ====================
  @OneToMany(() => BomItemSerialEntity, (s) => s.bomItem, { cascade: false })
  serials?: BomItemSerialEntity[];
}
