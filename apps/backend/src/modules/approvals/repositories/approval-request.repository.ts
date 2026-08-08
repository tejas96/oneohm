import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ApprovalRequestPriority, ApprovalRequestStatus } from '@tejas96/shared/types';
import { Repository } from 'typeorm';

import { ApprovalRequestEntity } from '../entities';

/**
 * ApprovalRequestRepository
 * Handles data access for approval requests
 */
@Injectable()
export class ApprovalRequestRepository {
  constructor(
    @InjectRepository(ApprovalRequestEntity)
    private readonly repository: Repository<ApprovalRequestEntity>,
  ) {}

  /**
   * Create a new approval request
   */
  async create(request: Partial<ApprovalRequestEntity>): Promise<ApprovalRequestEntity> {
    const newRequest = this.repository.create(request);
    return this.repository.save(newRequest);
  }

  /**
   * Find all requests for an organization
   */
  async findAll(
    page = 1,
    limit = 20,
    filters?: {
      status?: ApprovalRequestStatus;
      priority?: ApprovalRequestPriority;
      referenceType?: string;
      templateId?: string;
      requestedBy?: string;
      fromDate?: string;
      toDate?: string;
      search?: string;
    },
  ): Promise<{ requests: ApprovalRequestEntity[]; total: number }> {
    const query = this.repository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.template', 'template')
      .leftJoinAndSelect('request.currentStage', 'currentStage')
      .leftJoinAndSelect('request.requestedByUser', 'requestedByUser')
      .orderBy('request.submittedAt', 'DESC');

    // Apply filters
    if (filters?.status) {
      query.andWhere('request.status = :status', { status: filters.status });
    }

    if (filters?.priority) {
      query.andWhere('request.priority = :priority', { priority: filters.priority });
    }

    if (filters?.referenceType) {
      query.andWhere('request.reference_type = :referenceType', {
        referenceType: filters.referenceType,
      });
    }

    if (filters?.templateId) {
      query.andWhere('request.template_id = :templateId', {
        templateId: filters.templateId,
      });
    }

    if (filters?.requestedBy) {
      query.andWhere('request.requested_by = :requestedBy', {
        requestedBy: filters.requestedBy,
      });
    }

    if (filters?.fromDate) {
      query.andWhere('request.submitted_at >= :fromDate', {
        fromDate: filters.fromDate,
      });
    }

    if (filters?.toDate) {
      query.andWhere('request.submitted_at <= :toDate', {
        toDate: filters.toDate,
      });
    }

    if (filters?.search) {
      query.andWhere(
        '(request.request_number ILIKE :search OR request.title ILIKE :search OR request.description ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    // Pagination
    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    const [requests, total] = await query.getManyAndCount();

    return { requests, total };
  }

  /**
   * Find request by ID
   */
  async findById(id: string): Promise<ApprovalRequestEntity | null> {
    return this.repository.findOne({
      where: {
        id,
      },
      relations: [
        'template',
        'template.stages',
        'currentStage',
        'history',
        'history.actedByUser',
        'requestedByUser',
      ],
      order: {
        history: {
          actedAt: 'DESC',
        },
        template: {
          stages: {
            stageOrder: 'ASC',
          },
        },
      },
    });
  }

  /**
   * Find request by request number
   */
  async findByRequestNumber(requestNumber: string): Promise<ApprovalRequestEntity | null> {
    return this.repository.findOne({
      where: {
        requestNumber,
      },
      relations: ['template', 'template.stages', 'currentStage', 'history'],
    });
  }

  /**
   * Find requests by reference
   */
  async findByReference(
    referenceType: string,
    referenceId: string,
  ): Promise<ApprovalRequestEntity[]> {
    return this.repository.find({
      where: {
        referenceType,
        referenceId,
      },
      relations: ['template', 'currentStage', 'history'],
      order: {
        submittedAt: 'DESC',
      },
    });
  }

  /**
   * Find pending requests for a user (where user is an approver)
   */
  async findPendingForUser(
    userId: string,
  ): Promise<ApprovalRequestEntity[]> {
    return this.repository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.template', 'template')
      .leftJoinAndSelect('request.currentStage', 'currentStage')
      .andWhere('request.status = :status', { status: ApprovalRequestStatus.IN_PROGRESS })
      .andWhere('(:userId = ANY(currentStage.approver_user_ids))', { userId })
      .orderBy('request.priority', 'DESC')
      .addOrderBy('request.submittedAt', 'ASC')
      .getMany();
  }

  /**
   * Update request
   */
  async update(
    id: string,
    updateData: Record<string, unknown>,
  ): Promise<ApprovalRequestEntity> {
    await this.repository.update(
      {
        id,
      },
      updateData,
    );

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Request not found after update');
    }
    return updated;
  }

  /**
   * Get statistics by status
   */
  async countByStatus(): Promise<Record<ApprovalRequestStatus, number>> {
    const result = await this.repository
      .createQueryBuilder('request')
      .select('request.status', 'status')
      .addSelect('COUNT(request.id)', 'count')
      .groupBy('request.status')
      .getRawMany<{ status: ApprovalRequestStatus; count: string }>();

    const stats: Record<string, number> = {};
    for (const status of Object.values(ApprovalRequestStatus)) {
      stats[status] = 0;
    }

    for (const row of result) {
      stats[row.status] = parseInt(row.count, 10);
    }

    return stats as Record<ApprovalRequestStatus, number>;
  }

  /**
   * Count pending requests
   */
  async countPending(): Promise<number> {
    return this.repository.count({
      where: {
        status: ApprovalRequestStatus.IN_PROGRESS,
      },
    });
  }

  /**
   * Get next request number
   */
  async getNextRequestNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `APR-${year}-`;

    const lastRequest = await this.repository
      .createQueryBuilder('request')
      .where('request.request_number LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('request.requestNumber', 'DESC')
      .getOne();

    if (!lastRequest?.requestNumber) {
      return `${prefix}001`;
    }

    const lastNumber = parseInt(lastRequest.requestNumber.split('-')[2] ?? '0', 10);
    const nextNumber = lastNumber + 1;

    return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
  }
}
