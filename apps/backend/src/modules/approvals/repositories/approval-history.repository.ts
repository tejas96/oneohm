import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ApprovalAction } from '@oneohm-epc/shared-types';
import { Repository } from 'typeorm';

import { ApprovalHistoryEntity } from '../entities';

/**
 * ApprovalHistoryRepository
 * Handles data access for approval history/audit trail
 */
@Injectable()
export class ApprovalHistoryRepository {
  constructor(
    @InjectRepository(ApprovalHistoryEntity)
    private readonly repository: Repository<ApprovalHistoryEntity>,
  ) {}

  /**
   * Create a new history entry
   */
  async create(history: Partial<ApprovalHistoryEntity>): Promise<ApprovalHistoryEntity> {
    const newHistory = this.repository.create(history);
    return this.repository.save(newHistory);
  }

  /**
   * Find history for a request
   */
  async findByRequestId(approvalRequestId: string): Promise<ApprovalHistoryEntity[]> {
    return this.repository.find({
      where: {
        approvalRequestId,
      },
      relations: ['actedByUser', 'stage', 'delegatedFromUser'],
      order: {
        actedAt: 'DESC',
      },
    });
  }

  /**
   * Find history for a stage
   */
  async findByStageId(
    approvalRequestId: string,
    stageId: string,
  ): Promise<ApprovalHistoryEntity[]> {
    return this.repository.find({
      where: {
        approvalRequestId,
        stageId,
      },
      relations: ['actedByUser'],
      order: {
        actedAt: 'ASC',
      },
    });
  }

  /**
   * Find actions by user
   */
  async findByUser(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ history: ApprovalHistoryEntity[]; total: number }> {
    const skip = (page - 1) * limit;

    const [history, total] = await this.repository.findAndCount({
      where: {
        actedBy: userId,
      },
      relations: ['approvalRequest', 'stage'],
      order: {
        actedAt: 'DESC',
      },
      skip,
      take: limit,
    });

    return { history, total };
  }

  /**
   * Get recent actions
   */
  async getRecentActions(organizationId: string, limit = 10): Promise<ApprovalHistoryEntity[]> {
    return this.repository
      .createQueryBuilder('history')
      .leftJoinAndSelect('history.approvalRequest', 'request')
      .leftJoinAndSelect('history.actedByUser', 'user')
      .leftJoinAndSelect('history.stage', 'stage')
      .where('request.organization_id = :organizationId', { organizationId })
      .orderBy('history.acted_at', 'DESC')
      .limit(limit)
      .getMany();
  }

  /**
   * Count actions by type
   */
  async countByAction(approvalRequestId: string): Promise<Record<ApprovalAction, number>> {
    const result = await this.repository
      .createQueryBuilder('history')
      .select('history.action', 'action')
      .addSelect('COUNT(history.id)', 'count')
      .where('history.approval_request_id = :approvalRequestId', { approvalRequestId })
      .groupBy('history.action')
      .getRawMany<{ action: ApprovalAction; count: string }>();

    const stats: Record<string, number> = {};
    for (const action of Object.values(ApprovalAction)) {
      stats[action] = 0;
    }

    for (const row of result) {
      stats[row.action] = parseInt(row.count, 10);
    }

    return stats as Record<ApprovalAction, number>;
  }
}
