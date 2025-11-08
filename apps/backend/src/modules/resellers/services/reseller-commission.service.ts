import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { CommissionStatus } from '@oneohm-epc/shared-types';

import { ResellerService } from './reseller.service';
import { CreateCommissionDto } from '../dto/create-commission.dto';
import { UpdateCommissionDto } from '../dto/update-commission.dto';
import { ResellerCommissionEntity } from '../entities/reseller-commission.entity';
import { ResellerCommissionRepository } from '../repositories/reseller-commission.repository';

/**
 * Reseller Commission Service
 * Business logic for commission management
 */
@Injectable()
export class ResellerCommissionService {
  private readonly logger = new Logger(ResellerCommissionService.name);

  constructor(
    private readonly commissionRepository: ResellerCommissionRepository,
    private readonly resellerService: ResellerService,
  ) {}

  /**
   * Create a new commission record
   */
  async create(
    organizationId: string,
    createDto: CreateCommissionDto,
    createdBy?: string,
  ): Promise<ResellerCommissionEntity> {
    this.logger.log(`Creating commission for reseller: ${createDto.resellerId}`);

    // Verify reseller exists and belongs to organization
    await this.resellerService.findById(createDto.resellerId, organizationId);

    // Validate commission calculation
    const calculatedAmount = (createDto.projectValue * createDto.commissionPercentage) / 100;
    const tolerance = 0.01; // Allow small floating-point differences

    if (Math.abs(calculatedAmount - createDto.commissionAmount) > tolerance) {
      throw new BadRequestException(
        `Commission amount mismatch. Expected: ${calculatedAmount.toFixed(2)}, Received: ${createDto.commissionAmount}`,
      );
    }

    const commission = await this.commissionRepository.create({
      ...createDto,
      organizationId,
      createdBy,
      updatedBy: createdBy,
    });

    this.logger.log(`Commission created successfully: ${commission.id}`);
    return commission;
  }

  /**
   * Find commission by ID
   */
  async findById(id: string, organizationId: string): Promise<ResellerCommissionEntity> {
    const commission = await this.commissionRepository.findById(id);

    if (commission?.organizationId !== organizationId) {
      throw new NotFoundException(`Commission with ID '${id}' not found`);
    }

    return commission;
  }

  /**
   * Find all commissions for an organization
   */
  async findAll(organizationId: string): Promise<ResellerCommissionEntity[]> {
    return this.commissionRepository.findAll(organizationId);
  }

  /**
   * Find commissions by reseller ID
   */
  async findByResellerId(
    resellerId: string,
    organizationId: string,
  ): Promise<ResellerCommissionEntity[]> {
    // Verify reseller exists and belongs to organization
    await this.resellerService.findById(resellerId, organizationId);

    return this.commissionRepository.findByResellerId(resellerId);
  }

  /**
   * Find commissions by status
   */
  async findByStatus(
    organizationId: string,
    status: CommissionStatus,
  ): Promise<ResellerCommissionEntity[]> {
    return this.commissionRepository.findByStatus(organizationId, status);
  }

  /**
   * Update commission
   */
  async update(
    id: string,
    organizationId: string,
    updateDto: UpdateCommissionDto,
    updatedBy?: string,
  ): Promise<ResellerCommissionEntity> {
    this.logger.log(`Updating commission: ${id}`);

    // Verify commission exists and belongs to organization
    const commission = await this.findById(id, organizationId);

    // Validate status transitions
    if (commission.status === CommissionStatus.PAID) {
      throw new BadRequestException('Cannot update a commission that has already been paid');
    }

    if (commission.status === CommissionStatus.CANCELLED) {
      throw new BadRequestException('Cannot update a cancelled commission');
    }

    // Validate commission calculation if amounts are being updated
    if (updateDto.projectValue !== undefined || updateDto.commissionPercentage !== undefined) {
      const projectValue = updateDto.projectValue ?? commission.projectValue;
      const percentage = updateDto.commissionPercentage ?? commission.commissionPercentage;
      const calculatedAmount = (projectValue * percentage) / 100;

      const amountToCheck = updateDto.commissionAmount ?? commission.commissionAmount;
      const tolerance = 0.01;

      if (Math.abs(calculatedAmount - amountToCheck) > tolerance) {
        throw new BadRequestException(
          `Commission amount mismatch. Expected: ${calculatedAmount.toFixed(2)}, Received: ${amountToCheck}`,
        );
      }

      // If amounts changed but commissionAmount not provided, calculate it
      updateDto.commissionAmount ??= calculatedAmount;
    }

    const updated = await this.commissionRepository.update(id, {
      ...updateDto,
      updatedBy,
    });

    this.logger.log(`Commission updated successfully: ${id}`);
    return updated;
  }

  /**
   * Update commission status (generic status management)
   */
  async updateStatus(
    id: string,
    organizationId: string,
    newStatus: CommissionStatus,
    updatedBy?: string,
  ): Promise<ResellerCommissionEntity> {
    this.logger.log(`Updating commission ${id} status to: ${newStatus}`);

    const commission = await this.findById(id, organizationId);

    if (commission.status === newStatus) {
      throw new BadRequestException(`Commission is already in '${newStatus}' status`);
    }

    // Validate status transitions
    const validTransitions: Record<CommissionStatus, CommissionStatus[]> = {
      [CommissionStatus.PENDING]: [CommissionStatus.APPROVED, CommissionStatus.CANCELLED],
      [CommissionStatus.APPROVED]: [CommissionStatus.PAID, CommissionStatus.CANCELLED],
      [CommissionStatus.PAID]: [], // Cannot transition from paid
      [CommissionStatus.CANCELLED]: [], // Cannot transition from cancelled
    };

    if (!validTransitions[commission.status].includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition commission from '${commission.status}' to '${newStatus}'`,
      );
    }

    const updateData: Partial<ResellerCommissionEntity> = {
      status: newStatus,
      updatedBy,
    };

    // Set approval timestamp and user when approving
    if (newStatus === CommissionStatus.APPROVED) {
      updateData.approvedAt = new Date();
      updateData.approvedBy = updatedBy;
    }

    // Set payment timestamp and user when marking as paid
    if (newStatus === CommissionStatus.PAID) {
      updateData.paidAt = new Date();
      updateData.paidBy = updatedBy;

      // Update reseller's total commission earned
      const totalEarned = await this.commissionRepository.getTotalCommissionEarned(
        commission.resellerId,
        CommissionStatus.PAID,
      );

      await this.resellerService.updatePerformanceMetrics(commission.resellerId, organizationId, {
        totalCommissionEarned: totalEarned + commission.commissionAmount,
      });
    }

    const updated = await this.commissionRepository.update(id, updateData);

    this.logger.log(`Commission status updated successfully: ${id} -> ${newStatus}`);
    return updated;
  }

  /**
   * Delete commission (soft delete)
   */
  async delete(id: string, organizationId: string): Promise<void> {
    this.logger.log(`Deleting commission: ${id}`);

    // Verify commission exists and belongs to organization
    const commission = await this.findById(id, organizationId);

    // Prevent deletion of paid commissions
    if (commission.status === CommissionStatus.PAID) {
      throw new BadRequestException('Cannot delete a commission that has been paid');
    }

    await this.commissionRepository.softDelete(id);

    this.logger.log(`Commission deleted successfully: ${id}`);
  }

  /**
   * Get total commission earned by a reseller
   */
  async getTotalCommissionEarned(resellerId: string, organizationId: string): Promise<number> {
    // Verify reseller exists and belongs to organization
    await this.resellerService.findById(resellerId, organizationId);

    return this.commissionRepository.getTotalCommissionEarned(resellerId, CommissionStatus.PAID);
  }
}
