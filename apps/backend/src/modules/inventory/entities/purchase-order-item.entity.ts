import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { PurchaseOrderEntity } from './purchase-order.entity';
import { ProductEntity } from '../../products/entities/product.entity';

/**
 * Purchase Order Item Entity
 * Line items for purchase orders
 */
@Entity('purchase_order_items')
@Index(['purchaseOrderId'])
@Index(['productId'])
export class PurchaseOrderItemEntity {
  // ==================== Primary Key ====================

  @Column({ type: 'uuid', primary: true, default: () => 'gen_random_uuid()' })
  id!: string;

  // ==================== Relations ====================

  @ManyToOne(() => PurchaseOrderEntity, (po) => po.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder!: PurchaseOrderEntity;

  @ManyToOne(() => ProductEntity)
  @JoinColumn({ name: 'product_id' })
  product!: ProductEntity;

  // ==================== Foreign Keys ====================

  @Column({ name: 'purchase_order_id', type: 'uuid' })
  purchaseOrderId!: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  // ==================== Quantity ====================

  @Column({ name: 'ordered_quantity', type: 'decimal', precision: 15, scale: 3 })
  orderedQuantity!: number;

  @Column({ name: 'received_quantity', type: 'decimal', precision: 15, scale: 3, default: 0 })
  receivedQuantity!: number;

  // ==================== Pricing ====================

  @Column({ name: 'unit_price', type: 'decimal', precision: 15, scale: 2 })
  unitPrice!: number;

  @Column({ name: 'tax_rate', type: 'decimal', precision: 5, scale: 2, nullable: true })
  taxRate?: number;

  @Column({ name: 'line_total', type: 'decimal', precision: 15, scale: 2 })
  lineTotal!: number;

  // ==================== Notes ====================

  @Column({ type: 'text', nullable: true })
  notes?: string;

  // ==================== Audit Fields ====================

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;
}
