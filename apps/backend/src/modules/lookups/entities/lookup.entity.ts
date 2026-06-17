import { LookupDataType, LookupScopeType } from '@tejas96/shared/types';
import { Column, DeleteDateColumn, Entity, Index } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('lookups')
@Index(['typeCode'])
export class LookupEntity extends BaseEntity {
  @Column({ name: 'type_code', type: 'varchar', length: 100 })
  typeCode!: string;

  @Column({ name: 'code', type: 'varchar', length: 100 })
  code!: string;

  @Column({ name: 'label', type: 'varchar', length: 255 })
  label!: string;

  @Column({ name: 'value', type: 'varchar', length: 1000, nullable: true })
  value?: string;

  @Column({ name: 'data_type', type: 'varchar', length: 20, nullable: true })
  dataType?: LookupDataType;

  @Column({ name: 'scope_type', type: 'varchar', length: 20, default: LookupScopeType.GLOBAL })
  scopeType!: LookupScopeType;

  @Column({ name: 'scope_id', type: 'uuid', nullable: true })
  scopeId?: string;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId?: string;

  @Column({ name: 'depends_on_id', type: 'uuid', nullable: true })
  dependsOnId?: string;

  @Column({ name: 'order_index', type: 'integer', default: 0 })
  orderIndex!: number;

  @Column({ name: 'color', type: 'varchar', length: 50, nullable: true })
  color?: string;

  @Column({ name: 'icon', type: 'varchar', length: 100, nullable: true })
  icon?: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date;
}
