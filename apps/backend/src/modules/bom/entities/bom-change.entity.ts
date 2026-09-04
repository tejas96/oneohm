import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { BomEntity } from './bom.entity';
import { paiseTransformer } from '../../ledger/domain/paise';

export type BomChangeType = 'add' | 'quantity' | 'remove' | 'replace';
export type BomChangeSource = 'quote' | 'site' | 'office';

/**
 * One immutable BOM change fact.
 *
 * Deliberately does NOT extend BaseEntity: that supplies @UpdateDateColumn,
 * which makes TypeORM emit an UPDATE on every save() of a loaded entity — and
 * the append-only trigger rejects UPDATE outright. Same reasoning as
 * LedgerEntryEntity. `id` and `createdAt` are declared locally.
 *
 * `costImpactPaise` is SIGNED: an addition is positive, a removal negative, a
 * replacement the difference. That is why SUM(cost_impact_paise) over a BOM is
 * its variance against the quote with no status machine to keep in sync.
 */
@Entity('bom_changes')
@Index(['bomId', 'createdAt'])
@Index(['bomId', 'productId'])
export class BomChangeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'bom_id', type: 'uuid' })
  bomId!: string;

  @ManyToOne(() => BomEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'bom_id' })
  bom?: BomEntity;

  /**
   * Nullable, because a change need not be about one particular item row.
   *
   * The nullability is NOT a deletion mechanism. This FK is ON DELETE
   * RESTRICT, so a bom_item named by any change row cannot be deleted at all:
   * the delete fails with a plain foreign-key violation naming this
   * constraint. That is intended — removing a line sets quantity = 0, the
   * design never deletes an item row.
   *
   * It was ON DELETE SET NULL until Task 8. That could never fire, because
   * blanking this column is an UPDATE and the append-only trigger rejects
   * UPDATE outright — so deleting a referenced bom_item failed with a 0A000
   * 'bom_changes is append-only' error about a table the caller had not
   * touched.
   */
  @Column({ name: 'bom_item_id', type: 'uuid', nullable: true })
  bomItemId?: string | null;

  /** Soft reference. Survives its item row and needs no FK. */
  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @Column({ name: 'change_type', type: 'varchar', length: 10 })
  changeType!: BomChangeType;

  @Column({ name: 'quantity_before', type: 'numeric', precision: 12, scale: 3, nullable: true })
  quantityBefore?: string | null;

  @Column({ name: 'quantity_after', type: 'numeric', precision: 12, scale: 3, nullable: true })
  quantityAfter?: string | null;

  @Column({ name: 'replaced_product_id', type: 'uuid', nullable: true })
  replacedProductId?: string | null;

  /** The price used to compute this impact. Not the product's price today. */
  @Column({ name: 'unit_price_paise', type: 'bigint', transformer: paiseTransformer })
  unitPricePaise!: number;

  /** Signed. Positive raises the BOM, negative lowers it. */
  @Column({ name: 'cost_impact_paise', type: 'bigint', transformer: paiseTransformer })
  costImpactPaise!: number;

  @Column({ type: 'text' })
  reason!: string;

  @Column({ type: 'varchar', length: 10 })
  source!: BomChangeSource;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;
}
