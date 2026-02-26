// ============================================
// IMPORTS
// ============================================
// Shared types
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PaymentTransactionStatus } from '@oneohm-epc/shared-types';

// Third-party imports

// Local imports
import { CreatePaymentDto, UpdatePaymentDto, ReconcilePaymentDto } from '../dto';
import { PaymentEntity } from '../entities/payment.entity';
import { PaymentRepository } from '../repositories/payment.repository';

/**
 * Service for Payment operations
 */
@Injectable()
export class PaymentService {
  constructor(private readonly paymentRepository: PaymentRepository) {}

  // ============================================
  // CREATE
  // ============================================
  async create(dto: CreatePaymentDto, createdBy: string): Promise<PaymentEntity> {
    // Generate payment number if not provided
    const paymentNumber = await this.paymentRepository.getNextPaymentNumber(dto.organizationId);

    // Validate amounts
    if (dto.paidAmount > dto.expectedAmount) {
      throw new BadRequestException('Paid amount cannot exceed expected amount');
    }

    const payment = await this.paymentRepository.create({
      ...dto,
      paymentNumber,
      status: dto.status || PaymentTransactionStatus.PENDING,
      createdBy,
    });

    return payment;
  }

  // ============================================
  // READ
  // ============================================
  async findById(id: string): Promise<PaymentEntity> {
    const payment = await this.paymentRepository.findById(id);

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return payment;
  }

  async findAll(): Promise<PaymentEntity[]> {
    return this.paymentRepository.findAll();
  }

  async findByOrganization(organizationId: string): Promise<PaymentEntity[]> {
    return this.paymentRepository.findByOrganization(organizationId);
  }

  async findByProject(projectId: string, organizationId: string): Promise<PaymentEntity[]> {
    return this.paymentRepository.findByProject(projectId, organizationId);
  }

  async findByMilestone(milestoneId: string): Promise<PaymentEntity[]> {
    return this.paymentRepository.findByMilestone(milestoneId);
  }

  async findByCustomer(customerId: string): Promise<PaymentEntity[]> {
    return this.paymentRepository.findByCustomer(customerId);
  }

  async findByStatus(status: PaymentTransactionStatus): Promise<PaymentEntity[]> {
    return this.paymentRepository.findByStatus(status);
  }

  async findByPaymentNumber(paymentNumber: string): Promise<PaymentEntity> {
    const payment = await this.paymentRepository.findByPaymentNumber(paymentNumber);

    if (!payment) {
      throw new NotFoundException(`Payment with number ${paymentNumber} not found`);
    }

    return payment;
  }

  // ============================================
  // UPDATE
  // ============================================
  async update(id: string, dto: UpdatePaymentDto, updatedBy: string): Promise<PaymentEntity> {
    const payment = await this.findById(id);

    // Validate amounts if being updated
    const expectedAmount = dto.expectedAmount ?? payment.expectedAmount;
    const paidAmount = dto.paidAmount ?? payment.paidAmount;

    if (paidAmount > expectedAmount) {
      throw new BadRequestException('Paid amount cannot exceed expected amount');
    }

    const updated = await this.paymentRepository.update(id, {
      ...dto,
      updatedBy,
    });

    if (!updated) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return updated;
  }

  async updateStatus(
    id: string,
    status: PaymentTransactionStatus,
    updatedBy: string,
  ): Promise<PaymentEntity> {
    return this.update(id, { status }, updatedBy);
  }

  // ============================================
  // RECONCILIATION
  // ============================================
  async reconcile(
    id: string,
    dto: ReconcilePaymentDto,
    reconciledBy: string,
  ): Promise<PaymentEntity> {
    const payment = await this.findById(id);

    // Check if already reconciled
    if (payment.reconciledAt) {
      throw new ConflictException('Payment has already been reconciled');
    }

    // Only cleared payments can be reconciled
    if (payment.status !== PaymentTransactionStatus.CLEARED) {
      throw new BadRequestException(
        `Only cleared payments can be reconciled. Current status: ${payment.status}`,
      );
    }

    const updated = await this.paymentRepository.update(id, {
      reconciledAt: new Date(),
      reconciledBy,
      notes: dto.notes || payment.notes,
    });

    if (!updated) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return updated;
  }

  // ============================================
  // DELETE
  // ============================================
  async delete(id: string): Promise<void> {
    // Check if payment exists
    await this.findById(id);

    const deleted = await this.paymentRepository.softDelete(id);

    if (!deleted) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }
  }

  // ============================================
  // STATISTICS
  // ============================================
  async getProjectPaymentSummary(projectId: string, organizationId: string): Promise<{
    totalExpected: number;
    totalPaid: number;
    pendingAmount: number;
    paymentCount: number;
  }> {
    const [totals, payments] = await Promise.all([
      this.paymentRepository.getTotalAmountByProject(projectId, organizationId),
      this.paymentRepository.findByProject(projectId, organizationId),
    ]);

    return {
      ...totals,
      paymentCount: payments.length,
    };
  }

  async getOrganizationPaymentStats(organizationId: string): Promise<
    Array<{
      status: PaymentTransactionStatus;
      count: number;
      totalAmount: number;
    }>
  > {
    return this.paymentRepository.getPaymentStatsByStatus(organizationId);
  }

  // ============================================
  // UTILITIES
  // ============================================
  async generatePaymentNumber(organizationId: string): Promise<string> {
    return this.paymentRepository.getNextPaymentNumber(organizationId);
  }
}
