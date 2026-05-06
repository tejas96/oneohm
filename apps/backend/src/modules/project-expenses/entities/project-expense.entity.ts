import {
  ExpenseCategory,
  ExpensePaidByType,
  PaymentMethod,
  ReimbursementStatus,
} from '@oneohm-epc/shared/types';
import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { ExpenseProductLinkEntity } from './expense-product-link.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ProjectEntity } from '../../projects/entities/project.entity';

/**
 * ProjectExpenseEntity
 *
 * One row per recorded cash outflow against a project. Itemization lives
 * in `expense_product_links` (either BOM-keyed or off-list). All
 * inventory side-effects (PURCHASE on create, compensating RETURN on
 * edit/delete) are written as immutable rows in `inventory_transactions`
 * — see ProjectExpenseService.
 */
@Entity('project_expenses')
@Index(['projectId', 'expenseDate'])
@Index(['projectId', 'category'])
export class ProjectExpenseEntity extends BaseEntity {
  @ManyToOne(() => ProjectEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project?: ProjectEntity;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @Column({ name: 'expense_number', type: 'varchar', length: 50 })
  expenseNumber!: string;

  @Column({ type: 'varchar', length: 30 })
  category!: ExpenseCategory;

  @Column({ name: 'vendor_name', type: 'varchar', length: 255, nullable: true })
  vendorName?: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', length: 3, default: 'INR' })
  currency!: string;

  @Column({ name: 'expense_date', type: 'date' })
  expenseDate!: string;

  @Column({ name: 'payment_method', type: 'varchar', length: 50 })
  paymentMethod!: PaymentMethod;

  @Column({ name: 'paid_by', type: 'varchar', length: 20, default: ExpensePaidByType.COMPANY })
  paidBy!: ExpensePaidByType;

  @Column({ name: 'paid_by_employee_id', type: 'uuid', nullable: true })
  paidByEmployeeId?: string | null;

  @Column({
    name: 'reimbursement_status',
    type: 'varchar',
    length: 30,
    default: ReimbursementStatus.NOT_APPLICABLE,
  })
  reimbursementStatus!: ReimbursementStatus;

  @Column({ name: 'reimbursed_at', type: 'timestamptz', nullable: true })
  reimbursedAt?: Date | null;

  @Column({ name: 'reimbursed_by', type: 'uuid', nullable: true })
  reimbursedBy?: string | null;

  @Column({ name: 'override_used', type: 'boolean', default: false })
  overrideUsed!: boolean;

  @Column({ name: 'override_reason', type: 'varchar', length: 500, nullable: true })
  overrideReason?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @OneToMany(() => ExpenseProductLinkEntity, (link) => link.expense, {
    cascade: ['insert'],
  })
  productLinks?: ExpenseProductLinkEntity[];

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt?: Date | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string | null;
}
