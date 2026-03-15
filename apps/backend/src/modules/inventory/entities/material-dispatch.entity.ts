import { MaterialDispatchStatus } from '@oneohm-epc/shared/types';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { MaterialDispatchItemEntity } from './material-dispatch-item.entity';
import { WarehouseEntity } from './warehouse.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { ProjectEntity } from '../../projects/entities/project.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Material Dispatch Entity
 * Tracks material deliveries to project sites
 */
@Entity('material_dispatches')
@Index(['projectId'])
@Index(['warehouseId'])
@Index(['status'])
@Index(['dispatchDate'])
export class MaterialDispatchEntity extends BaseEntity {
  // ==================== Relations ====================

  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'organization_id' })
  organization!: OrganizationEntity;

  @ManyToOne(() => ProjectEntity)
  @JoinColumn({ name: 'project_id' })
  project!: ProjectEntity;

  @ManyToOne(() => WarehouseEntity, (warehouse) => warehouse.materialDispatches)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse!: WarehouseEntity;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator?: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updater?: UserEntity;

  @OneToMany(() => MaterialDispatchItemEntity, (item) => item.dispatch, { cascade: true })
  items!: MaterialDispatchItemEntity[];

  // ==================== Foreign Keys ====================

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId!: string;

  // ==================== Dispatch Info ====================

  @Column({ name: 'dispatch_number', type: 'varchar', length: 50, unique: true })
  dispatchNumber!: string;

  @Column({ name: 'dispatch_date', type: 'date', default: () => 'CURRENT_DATE' })
  dispatchDate!: Date;

  // ==================== Delivery ====================

  @Column({ name: 'expected_delivery_date', type: 'date', nullable: true })
  expectedDeliveryDate?: Date;

  @Column({ name: 'actual_delivery_date', type: 'date', nullable: true })
  actualDeliveryDate?: Date;

  // ==================== Transport ====================

  @Column({ name: 'vehicle_number', type: 'varchar', length: 50, nullable: true })
  vehicleNumber?: string;

  @Column({ name: 'driver_name', type: 'varchar', length: 255, nullable: true })
  driverName?: string;

  @Column({ name: 'driver_phone', type: 'varchar', length: 20, nullable: true })
  driverPhone?: string;

  @Column({ name: 'transport_company', type: 'varchar', length: 255, nullable: true })
  transportCompany?: string;

  // ==================== Status ====================

  @Column({
    type: 'enum',
    enum: MaterialDispatchStatus,
    default: MaterialDispatchStatus.PREPARED,
  })
  status!: MaterialDispatchStatus;

  // ==================== Delivery Confirmation ====================

  @Column({ name: 'delivered_by', type: 'varchar', length: 255, nullable: true })
  deliveredBy?: string;

  @Column({ name: 'received_by', type: 'varchar', length: 255, nullable: true })
  receivedBy?: string;

  @Column({ name: 'receiver_signature', type: 'text', nullable: true })
  receiverSignature?: string;

  // ==================== Notes ====================

  @Column({ type: 'text', nullable: true })
  notes?: string;

  // ==================== Audit Fields ====================

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;
}
