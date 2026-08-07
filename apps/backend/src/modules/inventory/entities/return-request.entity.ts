import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { StockAllocationEntity } from './stock-allocation.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { BomEntity } from '../../bom/entities/bom.entity';
import { UserEntity } from '../../users/entities/user.entity';

export type ReturnRequestStatus = 'pending' | 'completed' | 'cancelled';

/**
 * ReturnRequest Entity
 *
 * Created automatically when a BOM reconcile detects that required quantity
 * has dropped below already-dispatched quantity (over-dispatch).
 * The PM must physically receive the excess units back (complete) or
 * accept the over-dispatch as scope creep (cancel).
 *
 * Completing a request calls StockAllocationService.returnToStock so inventory
 * numbers stay consistent with the physical state.
 */
@Entity('return_requests')
@Index(['allocationId'])
@Index(['status'])
@Index(['bomId'])
export class ReturnRequestEntity extends BaseEntity {
  // ==================== Relations ====================


  @ManyToOne(() => StockAllocationEntity)
  @JoinColumn({ name: 'allocation_id' })
  allocation!: StockAllocationEntity;

  @ManyToOne(() => BomEntity)
  @JoinColumn({ name: 'bom_id' })
  bom!: BomEntity;

  // ==================== Foreign Keys ====================


  @Column({ name: 'allocation_id', type: 'uuid' })
  allocationId!: string;

  @Column({ name: 'bom_id', type: 'uuid' })
  bomId!: string;

  // ==================== Payload ====================

  @Column({ type: 'numeric', precision: 15, scale: 3 })
  quantity!: number;

  @Column({ type: 'text' })
  reason!: string;

  // ==================== Status ====================

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: ReturnRequestStatus;

  // ==================== Resolution ====================

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date;

  @Column({ name: 'completed_by', type: 'uuid', nullable: true })
  completedBy?: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'completed_by' })
  completedByUser?: UserEntity;

  // ==================== Audit ====================

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'created_by' })
  creator!: UserEntity;
}
