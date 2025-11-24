import { BadRequestException, Injectable } from '@nestjs/common';
import { ProjectVendorStatus } from '@oneohm-epc/shared-types';

import { ProjectRepository } from '../../projects/repositories/project.repository';
import { CreateProjectVendorDto, UpdateProjectVendorDto } from '../dto';
import { ProjectVendorEntity } from '../entities/project-vendor.entity';
import { ProjectVendorRepository, VendorRepository } from '../repositories';

/**
 * Project Vendor Service
 * Business logic for managing vendor-project relationships
 */
@Injectable()
export class ProjectVendorService {
  constructor(
    private readonly projectVendorRepository: ProjectVendorRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly vendorRepository: VendorRepository,
  ) {}

  /**
   * Assign vendor to project
   */
  async assignVendorToProject(
    organizationId: string,
    createDto: CreateProjectVendorDto,
    createdBy: string,
  ): Promise<ProjectVendorEntity> {
    // Verify project exists
    await this.projectRepository.findById(createDto.projectId, organizationId);

    // Verify vendor exists
    await this.vendorRepository.findById(createDto.vendorId, organizationId);

    // Check if vendor is already assigned with the same role
    const isAssigned = await this.projectVendorRepository.isVendorAssignedToProject(
      createDto.projectId,
      createDto.vendorId,
    );

    if (isAssigned) {
      throw new BadRequestException(
        `Vendor is already assigned to this project${createDto.vendorRole ? ` with role ${createDto.vendorRole}` : ''}`,
      );
    }

    // Assign vendor
    const projectVendor = await this.projectVendorRepository.create({
      projectId: createDto.projectId,
      vendorId: createDto.vendorId,
      contractValue: createDto.contractValue,
      contractStartDate: createDto.contractStartDate
        ? new Date(createDto.contractStartDate)
        : undefined,
      contractEndDate: createDto.contractEndDate ? new Date(createDto.contractEndDate) : undefined,
      status: createDto.status ?? ProjectVendorStatus.ACTIVE,
      notes: createDto.notes,
      createdBy,
    });

    return this.projectVendorRepository.findById(projectVendor.id);
  }

  /**
   * Find project-vendor by ID
   */
  async findById(id: string): Promise<ProjectVendorEntity> {
    return this.projectVendorRepository.findById(id);
  }

  /**
   * Find all vendors for a project
   */
  async findByProject(projectId: string): Promise<ProjectVendorEntity[]> {
    return this.projectVendorRepository.findByProject(projectId);
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
    return this.projectVendorRepository.findByVendor(vendorId, page, limit, filters);
  }

  /**
   * Update project-vendor relationship
   */
  async update(id: string, updateDto: UpdateProjectVendorDto): Promise<ProjectVendorEntity> {
    return this.projectVendorRepository.update(id, { ...updateDto });
  }

  /**
   * Remove vendor from project
   */
  async removeVendorFromProject(id: string): Promise<void> {
    const projectVendor = await this.projectVendorRepository.findById(id);

    // Only allow removal if status is not active
    if (projectVendor.status === ProjectVendorStatus.ACTIVE) {
      throw new BadRequestException('Cannot remove active vendor. Change status first.');
    }

    await this.projectVendorRepository.delete(id);
  }

  /**
   * Change vendor status
   */
  async changeStatus(id: string, status: ProjectVendorStatus): Promise<ProjectVendorEntity> {
    return this.projectVendorRepository.update(id, { status });
  }

  /**
   * Get total contract value for a project
   */
  async getTotalContractValueByProject(projectId: string): Promise<number> {
    return this.projectVendorRepository.getTotalContractValueByProject(projectId);
  }

  /**
   * Get active vendors for a project
   */
  async getActiveVendorsByProject(projectId: string): Promise<ProjectVendorEntity[]> {
    return this.projectVendorRepository.getActiveVendorsByProject(projectId);
  }
}
