import { BadRequestException, Injectable } from '@nestjs/common';
import { MaterialStatus } from '@tejas96/shared/types';

import { CreateMaterialDto, UpdateMaterialDto } from '../dto';
import { ProjectMaterialEntity } from '../entities/project-material.entity';
import { MaterialRepository, ProjectRepository } from '../repositories';

/**
 * Material Service
 * Business logic for project material management
 */
@Injectable()
export class MaterialService {
  constructor(
    private readonly materialRepository: MaterialRepository,
    private readonly projectRepository: ProjectRepository,
  ) {}

  /**
   * Create a new material entry
   */
  async create(
    organizationId: string,
    createDto: CreateMaterialDto,
  ): Promise<ProjectMaterialEntity> {
    // Verify project exists and belongs to organization
    await this.projectRepository.findById(createDto.projectId, organizationId);

    // Calculate total cost if unit cost provided
    const totalCost =
      createDto.unitCost && createDto.quantityRequired
        ? createDto.unitCost * createDto.quantityRequired
        : createDto.totalCost;

    // Create material
    const material = await this.materialRepository.create({
      projectId: createDto.projectId,
      productId: createDto.productId,
      materialName: createDto.materialName,
      category: createDto.category,
      quantityRequired: createDto.quantityRequired,
      quantityAllocated: createDto.quantityAllocated || 0,
      quantityUsed: createDto.quantityUsed || 0,
      unit: createDto.unit,
      unitCost: createDto.unitCost,
      totalCost,
      status: createDto.status || MaterialStatus.REQUIRED,
      procurementDate: createDto.procurementDate ? new Date(createDto.procurementDate) : undefined,
      allocationDate: createDto.allocationDate ? new Date(createDto.allocationDate) : undefined,
    });

    return this.materialRepository.findById(material.id, createDto.projectId);
  }

  /**
   * Find all materials for a project
   */
  async findByProject(
    projectId: string,
    organizationId: string,
    filters?: {
      status?: MaterialStatus;
      category?: string;
      productId?: string;
    },
  ): Promise<ProjectMaterialEntity[]> {
    // Verify project exists
    await this.projectRepository.findById(projectId, organizationId);

    return this.materialRepository.findByProject(projectId, filters);
  }

  /**
   * Find material by ID
   */
  async findById(
    id: string,
    projectId: string,
    organizationId: string,
  ): Promise<ProjectMaterialEntity> {
    // Verify project exists
    await this.projectRepository.findById(projectId, organizationId);

    return this.materialRepository.findById(id, projectId);
  }

  /**
   * Update a material
   */
  async update(
    id: string,
    projectId: string,
    organizationId: string,
    updateDto: UpdateMaterialDto,
  ): Promise<ProjectMaterialEntity> {
    // Verify project exists
    await this.projectRepository.findById(projectId, organizationId);

    // Verify material exists
    const material = await this.materialRepository.findById(id, projectId);

    // Recalculate total cost if unit cost or quantity changed
    let totalCost = updateDto.totalCost;
    if (updateDto.unitCost !== undefined || updateDto.quantityRequired !== undefined) {
      const unitCost = updateDto.unitCost ?? material.unitCost;
      const quantityRequired = updateDto.quantityRequired ?? material.quantityRequired;
      if (unitCost && quantityRequired) {
        totalCost = unitCost * quantityRequired;
      }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      ...updateDto,
      totalCost,
      procurementDate: updateDto.procurementDate ? new Date(updateDto.procurementDate) : undefined,
      allocationDate: updateDto.allocationDate ? new Date(updateDto.allocationDate) : undefined,
    };

    // Remove undefined values
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    return this.materialRepository.update(id, projectId, updateData);
  }

  /**
   * Delete a material
   */
  async delete(id: string, projectId: string, organizationId: string): Promise<void> {
    // Verify project exists
    await this.projectRepository.findById(projectId, organizationId);

    // Verify material exists
    const material = await this.materialRepository.findById(id, projectId);

    // Check if material can be deleted (only required/ordered)
    if (material.status !== MaterialStatus.REQUIRED && material.status !== MaterialStatus.ORDERED) {
      throw new BadRequestException(
        `Cannot delete material with status ${material.status}. Only required or ordered materials can be deleted.`,
      );
    }

    await this.materialRepository.delete(id, projectId);
  }

  /**
   * Update material status
   */
  async updateStatus(
    id: string,
    projectId: string,
    organizationId: string,
    newStatus: MaterialStatus,
  ): Promise<ProjectMaterialEntity> {
    // Verify project exists
    await this.projectRepository.findById(projectId, organizationId);

    // Verify material exists
    const material = await this.materialRepository.findById(id, projectId);

    // Auto-update dates based on status
    const updateData: Record<string, unknown> = { status: newStatus };

    if (newStatus === MaterialStatus.ORDERED && !material.procurementDate) {
      updateData.procurementDate = new Date();
    }

    if (newStatus === MaterialStatus.ALLOCATED && !material.allocationDate) {
      updateData.allocationDate = new Date();
      updateData.quantityAllocated = material.quantityRequired;
    }

    await this.materialRepository.update(id, projectId, updateData);
    return this.materialRepository.findById(id, projectId);
  }

  /**
   * Update material quantities
   */
  async updateQuantities(
    id: string,
    projectId: string,
    organizationId: string,
    quantities: {
      quantityAllocated?: number;
      quantityUsed?: number;
    },
  ): Promise<ProjectMaterialEntity> {
    // Verify project exists
    await this.projectRepository.findById(projectId, organizationId);

    // Verify material exists
    const material = await this.materialRepository.findById(id, projectId);

    // Validate quantities
    if (quantities.quantityAllocated !== undefined) {
      if (quantities.quantityAllocated < 0) {
        throw new BadRequestException('Allocated quantity cannot be negative');
      }
      if (quantities.quantityAllocated > material.quantityRequired) {
        throw new BadRequestException('Allocated quantity cannot exceed required quantity');
      }
    }

    if (quantities.quantityUsed !== undefined) {
      if (quantities.quantityUsed < 0) {
        throw new BadRequestException('Used quantity cannot be negative');
      }
      const allocatedQty = quantities.quantityAllocated ?? material.quantityAllocated;
      if (quantities.quantityUsed > allocatedQty) {
        throw new BadRequestException('Used quantity cannot exceed allocated quantity');
      }
    }

    await this.materialRepository.updateQuantities(id, projectId, quantities);
    return this.materialRepository.findById(id, projectId);
  }

  /**
   * Calculate total material cost for a project
   */
  async calculateTotalCost(projectId: string, organizationId: string): Promise<number> {
    // Verify project exists
    await this.projectRepository.findById(projectId, organizationId);

    return this.materialRepository.calculateTotalCost(projectId);
  }

  /**
   * Find required materials for a project
   */
  async findRequired(projectId: string, organizationId: string): Promise<ProjectMaterialEntity[]> {
    // Verify project exists
    await this.projectRepository.findById(projectId, organizationId);

    return this.materialRepository.findRequired(projectId);
  }

  /**
   * Get material statistics for a project
   */
  async getStatistics(
    projectId: string,
    organizationId: string,
  ): Promise<{
    totalMaterials: number;
    requiredCount: number;
    orderedCount: number;
    allocatedCount: number;
    usedCount: number;
    totalCost: number;
  }> {
    // Verify project exists
    await this.projectRepository.findById(projectId, organizationId);

    const [requiredCount, orderedCount, allocatedCount, usedCount, totalCost] = await Promise.all([
      this.materialRepository.countByStatus(projectId, MaterialStatus.REQUIRED),
      this.materialRepository.countByStatus(projectId, MaterialStatus.ORDERED),
      this.materialRepository.countByStatus(projectId, MaterialStatus.ALLOCATED),
      this.materialRepository.countByStatus(projectId, MaterialStatus.USED),
      this.materialRepository.calculateTotalCost(projectId),
    ]);

    const totalMaterials = requiredCount + orderedCount + allocatedCount + usedCount;

    return {
      totalMaterials,
      requiredCount,
      orderedCount,
      allocatedCount,
      usedCount,
      totalCost,
    };
  }
}
