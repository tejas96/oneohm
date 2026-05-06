import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

import { ProjectExpenseEntity } from './project-expense.entity';

/**
 * ExpenseProductLinkEntity
 *
 * Itemization row attached to a project expense. Either:
 *   - `productId` populated → catalog/BOM-keyed line; participates in
 *     procurement aggregation and inventory transactions, OR
 *   - `productId` NULL + `itemName` populated → off-list item, recorded
 *     for transparency only.
 *
 * No FK to `bom_items.id` (BOM may be re-synced) and no FK to the product
 * catalog (deleted/historical products still resolve).
 */
@Entity('expense_product_links')
@Index(['expenseId'])
@Index(['productId'])
export class ExpenseProductLinkEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => ProjectExpenseEntity, (e) => e.productLinks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'expense_id' })
  expense?: ProjectExpenseEntity;

  @Column({ name: 'expense_id', type: 'uuid' })
  expenseId!: string;

  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId?: string | null;

  @Column({ name: 'item_name', type: 'varchar', length: 255, nullable: true })
  itemName?: string | null;

  @Column({ name: 'unit', type: 'varchar', length: 20, nullable: true })
  unit?: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 3 })
  quantity!: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 15, scale: 2, nullable: true })
  unitPrice?: number | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
