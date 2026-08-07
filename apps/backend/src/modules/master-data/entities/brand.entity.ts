import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('brands')
@Index(['name'], { unique: true })
export class BrandEntity extends BaseEntity {

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ name: 'manufacturer_name', type: 'varchar', length: 255, nullable: true })
  manufacturerName?: string;

  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website?: string;

  @Column({ name: 'support_contact', type: 'varchar', length: 255, nullable: true })
  supportContact?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;

}
