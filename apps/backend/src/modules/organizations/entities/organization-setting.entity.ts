import { SettingDataType } from '@oneohm-epc/shared-types';
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';

import { OrganizationEntity } from './organization.entity';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Organization Setting Entity
 * Key-value configuration storage for organization-specific settings
 */
@Entity('organization_settings')
@Index(['organizationId'])
@Index(['category'])
@Unique(['organizationId', 'key'])
export class OrganizationSettingEntity extends BaseEntity {
  @Column({ type: 'uuid', name: 'organization_id', nullable: false })
  organizationId: string;

  // Setting Details
  @Column({ type: 'varchar', length: 100, nullable: false })
  key: string;

  @Column({ type: 'text', nullable: true })
  value: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'string',
    name: 'data_type',
  })
  dataType: SettingDataType;

  // Metadata
  @Column({ type: 'varchar', length: 50, nullable: true })
  category: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // Audit Fields (inherited from BaseEntity: id, createdAt, updatedAt)
  @Column({ type: 'uuid', nullable: true, name: 'created_by' })
  createdBy: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'updated_by' })
  updatedBy: string | null;

  // Relationships
  @ManyToOne(() => OrganizationEntity, (org) => org.settings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization: OrganizationEntity;
}
