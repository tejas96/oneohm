import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProjectPriority, ProjectStatus } from '@oneohm-epc/shared-types';
import { IsNull, Repository } from 'typeorm';

import { ProjectEntity } from '../entities/project.entity';

/**
 * Project Repository
 * Handles database operations for projects
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
   */
  async findById(id: string, organizationId: string): Promise<ProjectEntity> {
    const project = await this.repository.findOne({
      where: { id, organizationId },
      relations: [
        'customer',
        'quote',
        'projectManager',
        'leadTechnician',
        'creator',
        'milestones',
        'surveys',
        'materials',
      ],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return project;
  }

  /**
   * Find all projects with filters and pagination
   */
  async findAll(
    organizationId: string,
    page = 1,
    limit = 20,
    filters?: {
      status?: ProjectStatus;
      priority?: ProjectPriority;
      customerId?: string;
      projectManagerId?: string;
      quoteId?: string;
      projectType?: string;
      fromDate?: string;
      toDate?: string;
      search?: string;
    },
  ): Promise<{ projects: ProjectEntity[]; total: number }> {
    const query = this.repository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.customer', 'customer')
      .leftJoinAndSelect('project.projectManager', 'projectManager')
      .leftJoinAndSelect('project.leadTechnician', 'leadTechnician')
      .leftJoinAndSelect('project.quote', 'quote')
      .where('project.organizationId = :organizationId', { organizationId })
      .andWhere('project.deletedAt IS NULL');

    // Apply filters
    if (filters?.status) {
      query.andWhere('project.status = :status', { status: filters.status });
    }

    if (filters?.priority) {
      query.andWhere('project.priority = :priority', { priority: filters.priority });
    }

    if (filters?.customerId) {
      query.andWhere('project.customerId = :customerId', { customerId: filters.customerId });
    }

    if (filters?.projectManagerId) {
      query.andWhere('project.projectManagerId = :projectManagerId', {
        projectManagerId: filters.projectManagerId,
      });
    }

    if (filters?.quoteId) {
      query.andWhere('project.quoteId = :quoteId', { quoteId: filters.quoteId });
    }

    if (filters?.projectType) {
      query.andWhere('project.projectType = :projectType', { projectType: filters.projectType });
    }

    if (filters?.fromDate) {
      query.andWhere('project.plannedStartDate >= :fromDate', { fromDate: filters.fromDate });
    }

    if (filters?.toDate) {
      query.andWhere('project.plannedEndDate <= :toDate', { toDate: filters.toDate });
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
   */
  async update(
    id: string,
    organizationId: string,
    updateData: Record<string, unknown>,
  ): Promise<ProjectEntity> {
    await this.repository.update({ id, organizationId }, updateData);
    return this.findById(id, organizationId);
  }

  /**
   * Soft delete a project
   */
  async delete(id: string, organizationId: string): Promise<void> {
    const result = await this.repository.softDelete({ id, organizationId });

    if (!result.affected || result.affected === 0) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
  }

  /**
   * Update project status
   */
  async updateStatus(
    id: string,
    organizationId: string,
    status: ProjectStatus,
  ): Promise<ProjectEntity> {
    await this.repository.update({ id, organizationId }, { status });
    return this.findById(id, organizationId);
  }

  /**
   * Update project progress
   */
  async updateProgress(
    id: string,
    organizationId: string,
    progressPercentage: number,
  ): Promise<ProjectEntity> {
    await this.repository.update({ id, organizationId }, { progressPercentage });
    return this.findById(id, organizationId);
  }

  /**
   * Find projects by customer
   */
  async findByCustomer(customerId: string, organizationId: string): Promise<ProjectEntity[]> {
    return this.repository.find({
      where: { customerId, organizationId, deletedAt: IsNull() },
      relations: ['milestones', 'surveys', 'materials'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find projects by quote
   */
  async findByQuote(quoteId: string, organizationId: string): Promise<ProjectEntity[]> {
    return this.repository.find({
      where: { quoteId, organizationId, deletedAt: IsNull() },
      relations: ['customer', 'milestones'],
      order: { createdAt: 'DESC' },
    });
  }
}

