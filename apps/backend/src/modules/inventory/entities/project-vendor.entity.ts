import { ProjectVendorStatus } from '@oneohm-epc/shared-types';
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';

import { VendorEntity } from './vendor.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ProjectEntity } from '../../projects/entities/project.entity';

/**
 * Project Vendor Entity
 * Links vendors to specific projects with contract details
 */
@Entity('project_vendors')
@Unique(['projectId', 'vendorId', 'vendorRole'])
@Index(['projectId'])
@Index(['vendorId'])
export class ProjectVendorEntity extends BaseEntity {
  // ==================== Relations ====================

  @ManyToOne(() => ProjectEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: ProjectEntity;

  @ManyToOne(() => VendorEntity, (vendor) => vendor.projectVendors)
  @JoinColumn({ name: 'vendor_id' })
  vendor!: VendorEntity;

  // ==================== Foreign Keys ====================

  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @Column({ name: 'vendor_id', type: 'uuid' })
  vendorId!: string;

  // ==================== Vendor Role ====================

  @Column({ name: 'vendor_role', type: 'varchar', length: 100, nullable: true })
  vendorRole?: string;

  // ==================== Contract Details ====================

  @Column({ name: 'contract_value', type: 'decimal', precision: 15, scale: 2, nullable: true })
  contractValue?: number;

  @Column({ name: 'contract_start_date', type: 'date', nullable: true })
  contractStartDate?: Date;

  @Column({ name: 'contract_end_date', type: 'date', nullable: true })
  contractEndDate?: Date;

  // ==================== Status ====================

  @Column({
    type: 'enum',
    enum: ProjectVendorStatus,
    default: ProjectVendorStatus.ACTIVE,
  })
  status!: ProjectVendorStatus;

  // ==================== Notes ====================

  @Column({ type: 'text', nullable: true })
  notes?: string;

  // ==================== Audit Fields ====================

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;
}
