import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NPSCategory } from '@oneohm-epc/shared-types';
import { Between, IsNull, Repository } from 'typeorm';

import { CustomerFeedbackEntity } from '../entities/customer-feedback.entity';

/**
 * Repository for Customer Feedback
 */
@Injectable()
export class CustomerFeedbackRepository {
  constructor(
    @InjectRepository(CustomerFeedbackEntity)
    private readonly repository: Repository<CustomerFeedbackEntity>,
  ) {}

  // ============================================
  // BASIC CRUD
  // ============================================

  async create(feedback: Partial<CustomerFeedbackEntity>): Promise<CustomerFeedbackEntity> {
    const entity = this.repository.create(feedback);
    return this.repository.save(entity);
  }

  async findAll(): Promise<CustomerFeedbackEntity[]> {
    return this.repository.find({
      where: { deletedAt: IsNull() },
      relations: ['organization', 'customer', 'respondedByUser', 'createdByUser', 'updatedByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<CustomerFeedbackEntity | null> {
    return this.repository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['organization', 'customer', 'respondedByUser', 'createdByUser', 'updatedByUser'],
    });
  }

  async update(id: string, updateData: Partial<CustomerFeedbackEntity>): Promise<CustomerFeedbackEntity | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.repository.update(id, updateData as any);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.softDelete(id);
    return (result.affected ?? 0) > 0;
  }

  // ============================================
  // QUERY METHODS
  // ============================================

  async findByOrganization(organizationId: string): Promise<CustomerFeedbackEntity[]> {
    return this.repository.find({
      where: { organizationId, deletedAt: IsNull() },
      relations: ['customer', 'respondedByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByProject(projectId: string): Promise<CustomerFeedbackEntity[]> {
    return this.repository.find({
      where: { projectId, deletedAt: IsNull() },
      relations: ['customer', 'respondedByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByCustomer(customerId: string): Promise<CustomerFeedbackEntity[]> {
    return this.repository.find({
      where: { customerId, deletedAt: IsNull() },
      relations: ['respondedByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  async findPublished(): Promise<CustomerFeedbackEntity[]> {
    return this.repository.find({
      where: { isPublished: true, deletedAt: IsNull() },
      relations: ['customer', 'organization'],
      order: { createdAt: 'DESC' },
    });
  }

  async findPublishedByOrganization(organizationId: string): Promise<CustomerFeedbackEntity[]> {
    return this.repository.find({
      where: { organizationId, isPublished: true, deletedAt: IsNull() },
      relations: ['customer'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByNPSCategory(npsCategory: NPSCategory): Promise<CustomerFeedbackEntity[]> {
    return this.repository.find({
      where: { npsCategory, deletedAt: IsNull() },
      relations: ['customer', 'organization'],
      order: { createdAt: 'DESC' },
    });
  }

  async findWithResponse(): Promise<CustomerFeedbackEntity[]> {
    return this.repository
      .createQueryBuilder('feedback')
      .where('feedback.company_response IS NOT NULL')
      .andWhere('feedback.deleted_at IS NULL')
      .leftJoinAndSelect('feedback.customer', 'customer')
      .leftJoinAndSelect('feedback.respondedByUser', 'respondedByUser')
      .orderBy('feedback.responded_at', 'DESC')
      .getMany();
  }

  async findWithoutResponse(): Promise<CustomerFeedbackEntity[]> {
    return this.repository
      .createQueryBuilder('feedback')
      .where('feedback.company_response IS NULL')
      .andWhere('feedback.deleted_at IS NULL')
      .leftJoinAndSelect('feedback.customer', 'customer')
      .orderBy('feedback.created_at', 'ASC')
      .getMany();
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<CustomerFeedbackEntity[]> {
    return this.repository.find({
      where: {
        createdAt: Between(startDate, endDate),
        deletedAt: IsNull(),
      },
      relations: ['customer', 'organization'],
      order: { createdAt: 'DESC' },
    });
  }

  // ============================================
  // NPS CALCULATIONS
  // ============================================

  /**
   * Calculate NPS Score for an organization
   * NPS = (% Promoters - % Detractors)
   * Detractors: 0-6
   * Passives: 7-8
   * Promoters: 9-10
   */
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
    const feedbacks = await this.repository.find({
      where: {
        organizationId,
        deletedAt: IsNull(),
      },
      select: ['npsScore'],
    });

    const totalResponses = feedbacks.filter((f) => f.npsScore !== null).length;

    if (totalResponses === 0) {
      return {
        npsScore: 0,
        totalResponses: 0,
        promoters: 0,
        passives: 0,
        detractors: 0,
        promoterPercentage: 0,
        passivePercentage: 0,
        detractorPercentage: 0,
      };
    }

    const promoters = feedbacks.filter((f) => f.npsScore !== null && f.npsScore >= 9).length;
    const passives = feedbacks.filter((f) => f.npsScore !== null && f.npsScore >= 7 && f.npsScore <= 8).length;
    const detractors = feedbacks.filter((f) => f.npsScore !== null && f.npsScore <= 6).length;

    const promoterPercentage = (promoters / totalResponses) * 100;
    const passivePercentage = (passives / totalResponses) * 100;
    const detractorPercentage = (detractors / totalResponses) * 100;

    const npsScore = promoterPercentage - detractorPercentage;

    return {
      npsScore: Math.round(npsScore * 10) / 10, // Round to 1 decimal
      totalResponses,
      promoters,
      passives,
      detractors,
      promoterPercentage: Math.round(promoterPercentage * 10) / 10,
      passivePercentage: Math.round(passivePercentage * 10) / 10,
      detractorPercentage: Math.round(detractorPercentage * 10) / 10,
    };
  }

  /**
   * Get average rating for an organization
   */
  async getAverageRating(organizationId: string): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('feedback')
      .select('AVG(feedback.overall_rating)', 'avgRating')
      .where('feedback.organization_id = :organizationId', { organizationId })
      .andWhere('feedback.overall_rating IS NOT NULL')
      .andWhere('feedback.deleted_at IS NULL')
      .getRawOne<{ avgRating: string | null }>();

    return result?.avgRating ? parseFloat(result.avgRating) : 0;
  }

  /**
   * Get department-wise average ratings
   */
  async getDepartmentAverages(organizationId: string): Promise<Record<string, number>> {
    const feedbacks = await this.repository.find({
      where: { organizationId, deletedAt: IsNull() },
      select: ['departmentRatings'],
    });

    const departmentTotals: Record<string, { sum: number; count: number }> = {};

    feedbacks.forEach((feedback) => {
      if (feedback.departmentRatings) {
        Object.entries(feedback.departmentRatings).forEach(([dept, rating]) => {
          if (!departmentTotals[dept]) {
            departmentTotals[dept] = { sum: 0, count: 0 };
          }
          departmentTotals[dept].sum += rating;
          departmentTotals[dept].count += 1;
        });
      }
    });

    const averages: Record<string, number> = {};
    Object.entries(departmentTotals).forEach(([dept, data]) => {
      averages[dept] = Math.round((data.sum / data.count) * 10) / 10;
    });

    return averages;
  }

  // ============================================
  // STATISTICS
  // ============================================

  async getStatsByOrganization(organizationId: string): Promise<Record<string, unknown>> {
    const feedbacks = await this.repository.find({
      where: { organizationId, deletedAt: IsNull() },
    });

    const npsData = await this.calculateNPSScore(organizationId);
    const avgRating = await this.getAverageRating(organizationId);
    const deptAverages = await this.getDepartmentAverages(organizationId);

    return {
      total: feedbacks.length,
      published: feedbacks.filter((f) => f.isPublished).length,
      withResponse: feedbacks.filter((f) => f.companyResponse).length,
      withoutResponse: feedbacks.filter((f) => !f.companyResponse).length,
      wouldRecommend: feedbacks.filter((f) => f.wouldRecommend === true).length,
      wouldNotRecommend: feedbacks.filter((f) => f.wouldRecommend === false).length,
      averageRating: Math.round(avgRating * 10) / 10,
      nps: npsData,
      departmentAverages: deptAverages,
    };
  }

  async countByOrganization(organizationId: string): Promise<number> {
    return this.repository.count({
      where: { organizationId, deletedAt: IsNull() },
    });
  }

  async countByProject(projectId: string): Promise<number> {
    return this.repository.count({
      where: { projectId, deletedAt: IsNull() },
    });
  }

  async countByCustomer(customerId: string): Promise<number> {
    return this.repository.count({
      where: { customerId, deletedAt: IsNull() },
    });
  }

  async countPublished(organizationId: string): Promise<number> {
    return this.repository.count({
      where: { organizationId, isPublished: true, deletedAt: IsNull() },
    });
  }
}

