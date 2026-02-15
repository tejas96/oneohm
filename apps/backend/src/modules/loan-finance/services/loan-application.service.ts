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

  async create(createDto: CreateLoanApplicationDto): Promise<LoanApplicationResponseDto> {
    // Check for existing loan application for this property
    if (createDto.propertyId) {
      const existing = await this.loanApplicationRepository.findByProperty(createDto.propertyId);
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
    page = 1,
    limit = 20,
  ): Promise<{ data: LoanApplicationResponseDto[]; total: number }> {
    const [applications, total] = await this.loanApplicationRepository.findAll(page, limit);
    const data = plainToInstance(LoanApplicationResponseDto, applications, {
      excludeExtraneousValues: true,
    });
    return { data, total };
  }

  async findById(id: string): Promise<LoanApplicationResponseDto> {
    const application = await this.loanApplicationRepository.findById(id);

    if (!application) {
      throw new NotFoundException(`Loan application with ID ${id} not found`);
    }

    return plainToInstance(LoanApplicationResponseDto, application, {
      excludeExtraneousValues: true,
    });
  }

  async update(
    id: string,
    updateDto: UpdateLoanApplicationDto,
  ): Promise<LoanApplicationResponseDto> {
    const existingApplication = await this.loanApplicationRepository.findById(id);

    if (!existingApplication) {
      throw new NotFoundException(`Loan application with ID ${id} not found`);
    }

    // Validate status transitions if status is being updated
    if (updateDto.status && updateDto.status !== existingApplication.status) {
      this.validateStatusTransition(existingApplication.status, updateDto.status);
    }

    const updated = await this.loanApplicationRepository.update(id, updateDto);

    if (!updated) {
      throw new NotFoundException(`Failed to update loan application with ID ${id}`);
    }

    return plainToInstance(LoanApplicationResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  async delete(id: string): Promise<void> {
    const application = await this.loanApplicationRepository.findById(id);

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

  async findByProperty(propertyId: string): Promise<LoanApplicationResponseDto | null> {
    const application = await this.loanApplicationRepository.findByProperty(propertyId);
    if (!application) {
      return null;
    }

    return plainToInstance(LoanApplicationResponseDto, application, {
      excludeExtraneousValues: true,
    });
  }

  async findByCustomer(customerId: string): Promise<LoanApplicationResponseDto[]> {
    const applications = await this.loanApplicationRepository.findByCustomer(customerId);
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
