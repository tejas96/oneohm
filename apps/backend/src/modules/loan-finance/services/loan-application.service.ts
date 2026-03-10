import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { LoanStatus } from '@oneohm-epc/shared-types';
import { plainToInstance } from 'class-transformer';

import {
  CreateLoanApplicationDto,
  UpdateLoanApplicationDto,
  LoanApplicationResponseDto,
} from '../dto';
import { LoanApplicationRepository } from '../repositories/loan-application.repository';

/**
 * Service for Loan Application business logic
 * Simplified for tracking customer loan interest with external banks.
 * We don't provide loans - customers get them from banks.
 */
@Injectable()
export class LoanApplicationService {
  constructor(private readonly loanApplicationRepository: LoanApplicationRepository) {}

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  async create(
    organizationId: string,
    createDto: CreateLoanApplicationDto,
  ): Promise<LoanApplicationResponseDto> {
    if (createDto.propertyId) {
      const existing = await this.loanApplicationRepository.findByProperty(
        createDto.propertyId,
        organizationId,
      );
      if (existing) {
        throw new BadRequestException(
          `A loan application already exists for property ${createDto.propertyId}`,
        );
      }
    }

    const application = await this.loanApplicationRepository.create({
      ...createDto,
      status: createDto.status || LoanStatus.INITIATED,
    });

    return plainToInstance(LoanApplicationResponseDto, application, {
      excludeExtraneousValues: true,
    });
  }

  async findAll(
    organizationId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: LoanApplicationResponseDto[]; total: number }> {
    const [applications, total] = await this.loanApplicationRepository.findAll(
      organizationId,
      page,
      limit,
    );
    const data = plainToInstance(LoanApplicationResponseDto, applications, {
      excludeExtraneousValues: true,
    });
    return { data, total };
  }

  async findById(organizationId: string, id: string): Promise<LoanApplicationResponseDto> {
    const application = await this.loanApplicationRepository.findById(id, organizationId);

    if (!application) {
      throw new NotFoundException(`Loan application with ID ${id} not found`);
    }

    return plainToInstance(LoanApplicationResponseDto, application, {
      excludeExtraneousValues: true,
    });
  }

  async update(
    organizationId: string,
    id: string,
    updateDto: UpdateLoanApplicationDto,
  ): Promise<LoanApplicationResponseDto> {
    const existingApplication = await this.loanApplicationRepository.findById(id, organizationId);

    if (!existingApplication) {
      throw new NotFoundException(`Loan application with ID ${id} not found`);
    }

    const updated = await this.loanApplicationRepository.update(id, updateDto);

    if (!updated) {
      throw new NotFoundException(`Failed to update loan application with ID ${id}`);
    }

    return plainToInstance(LoanApplicationResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  async updateStatus(
    organizationId: string,
    id: string,
    newStatus: LoanStatus,
    updatedBy: string,
  ): Promise<LoanApplicationResponseDto> {
    const existingApplication = await this.loanApplicationRepository.findById(id, organizationId);

    if (!existingApplication) {
      throw new NotFoundException(`Loan application with ID ${id} not found`);
    }

    this.validateStatusTransition(existingApplication.status, newStatus);

    const updated = await this.loanApplicationRepository.update(id, {
      status: newStatus,
      updatedBy,
    });

    if (!updated) {
      throw new NotFoundException(`Failed to update loan application with ID ${id}`);
    }

    return plainToInstance(LoanApplicationResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  async delete(organizationId: string, id: string): Promise<void> {
    const application = await this.loanApplicationRepository.findById(id, organizationId);

    if (!application) {
      throw new NotFoundException(`Loan application with ID ${id} not found`);
    }

    const deleted = await this.loanApplicationRepository.delete(id);

    if (!deleted) {
      throw new BadRequestException(`Failed to delete loan application with ID ${id}`);
    }
  }

  // ============================================
  // QUERY METHODS
  // ============================================

  async findByProperty(
    organizationId: string,
    propertyId: string,
  ): Promise<LoanApplicationResponseDto | null> {
    const application = await this.loanApplicationRepository.findByProperty(
      propertyId,
      organizationId,
    );
    if (!application) {
      return null;
    }

    return plainToInstance(LoanApplicationResponseDto, application, {
      excludeExtraneousValues: true,
    });
  }

  async findByCustomer(
    organizationId: string,
    customerId: string,
  ): Promise<LoanApplicationResponseDto[]> {
    const applications = await this.loanApplicationRepository.findByCustomer(
      customerId,
      organizationId,
    );
    return plainToInstance(LoanApplicationResponseDto, applications, {
      excludeExtraneousValues: true,
    });
  }

  // ============================================
  // VALIDATION
  // ============================================

  /**
   * Validate status transitions for loan tracking.
   * Simplified flow: initiated -> applied -> approved/rejected/cancelled
   * Special case: cancelled -> initiated (reactivation when user toggles loan back ON)
   */
  private validateStatusTransition(currentStatus: LoanStatus, newStatus: LoanStatus): void {
    const validTransitions: Record<LoanStatus, LoanStatus[]> = {
      [LoanStatus.INITIATED]: [LoanStatus.APPLIED, LoanStatus.CANCELLED],
      [LoanStatus.APPLIED]: [LoanStatus.APPROVED, LoanStatus.REJECTED, LoanStatus.CANCELLED],
      [LoanStatus.APPROVED]: [], // Final state - cannot be modified
      [LoanStatus.REJECTED]: [], // Final state - cannot be modified
      [LoanStatus.CANCELLED]: [LoanStatus.INITIATED], // Allow reactivation
    };

    const allowedStatuses = validTransitions[currentStatus] || [];

    if (!allowedStatuses.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }
}
