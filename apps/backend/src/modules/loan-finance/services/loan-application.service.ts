import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { LoanStatus } from '@oneohm-epc/shared-types';

import { LoanApplicationRepository } from '../repositories/loan-application.repository';
import {
  CreateLoanApplicationDto,
  UpdateLoanApplicationDto,
  LoanApplicationResponseDto,
} from '../dto';
import { plainToInstance } from 'class-transformer';

/**
 * Service for Loan Application business logic
 */
@Injectable()
export class LoanApplicationService {
  constructor(private readonly loanApplicationRepository: LoanApplicationRepository) {}

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  async create(createDto: CreateLoanApplicationDto): Promise<LoanApplicationResponseDto> {
    // Generate application number
    const applicationNumber = await this.loanApplicationRepository.generateApplicationNumber();

    // Set application date to today if not provided
    const applicationDate = new Date();

    const application = await this.loanApplicationRepository.create({
      ...createDto,
      applicationNumber,
      applicationDate,
      status: createDto.status || LoanStatus.INITIATED,
    });

    return plainToInstance(LoanApplicationResponseDto, application, {
      excludeExtraneousValues: true,
    });
  }

  async findAll(): Promise<LoanApplicationResponseDto[]> {
    const applications = await this.loanApplicationRepository.findAll();
    return plainToInstance(LoanApplicationResponseDto, applications, {
      excludeExtraneousValues: true,
    });
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

  async update(id: string, updateDto: UpdateLoanApplicationDto): Promise<LoanApplicationResponseDto> {
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

  async findByOrganization(organizationId: string): Promise<LoanApplicationResponseDto[]> {
    const applications = await this.loanApplicationRepository.findByOrganization(organizationId);
    return plainToInstance(LoanApplicationResponseDto, applications, {
      excludeExtraneousValues: true,
    });
  }

  async findByProject(projectId: string): Promise<LoanApplicationResponseDto[]> {
    const applications = await this.loanApplicationRepository.findByProject(projectId);
    return plainToInstance(LoanApplicationResponseDto, applications, {
      excludeExtraneousValues: true,
    });
  }

  async findByCustomer(customerId: string): Promise<LoanApplicationResponseDto[]> {
    const applications = await this.loanApplicationRepository.findByCustomer(customerId);
    return plainToInstance(LoanApplicationResponseDto, applications, {
      excludeExtraneousValues: true,
    });
  }

  async findByApplicationNumber(applicationNumber: string): Promise<LoanApplicationResponseDto> {
    const application = await this.loanApplicationRepository.findByApplicationNumber(applicationNumber);

    if (!application) {
      throw new NotFoundException(`Loan application with number ${applicationNumber} not found`);
    }

    return plainToInstance(LoanApplicationResponseDto, application, {
      excludeExtraneousValues: true,
    });
  }

  async findByStatus(status: LoanStatus): Promise<LoanApplicationResponseDto[]> {
    const applications = await this.loanApplicationRepository.findByStatus(status);
    return plainToInstance(LoanApplicationResponseDto, applications, {
      excludeExtraneousValues: true,
    });
  }

  // ============================================
  // JAN SAMARTH OPERATIONS
  // ============================================

  async submitToJanSamarth(id: string, janSamarthApplicationId: string): Promise<LoanApplicationResponseDto> {
    const application = await this.loanApplicationRepository.findById(id);

    if (!application) {
      throw new NotFoundException(`Loan application with ID ${id} not found`);
    }

    if (application.janSamarthApplicationId) {
      throw new BadRequestException('Application already submitted to Jan Samarth portal');
    }

    const updated = await this.loanApplicationRepository.update(id, {
      janSamarthApplicationId,
      janSamarthSubmittedAt: new Date(),
      status: LoanStatus.SUBMITTED,
    });

    if (!updated) {
      throw new NotFoundException(`Failed to update loan application with ID ${id}`);
    }

    return plainToInstance(LoanApplicationResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  async findByJanSamarthId(janSamarthApplicationId: string): Promise<LoanApplicationResponseDto> {
    const application = await this.loanApplicationRepository.findByJanSamarthId(janSamarthApplicationId);

    if (!application) {
      throw new NotFoundException(`Loan application with Jan Samarth ID ${janSamarthApplicationId} not found`);
    }

    return plainToInstance(LoanApplicationResponseDto, application, {
      excludeExtraneousValues: true,
    });
  }

  async findSubmittedToJanSamarth(): Promise<LoanApplicationResponseDto[]> {
    const applications = await this.loanApplicationRepository.findSubmittedToJanSamarth();
    return plainToInstance(LoanApplicationResponseDto, applications, {
      excludeExtraneousValues: true,
    });
  }

  async findPendingJanSamarthSubmission(): Promise<LoanApplicationResponseDto[]> {
    const applications = await this.loanApplicationRepository.findPendingJanSamarthSubmission();
    return plainToInstance(LoanApplicationResponseDto, applications, {
      excludeExtraneousValues: true,
    });
  }

  // ============================================
  // SITE VISIT OPERATIONS
  // ============================================

  async scheduleSiteVisit(id: string, scheduledDate: Date): Promise<LoanApplicationResponseDto> {
    const application = await this.loanApplicationRepository.findById(id);

    if (!application) {
      throw new NotFoundException(`Loan application with ID ${id} not found`);
    }

    const updated = await this.loanApplicationRepository.update(id, {
      siteVisitScheduledDate: scheduledDate,
      status: LoanStatus.SITE_VISIT_PENDING,
    });

    if (!updated) {
      throw new NotFoundException(`Failed to update loan application with ID ${id}`);
    }

    return plainToInstance(LoanApplicationResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  async completeSiteVisit(id: string, report: string): Promise<LoanApplicationResponseDto> {
    const application = await this.loanApplicationRepository.findById(id);

    if (!application) {
      throw new NotFoundException(`Loan application with ID ${id} not found`);
    }

    if (!application.siteVisitScheduledDate) {
      throw new BadRequestException('Site visit not scheduled for this application');
    }

    const updated = await this.loanApplicationRepository.update(id, {
      siteVisitCompletedDate: new Date(),
      siteVisitReport: report,
      status: LoanStatus.UNDER_REVIEW,
    });

    if (!updated) {
      throw new NotFoundException(`Failed to update loan application with ID ${id}`);
    }

    return plainToInstance(LoanApplicationResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  async findPendingSiteVisits(): Promise<LoanApplicationResponseDto[]> {
    const applications = await this.loanApplicationRepository.findPendingSiteVisits();
    return plainToInstance(LoanApplicationResponseDto, applications, {
      excludeExtraneousValues: true,
    });
  }

  async findCompletedSiteVisits(): Promise<LoanApplicationResponseDto[]> {
    const applications = await this.loanApplicationRepository.findCompletedSiteVisits();
    return plainToInstance(LoanApplicationResponseDto, applications, {
      excludeExtraneousValues: true,
    });
  }

  // ============================================
  // APPROVAL OPERATIONS
  // ============================================

  async approve(id: string, approvedAmount: number, approvedByLender: string): Promise<LoanApplicationResponseDto> {
    const application = await this.loanApplicationRepository.findById(id);

    if (!application) {
      throw new NotFoundException(`Loan application with ID ${id} not found`);
    }

    const updated = await this.loanApplicationRepository.update(id, {
      approvedAmount,
      approvedByLender,
      approvedAt: new Date(),
      status: LoanStatus.APPROVED,
    });

    if (!updated) {
      throw new NotFoundException(`Failed to update loan application with ID ${id}`);
    }

    return plainToInstance(LoanApplicationResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  async reject(id: string, rejectionReason: string): Promise<LoanApplicationResponseDto> {
    const application = await this.loanApplicationRepository.findById(id);

    if (!application) {
      throw new NotFoundException(`Loan application with ID ${id} not found`);
    }

    const updated = await this.loanApplicationRepository.update(id, {
      rejectionReason,
      rejectedAt: new Date(),
      status: LoanStatus.REJECTED,
    });

    if (!updated) {
      throw new NotFoundException(`Failed to update loan application with ID ${id}`);
    }

    return plainToInstance(LoanApplicationResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  // ============================================
  // DISBURSEMENT OPERATIONS
  // ============================================

  async disburse(
    id: string,
    disbursementAmount: number,
    disbursementReference: string,
  ): Promise<LoanApplicationResponseDto> {
    const application = await this.loanApplicationRepository.findById(id);

    if (!application) {
      throw new NotFoundException(`Loan application with ID ${id} not found`);
    }

    if (application.status !== LoanStatus.APPROVED) {
      throw new BadRequestException('Only approved applications can be disbursed');
    }

    const updated = await this.loanApplicationRepository.update(id, {
      disbursementAmount,
      disbursementReference,
      disbursementDate: new Date(),
      status: LoanStatus.DISBURSED,
    });

    if (!updated) {
      throw new NotFoundException(`Failed to update loan application with ID ${id}`);
    }

    return plainToInstance(LoanApplicationResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  async findByDisbursementDateRange(startDate: Date, endDate: Date): Promise<LoanApplicationResponseDto[]> {
    const applications = await this.loanApplicationRepository.findByDisbursementDateRange(startDate, endDate);
    return plainToInstance(LoanApplicationResponseDto, applications, {
      excludeExtraneousValues: true,
    });
  }

  // ============================================
  // STATISTICS
  // ============================================

  async getStatsByOrganization(organizationId: string): Promise<Record<string, unknown>> {
    return this.loanApplicationRepository.getStatsByOrganization(organizationId);
  }

  // ============================================
  // VALIDATION
  // ============================================

  private validateStatusTransition(currentStatus: LoanStatus, newStatus: LoanStatus): void {
    const validTransitions: Record<LoanStatus, LoanStatus[]> = {
      [LoanStatus.INITIATED]: [
        LoanStatus.DOCUMENTS_PENDING,
        LoanStatus.SUBMITTED,
        LoanStatus.CANCELLED,
      ],
      [LoanStatus.DOCUMENTS_PENDING]: [
        LoanStatus.SUBMITTED,
        LoanStatus.CANCELLED,
      ],
      [LoanStatus.SUBMITTED]: [
        LoanStatus.UNDER_REVIEW,
        LoanStatus.SITE_VISIT_PENDING,
        LoanStatus.REJECTED,
        LoanStatus.CANCELLED,
      ],
      [LoanStatus.UNDER_REVIEW]: [
        LoanStatus.SITE_VISIT_PENDING,
        LoanStatus.APPROVED,
        LoanStatus.REJECTED,
        LoanStatus.CANCELLED,
      ],
      [LoanStatus.SITE_VISIT_PENDING]: [
        LoanStatus.UNDER_REVIEW,
        LoanStatus.APPROVED,
        LoanStatus.REJECTED,
        LoanStatus.CANCELLED,
      ],
      [LoanStatus.APPROVED]: [
        LoanStatus.DISBURSED,
        LoanStatus.CANCELLED,
      ],
      [LoanStatus.DISBURSED]: [],
      [LoanStatus.REJECTED]: [],
      [LoanStatus.CANCELLED]: [],
    };

    const allowedStatuses = validTransitions[currentStatus] || [];

    if (!allowedStatuses.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }
}

