// ============================================
// IMPORTS
// ============================================
// Shared types

// Third-party imports
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaymentTransactionStatus } from '@oneohm-epc/shared-types';
import { Repository, IsNull } from 'typeorm';

// Local imports
import { PaymentEntity } from '../entities/payment.entity';

/**
 * Repository for Payment entity operations
 */
@Injectable()
export class PaymentRepository {
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly repository: Repository<PaymentEntity>,
  ) {}

  // ============================================
  // CREATE
  // ============================================
  async create(data: Partial<PaymentEntity>): Promise<PaymentEntity> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  // ============================================
  // READ
  // ============================================
  async findById(id: string): Promise<PaymentEntity | null> {
    return this.repository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['organization', 'project', 'customer', 'reconciledByUser'],
    });
  }

  async findAll(): Promise<PaymentEntity[]> {
    return this.repository.find({
      where: { deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
      relations: ['organization', 'project', 'customer'],
    });
  }

  async findByOrganization(organizationId: string): Promise<PaymentEntity[]> {
    return this.repository.find({
      where: { organizationId, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
      relations: ['project', 'customer'],
    });
  }

  async findByProject(projectId: string, organizationId: string): Promise<PaymentEntity[]> {
    return this.repository.find({
      where: { projectId, organizationId, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
      relations: ['customer', 'reconciledByUser'],
    });
  }

  async findByCustomer(customerId: string): Promise<PaymentEntity[]> {
    return this.repository.find({
      where: { customerId, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
      relations: ['project'],
    });
  }

  async findByStatus(status: PaymentTransactionStatus): Promise<PaymentEntity[]> {
    return this.repository.find({
      where: { status, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
      relations: ['project', 'customer'],
    });
  }

  async findByPaymentNumber(paymentNumber: string): Promise<PaymentEntity | null> {
    return this.repository.findOne({
      where: { paymentNumber, deletedAt: IsNull() },
      relations: ['organization', 'project', 'customer'],
    });
  }

  // ============================================
  // UPDATE
  // ============================================
  async update(id: string, data: Record<string, unknown>): Promise<PaymentEntity | null> {
    await this.repository.update({ id, deletedAt: IsNull() }, data);
    return this.findById(id);
  }

  // ============================================
  // DELETE (Soft Delete)
  // ============================================
  async softDelete(id: string): Promise<boolean> {
    const result = await this.repository.softDelete(id);
    return !!result.affected && result.affected > 0;
  }

  // ============================================
  // AGGREGATIONS & STATISTICS
  // ============================================
  async getTotalAmountByProject(
    projectId: string,
    organizationId: string,
  ): Promise<{
    totalExpected: number;
    totalPaid: number;
    pendingAmount: number;
  }> {
    const result = await this.repository
      .createQueryBuilder('payment')
      .select('SUM(payment.expected_amount)', 'totalExpected')
      .addSelect('SUM(payment.paid_amount)', 'totalPaid')
      .where('payment.project_id = :projectId', { projectId })
      .andWhere('payment.organization_id = :organizationId', { organizationId })
      .andWhere('payment.deleted_at IS NULL')
      .getRawOne<{ totalExpected: string | null; totalPaid: string | null }>();

    const totalExpected = Number(result?.totalExpected ?? 0);
    const totalPaid = Number(result?.totalPaid ?? 0);

    return {
      totalExpected,
      totalPaid,
      pendingAmount: totalExpected - totalPaid,
    };
  }

  async getPaymentStatsByStatus(organizationId: string): Promise<
    Array<{
      status: PaymentTransactionStatus;
      count: number;
      totalAmount: number;
    }>
  > {
    return this.repository
      .createQueryBuilder('payment')
      .select('payment.status', 'status')
      .addSelect('COUNT(payment.id)', 'count')
      .addSelect('SUM(payment.paid_amount)', 'totalAmount')
      .where('payment.organization_id = :organizationId', { organizationId })
      .andWhere('payment.deleted_at IS NULL')
      .groupBy('payment.status')
      .getRawMany();
  }

  // ============================================
  // AUTO-NUMBERING
  // ============================================
  async getNextPaymentNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PAY-${year}`;

    const lastPayment = await this.repository
      .createQueryBuilder('payment')
      .withDeleted()
      .where('payment.organization_id = :organizationId', { organizationId })
      .andWhere('payment.payment_number LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('payment.payment_number', 'DESC')
      .getOne();

    if (!lastPayment) {
      return `${prefix}-001`;
    }

    const lastNumber = lastPayment.paymentNumber.split('-').pop();
    const nextNumber = lastNumber ? parseInt(lastNumber, 10) + 1 : 1;

    return `${prefix}-${nextNumber.toString().padStart(3, '0')}`;
  }
}
