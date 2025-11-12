import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProjectVendorStatus } from '@oneohm-epc/shared-types';
import { Repository } from 'typeorm';

import { ProjectVendorEntity } from '../entities/project-vendor.entity';

/**
 * Project Vendor Repository
 * Handles database operations for project-vendor relationships
 */
@Injectable()
export class ProjectVendorRepository {
  constructor(
    @InjectRepository(ProjectVendorEntity)
    private readonly repository: Repository<ProjectVendorEntity>,
  ) {}

  /**
   * Create a new project-vendor relationship
   */
  async create(projectVendorData: Partial<ProjectVendorEntity>): Promise<ProjectVendorEntity> {
    const projectVendor = this.repository.create(projectVendorData);
    return this.repository.save(projectVendor);
  }

  /**
   * Find project-vendor by ID
   */
  async findById(id: string): Promise<ProjectVendorEntity> {
    const projectVendor = await this.repository.findOne({
      where: { id },
      relations: ['project', 'vendor'],
    });

    if (!projectVendor) {
      throw new NotFoundException(`Project-Vendor with ID ${id} not found`);
    }

    return projectVendor;
  }

  /**
   * Find all vendors for a project
   */
  async findByProject(projectId: string): Promise<ProjectVendorEntity[]> {
    return this.repository.find({
      where: { projectId },
      relations: ['vendor'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find all projects for a vendor
   */
  async findByVendor(
    vendorId: string,
    page = 1,
    limit = 20,
    filters?: {
      status?: ProjectVendorStatus;
    },
  ): Promise<{ projectVendors: ProjectVendorEntity[]; total: number }> {
    const query = this.repository
      .createQueryBuilder('projectVendor')
      .leftJoinAndSelect('projectVendor.project', 'project')
      .where('projectVendor.vendorId = :vendorId', { vendorId });

    // Apply filters
    if (filters?.status) {
      query.andWhere('projectVendor.status = :status', { status: filters.status });
    }

    // Pagination
    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    // Order by
    query.orderBy('projectVendor.createdAt', 'DESC');

    const [projectVendors, total] = await query.getManyAndCount();

    return { projectVendors, total };
  }

  /**
   * Update project-vendor
   */
  async update(
    id: string,
    updateData: Record<string, unknown>,
  ): Promise<ProjectVendorEntity> {
    const projectVendor = await this.findById(id);

    Object.assign(projectVendor, updateData);

    return this.repository.save(projectVendor);
  }

  /**
   * Delete project-vendor relationship
   */
  async delete(id: string): Promise<void> {
    const projectVendor = await this.findById(id);
    await this.repository.remove(projectVendor);
  }

  /**
   * Check if vendor is already assigned to project
   */
  async isVendorAssignedToProject(
    projectId: string,
    vendorId: string,
    vendorRole?: string,
  ): Promise<boolean> {
    const where: Record<string, unknown> = { projectId, vendorId };

    if (vendorRole) {
      where.vendorRole = vendorRole;
    }

    const count = await this.repository.count({ where });

    return count > 0;
  }

  /**
   * Get total contract value for a project
   */
  async getTotalContractValueByProject(projectId: string): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('projectVendor')
      .select('SUM(projectVendor.contractValue)', 'totalValue')
      .where('projectVendor.projectId = :projectId', { projectId })
      .andWhere('projectVendor.status = :status', { status: ProjectVendorStatus.ACTIVE })
      .getRawOne<{ totalValue: string }>();

    return result?.totalValue ? parseFloat(result.totalValue) : 0;
  }

  /**
   * Get active vendors for a project
   */
  async getActiveVendorsByProject(projectId: string): Promise<ProjectVendorEntity[]> {
    return this.repository.find({
      where: {
        projectId,
        status: ProjectVendorStatus.ACTIVE,
      },
      relations: ['vendor'],
      order: { createdAt: 'ASC' },
    });
  }
}

