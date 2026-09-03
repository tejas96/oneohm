import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { BomItemEntity } from './bom-item.entity';

/**
 * One serial number for one unit of a BOM line.
 *
 * This table is why bom_items goes back to one row per product. Previously a
 * 12-panel line was 12 rows keyed by group_key + unit_index, with money split
 * across them by splitMoneyEvenly, and a quantity change shuffled rows hard
 * enough that an in-flight serial edit could 404.
 */
@Entity('bom_item_serials')
@Index(['bomItemId'])
@Index(['serialNumber'])
export class BomItemSerialEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'bom_item_id', type: 'uuid' })
  bomItemId!: string;

  @ManyToOne(() => BomItemEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bom_item_id' })
  bomItem?: BomItemEntity;

  @Column({ name: 'serial_number', type: 'varchar', length: 100 })
  serialNumber!: string;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;
}
