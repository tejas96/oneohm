import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ServiceRequestPriority, ServiceRequestStatus } from '@oneohm-epc/shared-types';
import { Between, In, IsNull, LessThanOrEqual, Like, Not, Repository } from 'typeorm';


import { ServiceRequestEntity } from '../entities/service-request.entity';

/**
 * Repository for Service Request Operations
 */
@Injectable()
export class ServiceRequestRepository {
  constructor(
    @InjectRepository(ServiceRequestEntity)
    private readonly repository: Repository<ServiceRequestEntity>,
  ) {}

  /**
   * Create a new service request
   */
  async create(requestData: Partial<ServiceRequestEntity>): Promise<ServiceRequestEntity> {
    const request = this.repository.create(requestData);
    return this.repository.save(request);
  }

  /**
   * Find all service requests (exclude soft deleted)
   */
  async findAll(options?: { relations?: string[] }): Promise<ServiceRequestEntity[]> {
    return this.repository.find({
      where: { deletedAt: IsNull() },
      relations: options?.relations || [],
      order: { requestDate: 'DESC' },
    });
  }

  /**
   * Find request by ID
   */
  async findById(id: string, options?: { relations?: string[] }): Promise<ServiceRequestEntity | null> {
    return this.repository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: options?.relations || [],
    });
  }

  /**
   * Find request by request number
   */
  async findByRequestNumber(
    requestNumber: string,
    options?: { relations?: string[] },
  ): Promise<ServiceRequestEntity | null> {
    return this.repository.findOne({
      where: { requestNumber, deletedAt: IsNull() },
      relations: options?.relations || [],
    });
  }

  /**
   * Find requests by project
   */
  async findByProject(
    projectId: string,
    options?: { relations?: string[] },
  ): Promise<ServiceRequestEntity[]> {
    return this.repository.find({
      where: { projectId, deletedAt: IsNull() },
      relations: options?.relations || [],
      order: { requestDate: 'DESC' },
    });
  }

  /**
   * Find requests by customer
   */
  async findByCustomer(
    customerId: string,
    options?: { relations?: string[] },
  ): Promise<ServiceRequestEntity[]> {
    return this.repository.find({
      where: { customerId, deletedAt: IsNull() },
      relations: options?.relations || [],
      order: { requestDate: 'DESC' },
    });
  }

  /**
   * Find requests by organization
   */
  async findByOrganization(
    organizationId: string,
    options?: { relations?: string[] },
  ): Promise<ServiceRequestEntity[]> {
    return this.repository.find({
      where: { organizationId, deletedAt: IsNull() },
      relations: options?.relations || [],
      order: { requestDate: 'DESC' },
    });
  }

  /**
   * Find requests by assigned user
   */
  async findByAssignedUser(
    assignedToUserId: string,
    options?: { relations?: string[] },
  ): Promise<ServiceRequestEntity[]> {
    return this.repository.find({
      where: { assignedToUserId, deletedAt: IsNull() },
      relations: options?.relations || [],
      order: { scheduledDate: 'ASC' },
    });
  }

  /**
   * Find requests by status
   */
  async findByStatus(
    status: ServiceRequestStatus,
    options?: { relations?: string[] },
  ): Promise<ServiceRequestEntity[]> {
    return this.repository.find({
      where: { status, deletedAt: IsNull() },
      relations: options?.relations || [],
      order: { requestDate: 'DESC' },
    });
  }

  /**
   * Find requests by priority
   */
  async findByPriority(
    priority: ServiceRequestPriority,
    options?: { relations?: string[] },
  ): Promise<ServiceRequestEntity[]> {
    return this.repository.find({
      where: { priority, deletedAt: IsNull() },
      relations: options?.relations || [],
      order: { requestDate: 'DESC' },
    });
  }

  /**
   * Find open requests (not closed/resolved/cancelled)
   */
  async findOpen(options?: { relations?: string[] }): Promise<ServiceRequestEntity[]> {
    return this.repository.find({
      where: {
        status: In([
          ServiceRequestStatus.OPEN,
          ServiceRequestStatus.ASSIGNED,
          ServiceRequestStatus.IN_PROGRESS,
          ServiceRequestStatus.ON_HOLD,
        ]),
        deletedAt: IsNull(),
      },
      relations: options?.relations || [],
      order: { priority: 'DESC', requestDate: 'DESC' },
    });
  }

  /**
   * Find unassigned requests
   */
  async findUnassigned(options?: { relations?: string[] }): Promise<ServiceRequestEntity[]> {
    return this.repository.find({
      where: {
        assignedToUserId: IsNull(),
        status: ServiceRequestStatus.OPEN,
        deletedAt: IsNull(),
      },
      relations: options?.relations || [],
      order: { priority: 'DESC', requestDate: 'DESC' },
    });
  }

  /**
   * Find overdue requests (scheduled date passed, not completed)
   */
  async findOverdue(options?: { relations?: string[] }): Promise<ServiceRequestEntity[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.repository.find({
      where: {
        scheduledDate: LessThanOrEqual(today),
        status: In([
          ServiceRequestStatus.ASSIGNED,
          ServiceRequestStatus.IN_PROGRESS,
          ServiceRequestStatus.ON_HOLD,
        ]),
        completedDate: IsNull(),
        deletedAt: IsNull(),
      },
      relations: options?.relations || [],
      order: { scheduledDate: 'ASC' },
    });
  }

  /**
   * Find chargeable requests
   */
  async findChargeable(options?: { relations?: string[] }): Promise<ServiceRequestEntity[]> {
    return this.repository.find({
      where: {
        isChargeable: true,
        deletedAt: IsNull(),
      },
      relations: options?.relations || [],
      order: { requestDate: 'DESC' },
    });
  }

  /**
   * Find requests with customer feedback
   */
  async findWithFeedback(options?: { relations?: string[] }): Promise<ServiceRequestEntity[]> {
    return this.repository.find({
      where: {
        customerRating: Not(IsNull()),
        deletedAt: IsNull(),
      },
      relations: options?.relations || [],
      order: { requestDate: 'DESC' },
    });
  }

  /**
   * Find requests completed in date range
   */
  async findCompletedInRange(
    startDate: Date,
    endDate: Date,
    options?: { relations?: string[] },
  ): Promise<ServiceRequestEntity[]> {
    return this.repository.find({
      where: {
        status: In([ServiceRequestStatus.RESOLVED, ServiceRequestStatus.CLOSED]),
        completedDate: Between(startDate, endDate),
        deletedAt: IsNull(),
      },
      relations: options?.relations || [],
      order: { completedDate: 'DESC' },
    });
  }

  /**
   * Update request
   */
  async update(id: string, updateData: Partial<ServiceRequestEntity>): Promise<ServiceRequestEntity | null> {
    await this.repository.update(id, updateData);
    return this.findById(id);
  }

  /**
   * Soft delete request
   */
  async softDelete(id: string): Promise<boolean> {
    const result = await this.repository.softDelete(id);
    return result.affected ? result.affected > 0 : false;
  }

  /**
   * Hard delete request
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected ? result.affected > 0 : false;
  }

  /**
   * Generate next request number
   */
  async generateRequestNumber(organizationId: string, year: number = new Date().getFullYear()): Promise<string> {
    const prefix = `SR-${year}`;
    const lastRequest = await this.repository.findOne({
      where: {
        organizationId,
        requestNumber: Like(`${prefix}-%`),
      },
      order: { requestNumber: 'DESC' },
    });

    if (!lastRequest) {
      return `${prefix}-001`;
    }

    const parts = lastRequest.requestNumber.split('-');
    const lastNumber = parseInt(parts[2] || '0', 10);
    const nextNumber = (lastNumber + 1).toString().padStart(3, '0');
    return `${prefix}-${nextNumber}`;
  }

  /**
   * Count requests by project
   */
  async countByProject(projectId: string): Promise<number> {
    return this.repository.count({
      where: { projectId, deletedAt: IsNull() },
    });
  }

  /**
   * Count requests by customer
   */
  async countByCustomer(customerId: string): Promise<number> {
    return this.repository.count({
      where: { customerId, deletedAt: IsNull() },
    });
  }

  /**
   * Count requests by status
   */
  async countByStatus(status: ServiceRequestStatus): Promise<number> {
    return this.repository.count({
      where: { status, deletedAt: IsNull() },
    });
  }

  /**
   * Count open requests
   */
  async countOpen(): Promise<number> {
    return this.repository.count({
      where: {
        status: In([
          ServiceRequestStatus.OPEN,
          ServiceRequestStatus.ASSIGNED,
          ServiceRequestStatus.IN_PROGRESS,
          ServiceRequestStatus.ON_HOLD,
        ]),
        deletedAt: IsNull(),
      },
    });
  }

  /**
   * Get average customer rating
   */
  async getAverageRating(options?: { projectId?: string; customerId?: string }): Promise<number> {
    const queryBuilder = this.repository
      .createQueryBuilder('sr')
      .select('AVG(sr.customer_rating)', 'avgRating')
      .where('sr.customer_rating IS NOT NULL')
      .andWhere('sr.deleted_at IS NULL');

    if (options?.projectId) {
      queryBuilder.andWhere('sr.project_id = :projectId', { projectId: options.projectId });
    }

    if (options?.customerId) {
      queryBuilder.andWhere('sr.customer_id = :customerId', { customerId: options.customerId });
    }

    const result = await queryBuilder.getRawOne<{ avgRating: string }>();
    return result?.avgRating ? parseFloat(result.avgRating) : 0;
  }

  /**
   * Get request statistics for organization
   */
  async getStatsByOrganization(organizationId: string): Promise<Record<string, unknown>> {
    const requests = await this.repository.find({
      where: { organizationId, deletedAt: IsNull() },
      select: ['status', 'priority', 'isChargeable'],
    });

    return {
      total: requests.length,
      byStatus: requests.reduce<Record<string, number>>(
        (acc, req) => {
          acc[req.status] = (acc[req.status] || 0) + 1;
          return acc;
        },
        {},
      ),
      byPriority: requests.reduce<Record<string, number>>(
        (acc, req) => {
          acc[req.priority] = (acc[req.priority] || 0) + 1;
          return acc;
        },
        {},
      ),
      chargeable: requests.filter((r) => r.isChargeable).length,
    };
  }
}

