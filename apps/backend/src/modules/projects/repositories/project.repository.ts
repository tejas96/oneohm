import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProjectPriority, ProjectStatus } from '@oneohm-epc/shared-types';
import { type EntityManager, Repository } from 'typeorm';

import { generateEntityCode } from '../../../common/utils/code-generator.util';
import { ProjectEntity } from '../entities/project.entity';

/**
 * Project Repository
 * Handles database operations for projects
 *
 * Note: Organization and customer filtering is done via property relation
 * since project.organizationId and project.customerId columns were removed.
 *
 * Business Rule: One property can have only one project (OneToOne relationship)
 */
@Injectable()
export class ProjectRepository {
  private static readonly SORT_WHITELIST: Record<string, string> = {
    name: 'project.name',
    createdAt: 'project.createdAt',
    endDate: 'project.endDate',
    systemSizeKw: 'cv.systemSizeKw',
    estimatedCost: 'cv.finalPrice',
    progressPercentage: 'project.progressPercentage',
    status: 'project.status',
  };

  constructor(
    @InjectRepository(ProjectEntity)
    public readonly repository: Repository<ProjectEntity>,
  ) {}

  /**
   * Create a new project
   */
  async create(
    projectData: Partial<ProjectEntity>,
    manager?: EntityManager,
  ): Promise<ProjectEntity> {
    const repo = this.getRepo(manager);
    const project = repo.create(projectData);
    return repo.save(project);
  }

  /**
   * Update project by ID (no org ownership check — use inside transactions where ownership is pre-validated)
   */
  async updateById(
    id: string,
    data: Record<string, unknown>,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = this.getRepo(manager);
    await repo.update({ id }, data);
  }

  /**
   * Find project by ID only (no org check — use when project ownership is already validated via context)
   */
  async findOneById(id: string): Promise<ProjectEntity | null> {
    return this.repository.findOneBy({ id });
  }

  /**
   * Find project by ID with relations
   * Filters by organization via property.organizationId
   */
  async findById(id: string, organizationId: string, manager?: EntityManager): Promise<ProjectEntity> {
    const repo = this.getRepo(manager);
    const project = await repo
      .createQueryBuilder('project')
      .innerJoinAndSelect('project.property', 'property')
      .innerJoinAndSelect('project.quote', 'quote')
      .leftJoinAndSelect('quote.versions', 'cv', 'cv.isCurrent = :isCurrent', { isCurrent: true })
      .leftJoinAndSelect('property.customer', 'customer')
      .leftJoinAndSelect('property.organization', 'organization')
      .leftJoinAndSelect('project.creator', 'creator')
      .leftJoinAndSelect('project.updater', 'updater')
      .leftJoinAndSelect('project.milestones', 'milestones')
      .leftJoinAndSelect('project.survey', 'survey')
      .leftJoinAndSelect('project.materials', 'materials')
      .where('project.id = :id', { id })
      .andWhere('property.organizationId = :organizationId', { organizationId })
      .getOne();

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return project;
  }

  /**
   * Find all projects with filters and pagination
   * Filters by organization via property.organizationId
   * Includes: team members (with user), milestones for current phase
   */
  async findAll(
    organizationId: string,
    page = 1,
    limit = 20,
    filters?: {
      status?: ProjectStatus;
      priority?: ProjectPriority;
      customerId?: string;
      projectType?: string;
      fromDate?: string;
      toDate?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    },
  ): Promise<{ projects: ProjectEntity[]; total: number }> {
    const query = this.repository
      .createQueryBuilder('project')
      .innerJoinAndSelect('project.property', 'property')
      .innerJoinAndSelect('project.quote', 'quote')
      .leftJoinAndSelect('quote.versions', 'cv', 'cv.isCurrent = :isCurrent', { isCurrent: true })
      .leftJoinAndSelect('property.customer', 'customer')
      .leftJoinAndSelect('project.teamMembers', 'teamMember')
      .leftJoinAndSelect('teamMember.user', 'teamUser')
      .leftJoinAndSelect('project.milestones', 'milestone')
      .where('property.organizationId = :organizationId', { organizationId })
      .andWhere('project.deletedAt IS NULL');

    // Apply filters
    if (filters?.status) {
      query.andWhere('project.status = :status', { status: filters.status });
    }

    if (filters?.priority) {
      query.andWhere('project.priority = :priority', { priority: filters.priority });
    }

    if (filters?.customerId) {
      query.andWhere('property.customerId = :customerId', { customerId: filters.customerId });
    }

    if (filters?.projectType) {
      query.andWhere('cv.projectType = :projectType', { projectType: filters.projectType });
    }

    if (filters?.fromDate) {
      query.andWhere('project.startDate >= :fromDate', { fromDate: filters.fromDate });
    }

    if (filters?.toDate) {
      query.andWhere('project.endDate <= :toDate', { toDate: filters.toDate });
    }

    if (filters?.search) {
      query.andWhere(
        '(project.projectNumber ILIKE :search OR project.name ILIKE :search OR customer.firstName ILIKE :search OR customer.lastName ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    const total = await query.getCount();

    // Sort with whitelist validation
    const sortColumn =
      ProjectRepository.SORT_WHITELIST[filters?.sortBy ?? ''] ?? 'project.createdAt';
    const sortOrder = filters?.sortOrder === 'ASC' ? 'ASC' : 'DESC';

    const projects = await query
      .orderBy(sortColumn, sortOrder)
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { projects, total };
  }

  /**
   * Get payment summary (totalExpected, totalPaid) for a list of project IDs.
   * Only aggregates non-deleted payments with valid statuses (received, verified, cleared).
   */
  async getPaymentSummaries(
    projectIds: string[],
  ): Promise<Map<string, { totalExpected: number; totalPaid: number }>> {
    if (projectIds.length === 0) return new Map();

    const results = await this.repository.manager
      .createQueryBuilder()
      .select('payment.project_id', 'projectId')
      .addSelect('COALESCE(SUM(payment.expected_amount), 0)', 'totalExpected')
      .addSelect('COALESCE(SUM(payment.paid_amount), 0)', 'totalPaid')
      .from('payments', 'payment')
      .where('payment.project_id IN (:...projectIds)', { projectIds })
      .andWhere('payment.deleted_at IS NULL')
      .andWhere("payment.status IN ('received', 'verified', 'cleared')")
      .groupBy('payment.project_id')
      .getRawMany<{ projectId: string; totalExpected: string; totalPaid: string }>();

    const map = new Map<string, { totalExpected: number; totalPaid: number }>();
    for (const row of results) {
      map.set(row.projectId, {
        totalExpected: parseFloat(row.totalExpected) || 0,
        totalPaid: parseFloat(row.totalPaid) || 0,
      });
    }
    return map;
  }

  /**
   * Update a project
   * Validates ownership via findById before updating
   */
  async update(
    id: string,
    organizationId: string,
    updateData: Record<string, unknown>,
  ): Promise<ProjectEntity> {
    // First validate the project belongs to org via property
    await this.findById(id, organizationId);

    await this.repository.update({ id }, updateData);
    return this.findById(id, organizationId);
  }

  /**
   * Soft delete a project
   * Validates ownership via findById before deleting
   */
  async delete(id: string, organizationId: string): Promise<void> {
    // Validate ownership first via property
    await this.findById(id, organizationId);

    const result = await this.repository.softDelete({ id });

    if (!result.affected || result.affected === 0) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
  }

  /**
   * Update project status
   * Validates ownership via findById before updating
   */
  async updateStatus(
    id: string,
    organizationId: string,
    status: ProjectStatus,
  ): Promise<ProjectEntity> {
    // Validate ownership first
    await this.findById(id, organizationId);

    await this.repository.update({ id }, { status });
    return this.findById(id, organizationId);
  }

  /**
   * Update project progress
   * Validates ownership via findById before updating
   */
  async updateProgress(
    id: string,
    organizationId: string,
    progressPercentage: number,
  ): Promise<ProjectEntity> {
    // Validate ownership first
    await this.findById(id, organizationId);

    await this.repository.update({ id }, { progressPercentage });
    return this.findById(id, organizationId);
  }

  /**
   * Update progress by project ID only (no org ownership check).
   * Used internally by ProjectTaskService after task status changes.
   */
  async updateProgressById(projectId: string, progressPercentage: number): Promise<void> {
    await this.repository.update({ id: projectId }, { progressPercentage });
  }

  /**
   * Find projects by customer
   * Filters via property.customerId
   */
  async findByCustomer(customerId: string, organizationId: string): Promise<ProjectEntity[]> {
    return this.repository
      .createQueryBuilder('project')
      .innerJoinAndSelect('project.property', 'property')
      .innerJoinAndSelect('project.quote', 'quote')
      .leftJoinAndSelect('quote.versions', 'cv', 'cv.isCurrent = :isCurrent', { isCurrent: true })
      .leftJoinAndSelect('property.customer', 'customer')
      .leftJoinAndSelect('project.milestones', 'milestones')
      .leftJoinAndSelect('project.survey', 'survey')
      .leftJoinAndSelect('project.materials', 'materials')
      .where('property.customerId = :customerId', { customerId })
      .andWhere('property.organizationId = :organizationId', { organizationId })
      .andWhere('project.deletedAt IS NULL')
      .orderBy('project.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Find single project by property ID (for OneToOne check)
   * Returns null if no project exists for the property
   */
  async findOneByPropertyId(
    propertyId: string,
    organizationId: string,
  ): Promise<ProjectEntity | null> {
    return this.repository
      .createQueryBuilder('project')
      .innerJoin('project.property', 'property')
      .where('project.propertyId = :propertyId', { propertyId })
      .andWhere('property.organizationId = :organizationId', { organizationId })
      .andWhere('project.deletedAt IS NULL')
      .getOne();
  }

  /**
   * Find all projects by property ID (for backward compatibility)
   * Note: With OneToOne constraint, this should return at most 1 project
   */
  async findAllByPropertyId(propertyId: string, organizationId: string): Promise<ProjectEntity[]> {
    return this.repository
      .createQueryBuilder('project')
      .innerJoinAndSelect('project.property', 'property')
      .innerJoinAndSelect('project.quote', 'quote')
      .leftJoinAndSelect('quote.versions', 'cv', 'cv.isCurrent = :isCurrent', { isCurrent: true })
      .leftJoinAndSelect('property.customer', 'customer')
      .leftJoinAndSelect('project.milestones', 'milestones')
      .where('project.propertyId = :propertyId', { propertyId })
      .andWhere('property.organizationId = :organizationId', { organizationId })
      .andWhere('project.deletedAt IS NULL')
      .orderBy('project.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Find the last project number for an organization (including soft-deleted)
   * Used for generating unique project numbers
   */
  async findLastProjectNumber(organizationId: string, prefix: string): Promise<string | null> {
    const result = await this.repository
      .createQueryBuilder('project')
      .withDeleted() // Include soft-deleted projects for unique number generation
      .innerJoin('project.property', 'property')
      .select('project.projectNumber', 'projectNumber')
      .where('property.organizationId = :organizationId', { organizationId })
      .andWhere('project.projectNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('project.projectNumber', 'DESC')
      .limit(1)
      .getRawOne();

    return result?.projectNumber || null;
  }

  /**
   * Generate a unique project number (e.g. PRJ-ONEOHM-2026-0001)
   */
  async generateProjectNumber(orgCode: string, manager?: EntityManager): Promise<string> {
    return generateEntityCode(this.repository, 'projectNumber', 'PRJ', orgCode, 'project_number', manager);
  }

  private getRepo(manager?: EntityManager): Repository<ProjectEntity> {
    return manager ? manager.getRepository(ProjectEntity) : this.repository;
  }
}
