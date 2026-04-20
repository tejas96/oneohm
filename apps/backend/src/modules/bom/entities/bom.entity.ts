import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { BomItemEntity } from './bom-item.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Bill of Materials (BOM) Entity
 *
 * Standalone, decoupled header for a bill of materials.
 * Uses a polymorphic (entity_type, entity_id) reference so the same table
 * can serve quote versions, projects, work orders, or any future entity.
 */
@Entity('bom')
@Index(['entityType', 'entityId'], { unique: true })
export class BomEntity extends BaseEntity {
  // ==================== Organization ====================
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'organization_id' })
  organization!: OrganizationEntity;

  // ==================== Identity ====================
  @Column({ name: 'bom_number', type: 'varchar', length: 50, unique: true })
  bomNumber!: string;

  // ==================== Polymorphic Reference ====================
  @Column({ name: 'entity_type', type: 'varchar', length: 50 })
  entityType!: string;

  @Column({ name: 'entity_id', type: 'uuid' })
  entityId!: string;

  // ==================== Summary ====================
  @Column({ type: 'varchar', length: 20, default: 'finalized' })
  status!: string;

  @Column({ name: 'total_items', type: 'integer', default: 0 })
  totalItems!: number;

  @Column({ name: 'total_cost', type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalCost!: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  // ==================== Line Items ====================
  @OneToMany(() => BomItemEntity, (item) => item.bom, { cascade: true, eager: false })
  items!: BomItemEntity[];

  // ==================== Audit ====================
  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'created_by' })
  creator!: UserEntity;
}
