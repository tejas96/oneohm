import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProjectPriority, ProjectStatus } from '@oneohm-epc/shared-types';
import { Repository } from 'typeorm';

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
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly repository: Repository<ProjectEntity>,
  ) {}

  /**
   * Create a new project
   */
  async create(projectData: Partial<ProjectEntity>): Promise<ProjectEntity> {
    const project = this.repository.create(projectData);
    return this.repository.save(project);
  }

  /**
   * Find project by ID with relations
   * Filters by organization via property.organizationId
   */
  async findById(id: string, organizationId: string): Promise<ProjectEntity> {
    const project = await this.repository
      .createQueryBuilder('project')
      .innerJoinAndSelect('project.property', 'property')
      .leftJoinAndSelect('property.customer', 'customer')
      .leftJoinAndSelect('property.organization', 'organization')
      .leftJoinAndSelect('project.creator', 'creator')
      .leftJoinAndSelect('project.updater', 'updater')
      .leftJoinAndSelect('project.milestones', 'milestones')
      .leftJoinAndSelect('project.surveys', 'surveys')
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
    },
  ): Promise<{ projects: ProjectEntity[]; total: number }> {
    const query = this.repository
      .createQueryBuilder('project')
      .innerJoinAndSelect('project.property', 'property')
      .leftJoinAndSelect('property.customer', 'customer')
      .where('property.organizationId = :organizationId', { organizationId })
      .andWhere('project.deletedAt IS NULL');

    // Apply filters
    if (filters?.status) {
      query.andWhere('project.status = :status', { status: filters.status });
    }

    if (filters?.priority) {
      query.andWhere('project.priority = :priority', { priority: filters.priority });
    }

    // Filter by customerId via property relation
    if (filters?.customerId) {
      query.andWhere('property.customerId = :customerId', { customerId: filters.customerId });
    }

    if (filters?.projectType) {
      query.andWhere('project.projectType = :projectType', { projectType: filters.projectType });
    }

    // Date filters using new startDate/endDate columns
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

    // Get total count
    const total = await query.getCount();

    // Apply pagination
    const projects = await query
      .orderBy('project.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { projects, total };
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
   * Find projects by customer
   * Filters via property.customerId
   */
  async findByCustomer(customerId: string, organizationId: string): Promise<ProjectEntity[]> {
    return this.repository
      .createQueryBuilder('project')
      .innerJoinAndSelect('project.property', 'property')
      .leftJoinAndSelect('property.customer', 'customer')
      .leftJoinAndSelect('project.milestones', 'milestones')
      .leftJoinAndSelect('project.surveys', 'surveys')
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
  async findAllByPropertyId(
    propertyId: string,
    organizationId: string,
  ): Promise<ProjectEntity[]> {
    return this.repository
      .createQueryBuilder('project')
      .innerJoinAndSelect('project.property', 'property')
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
  async findLastProjectNumber(
    organizationId: string,
    prefix: string,
  ): Promise<string | null> {
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
}
