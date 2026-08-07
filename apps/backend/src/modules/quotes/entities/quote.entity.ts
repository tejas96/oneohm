import { QuoteStatus } from '@tejas96/shared/types';
import { Column, DeleteDateColumn, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { QuoteVersionEntity } from './quote-version.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { CustomerProfileEntity } from '../../customers/entities/customer-profile.entity';
import { CustomerPropertyEntity } from '../../customers/entities/customer-property.entity';
import { EmployeeProfileEntity } from '../../employees/entities/employee-profile.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Quote Entity
 * Lean identity + lifecycle header. All calculation data lives on quote_versions.
 */
@Entity('quotes')
export class QuoteEntity extends BaseEntity {
  // ==================== Relations ====================


  @Column({ type: 'uuid', name: 'customer_id' })
  customerId!: string;

  @ManyToOne(() => CustomerProfileEntity)
  @JoinColumn({ name: 'customer_id' })
  customer!: CustomerProfileEntity;

  @Column({ type: 'uuid', name: 'property_id', nullable: true })
  propertyId?: string;

  @ManyToOne(() => CustomerPropertyEntity, (property) => property.quotes, { nullable: true })
  @JoinColumn({ name: 'property_id' })
  property?: CustomerPropertyEntity;

  @Column({ type: 'uuid', name: 'sales_person_id', nullable: true })
  salesPersonId?: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'sales_person_id' })
  salesPerson?: UserEntity;

  @Column({ type: 'uuid', name: 'reseller_id', nullable: true })
  resellerId?: string;

  @ManyToOne(() => EmployeeProfileEntity, { nullable: true })
  @JoinColumn({ name: 'reseller_id' })
  reseller?: EmployeeProfileEntity;

  // ==================== Quote Info ====================
  @Column({ type: 'varchar', length: 50, unique: true, name: 'quote_number' })
  quoteNumber!: string;

  @Column({ type: 'date', name: 'quote_date', default: () => 'CURRENT_DATE' })
  quoteDate!: Date;

  @Column({ type: 'date', name: 'valid_until' })
  validUntil!: Date;

  @OneToMany(() => QuoteVersionEntity, (version) => version.quote, { cascade: true })
  versions!: QuoteVersionEntity[];

  // ==================== Status ====================
  @Column({
    type: 'varchar',
    length: 20,
    default: QuoteStatus.DRAFT,
    enum: QuoteStatus,
  })
  status!: QuoteStatus;

  // ==================== Acceptance/Rejection ====================
  @Column({ type: 'timestamp with time zone', name: 'accepted_at', nullable: true })
  acceptedAt?: Date;

  @Column({ type: 'text', name: 'accepted_by_customer_signature', nullable: true })
  acceptedByCustomerSignature?: string;

  @Column({ type: 'text', name: 'rejection_reason', nullable: true })
  rejectionReason?: string;

  // ==================== Notes ====================
  @Column({ type: 'text', name: 'internal_notes', nullable: true })
  internalNotes?: string;

  @Column({ type: 'text', name: 'customer_notes', nullable: true })
  customerNotes?: string;

  // ==================== Audit ====================
  @DeleteDateColumn({ type: 'timestamp with time zone', name: 'deleted_at', nullable: true })
  deletedAt?: Date;

  @Column({ type: 'uuid', name: 'created_by' })
  createdBy!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'created_by' })
  creator!: UserEntity;

  @Column({ type: 'uuid', name: 'updated_by', nullable: true })
  updatedBy?: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updater?: UserEntity;
}
