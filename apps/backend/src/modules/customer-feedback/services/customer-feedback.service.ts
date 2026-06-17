import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NPSCategory } from '@tejas96/shared/types';
import { plainToInstance } from 'class-transformer';

import {
  CreateCustomerFeedbackDto,
  CustomerFeedbackResponseDto,
  UpdateCustomerFeedbackDto,
} from '../dto';
import { CustomerFeedbackEntity } from '../entities/customer-feedback.entity';
import { CustomerFeedbackRepository } from '../repositories/customer-feedback.repository';

/**
 * Service for Customer Feedback
 */
@Injectable()
export class CustomerFeedbackService {
  constructor(private readonly feedbackRepository: CustomerFeedbackRepository) {}

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  async create(createDto: CreateCustomerFeedbackDto): Promise<CustomerFeedbackResponseDto> {
    // Calculate NPS category if npsScore is provided
    let npsCategory: NPSCategory | undefined;
    if (createDto.npsScore !== undefined) {
      npsCategory = this.calculateNPSCategory(createDto.npsScore);
    }

    const feedback = await this.feedbackRepository.create({
      ...createDto,
      npsCategory,
    });

    return plainToInstance(CustomerFeedbackResponseDto, feedback, {
      excludeExtraneousValues: true,
    });
  }

  async findAll(): Promise<CustomerFeedbackResponseDto[]> {
    const feedbacks = await this.feedbackRepository.findAll();
    return plainToInstance(CustomerFeedbackResponseDto, feedbacks, {
      excludeExtraneousValues: true,
    });
  }

  async findById(id: string): Promise<CustomerFeedbackResponseDto> {
    const feedback = await this.feedbackRepository.findById(id);
    if (!feedback) {
      throw new NotFoundException(`Customer feedback with ID ${id} not found`);
    }
    return plainToInstance(CustomerFeedbackResponseDto, feedback, {
      excludeExtraneousValues: true,
    });
  }

  async update(
    id: string,
    updateDto: UpdateCustomerFeedbackDto,
  ): Promise<CustomerFeedbackResponseDto> {
    const existing = await this.feedbackRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Customer feedback with ID ${id} not found`);
    }

    // Recalculate NPS category if npsScore is being updated
    let npsCategory: NPSCategory | undefined;
    if (updateDto.npsScore !== undefined) {
      npsCategory = this.calculateNPSCategory(updateDto.npsScore);
    }

    const updateData: Partial<CustomerFeedbackEntity> = {
      ...updateDto,
    };

    if (npsCategory) {
      updateData.npsCategory = npsCategory;
    }

    const updated = await this.feedbackRepository.update(id, updateData);
    if (!updated) {
      throw new NotFoundException(`Customer feedback with ID ${id} not found after update`);
    }

    return plainToInstance(CustomerFeedbackResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  async delete(id: string): Promise<void> {
    const existing = await this.feedbackRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Customer feedback with ID ${id} not found`);
    }

    await this.feedbackRepository.delete(id);
  }

  // ============================================
  // QUERY METHODS
  // ============================================

  async findByOrganization(organizationId: string): Promise<CustomerFeedbackResponseDto[]> {
    const feedbacks = await this.feedbackRepository.findByOrganization(organizationId);
    return plainToInstance(CustomerFeedbackResponseDto, feedbacks, {
      excludeExtraneousValues: true,
    });
  }

  async findByProject(projectId: string): Promise<CustomerFeedbackResponseDto[]> {
    const feedbacks = await this.feedbackRepository.findByProject(projectId);
    return plainToInstance(CustomerFeedbackResponseDto, feedbacks, {
      excludeExtraneousValues: true,
    });
  }

  async findByCustomer(customerId: string): Promise<CustomerFeedbackResponseDto[]> {
    const feedbacks = await this.feedbackRepository.findByCustomer(customerId);
    return plainToInstance(CustomerFeedbackResponseDto, feedbacks, {
      excludeExtraneousValues: true,
    });
  }

  async findPublished(): Promise<CustomerFeedbackResponseDto[]> {
    const feedbacks = await this.feedbackRepository.findPublished();
    return plainToInstance(CustomerFeedbackResponseDto, feedbacks, {
      excludeExtraneousValues: true,
    });
  }

  async findPublishedByOrganization(
    organizationId: string,
  ): Promise<CustomerFeedbackResponseDto[]> {
    const feedbacks = await this.feedbackRepository.findPublishedByOrganization(organizationId);
    return plainToInstance(CustomerFeedbackResponseDto, feedbacks, {
      excludeExtraneousValues: true,
    });
  }

  async findByNPSCategory(npsCategory: NPSCategory): Promise<CustomerFeedbackResponseDto[]> {
    const feedbacks = await this.feedbackRepository.findByNPSCategory(npsCategory);
    return plainToInstance(CustomerFeedbackResponseDto, feedbacks, {
      excludeExtraneousValues: true,
    });
  }

  async findWithResponse(): Promise<CustomerFeedbackResponseDto[]> {
    const feedbacks = await this.feedbackRepository.findWithResponse();
    return plainToInstance(CustomerFeedbackResponseDto, feedbacks, {
      excludeExtraneousValues: true,
    });
  }

  async findWithoutResponse(): Promise<CustomerFeedbackResponseDto[]> {
    const feedbacks = await this.feedbackRepository.findWithoutResponse();
    return plainToInstance(CustomerFeedbackResponseDto, feedbacks, {
      excludeExtraneousValues: true,
    });
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<CustomerFeedbackResponseDto[]> {
    const feedbacks = await this.feedbackRepository.findByDateRange(startDate, endDate);
    return plainToInstance(CustomerFeedbackResponseDto, feedbacks, {
      excludeExtraneousValues: true,
    });
  }

  // ============================================
  // COMPANY RESPONSE
  // ============================================

  async addCompanyResponse(
    id: string,
    response: string,
    respondedBy: string,
  ): Promise<CustomerFeedbackResponseDto> {
    const existing = await this.feedbackRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Customer feedback with ID ${id} not found`);
    }

    const updated = await this.feedbackRepository.update(id, {
      companyResponse: response,
      respondedBy,
      respondedAt: new Date(),
    });

    if (!updated) {
      throw new NotFoundException(`Customer feedback with ID ${id} not found after update`);
    }

    return plainToInstance(CustomerFeedbackResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  async publishFeedback(id: string): Promise<CustomerFeedbackResponseDto> {
    const existing = await this.feedbackRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Customer feedback with ID ${id} not found`);
    }

    const updated = await this.feedbackRepository.update(id, {
      isPublished: true,
    });

    if (!updated) {
      throw new NotFoundException(`Customer feedback with ID ${id} not found after update`);
    }

    return plainToInstance(CustomerFeedbackResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  async unpublishFeedback(id: string): Promise<CustomerFeedbackResponseDto> {
    const existing = await this.feedbackRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Customer feedback with ID ${id} not found`);
    }

    const updated = await this.feedbackRepository.update(id, {
      isPublished: false,
    });

    if (!updated) {
      throw new NotFoundException(`Customer feedback with ID ${id} not found after update`);
    }

    return plainToInstance(CustomerFeedbackResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  // ============================================
  // NPS CALCULATIONS
  // ============================================

  async calculateNPSScore(organizationId: string): Promise<{
    npsScore: number;
    totalResponses: number;
    promoters: number;
    passives: number;
    detractors: number;
    promoterPercentage: number;
    passivePercentage: number;
    detractorPercentage: number;
  }> {
    return this.feedbackRepository.calculateNPSScore(organizationId);
  }

  async getAverageRating(organizationId: string): Promise<number> {
    return this.feedbackRepository.getAverageRating(organizationId);
  }

  async getDepartmentAverages(organizationId: string): Promise<Record<string, number>> {
    return this.feedbackRepository.getDepartmentAverages(organizationId);
  }

  // ============================================
  // STATISTICS
  // ============================================

  async getStatistics(organizationId: string): Promise<Record<string, unknown>> {
    return this.feedbackRepository.getStatsByOrganization(organizationId);
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Calculate NPS category based on score
   * 0-6: Detractor
   * 7-8: Passive
   * 9-10: Promoter
   */
  private calculateNPSCategory(npsScore: number): NPSCategory {
    if (npsScore < 0 || npsScore > 10) {
      throw new BadRequestException('NPS score must be between 0 and 10');
    }

    if (npsScore <= 6) {
      return NPSCategory.DETRACTOR;
    }
    if (npsScore <= 8) {
      return NPSCategory.PASSIVE;
    }
    return NPSCategory.PROMOTER;
  }
}
