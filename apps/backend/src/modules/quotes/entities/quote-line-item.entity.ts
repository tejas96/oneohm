import { ItemCategory } from '@oneohm-epc/shared-types';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { QuoteVersionEntity } from './quote-version.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ProductEntity } from '../../master-data/entities/product.entity';

/**
 * Quote Line Item Entity
 * Individual items/products in a quote version
 */
@Entity('quote_line_items')
export class QuoteLineItemEntity extends BaseEntity {
  // ==================== Relations ====================
  @Column({ type: 'uuid', name: 'quote_version_id' })
  quoteVersionId!: string;

  @ManyToOne(() => QuoteVersionEntity, (version) => version.lineItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quote_version_id' })
  quoteVersion!: QuoteVersionEntity;

  @Column({ type: 'uuid', name: 'product_id', nullable: true })
  productId?: string;

  @ManyToOne(() => ProductEntity, { nullable: true })
  @JoinColumn({ name: 'product_id' })
  product?: ProductEntity;

  // ==================== Item Details ====================
  @Column({
    type: 'varchar',
    length: 50,
    name: 'item_category',
    enum: ItemCategory,
  })
  itemCategory!: ItemCategory;

  @Column({ type: 'varchar', length: 255, name: 'item_name' })
  itemName!: string;

  @Column({ type: 'text', name: 'item_description', nullable: true })
  itemDescription?: string;

  /**
   * Product specifications (flexible JSONB structure)
   * Can include any product-specific details referenced from product catalog
   * or custom specifications for quote line items
   */
  @Column({ type: 'jsonb', nullable: true })
  specifications?: {
    // Common product specifications
    wattage?: number;
    capacity?: number;
    voltage?: string;
    efficiency?: number;
    dimensions?: string;
    weight?: number;
    // Additional flexible fields
    additional?: Record<string, unknown>;
  };

  // ==================== Quantity & Pricing ====================
  @Column({ type: 'integer' })
  quantity!: number;

  @Column({ type: 'varchar', length: 20, name: 'unit_of_measure', nullable: true })
  unitOfMeasure?: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'unit_price' })
  unitPrice!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'line_total' })
  lineTotal!: number;

  // ==================== Tax ====================
  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'tax_rate', nullable: true })
  taxRate?: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'tax_amount', nullable: true })
  taxAmount?: number;

  // ==================== Sort Order ====================
  @Column({ type: 'integer', name: 'display_order', default: 0 })
  displayOrder!: number;
}
