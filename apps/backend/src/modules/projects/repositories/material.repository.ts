import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MaterialStatus } from '@oneohm-epc/shared-types';
import { IsNull, Repository } from 'typeorm';

import { ProjectMaterialEntity } from '../entities/project-material.entity';

/**
 * Project Material Repository
 * Handles database operations for project materials
 */
@Injectable()
export class MaterialRepository {
  constructor(
    @InjectRepository(ProjectMaterialEntity)
    private readonly repository: Repository<ProjectMaterialEntity>,
  ) {}

  /**
   * Create a new material entry
   */
  async create(materialData: Partial<ProjectMaterialEntity>): Promise<ProjectMaterialEntity> {
    const material = this.repository.create(materialData);
    return this.repository.save(material);
  }

  /**
   * Find material by ID
   */
  async findById(id: string, projectId: string): Promise<ProjectMaterialEntity> {
    const material = await this.repository.findOne({
      where: { id, projectId },
      relations: ['project', 'product'],
    });

    if (!material) {
      throw new NotFoundException(`Material with ID ${id} not found`);
    }

    return material;
  }

  /**
   * Find all materials for a project
   */
  async findByProject(
    projectId: string,
    filters?: {
      status?: MaterialStatus;
      category?: string;
      productId?: string;
    },
  ): Promise<ProjectMaterialEntity[]> {
    const query = this.repository
      .createQueryBuilder('material')
      .leftJoinAndSelect('material.product', 'product')
      .where('material.projectId = :projectId', { projectId })
      .andWhere('material.deletedAt IS NULL');

    // Apply filters
    if (filters?.status) {
      query.andWhere('material.status = :status', { status: filters.status });
    }

    if (filters?.category) {
      query.andWhere('material.category = :category', { category: filters.category });
    }

    if (filters?.productId) {
      query.andWhere('material.productId = :productId', { productId: filters.productId });
    }

    return query.orderBy('material.createdAt', 'ASC').getMany();
  }

  /**
   * Update a material
   */
  async update(
    id: string,
    projectId: string,
    updateData: Record<string, unknown>,
  ): Promise<ProjectMaterialEntity> {
    await this.repository.update({ id, projectId }, updateData);
    return this.findById(id, projectId);
  }

  /**
   * Delete a material
   */
  async delete(id: string, projectId: string): Promise<void> {
    const result = await this.repository.softDelete({ id, projectId });

    if (!result.affected || result.affected === 0) {
      throw new NotFoundException(`Material with ID ${id} not found`);
    }
  }

  /**
   * Update material status
   */
  async updateStatus(
    id: string,
    projectId: string,
    status: MaterialStatus,
  ): Promise<ProjectMaterialEntity> {
    await this.repository.update({ id, projectId }, { status });
    return this.findById(id, projectId);
  }

  /**
   * Update material quantities
   */
  async updateQuantities(
    id: string,
    projectId: string,
    quantities: {
      quantityAllocated?: number;
      quantityUsed?: number;
    },
  ): Promise<ProjectMaterialEntity> {
    await this.repository.update({ id, projectId }, quantities);
    return this.findById(id, projectId);
  }

  /**
   * Find required materials for a project
   */
  async findRequired(projectId: string): Promise<ProjectMaterialEntity[]> {
    return this.repository.find({
      where: {
        projectId,
        status: MaterialStatus.REQUIRED,
        deletedAt: IsNull(),
      },
      relations: ['product'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Calculate total cost of materials for a project
   */
  async calculateTotalCost(projectId: string): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('material')
      .select('SUM(material.totalCost)', 'total')
      .where('material.projectId = :projectId', { projectId })
      .andWhere('material.deletedAt IS NULL')
      .getRawOne<{ total: string }>();

    return result?.total ? parseFloat(result.total) : 0;
  }

  /**
   * Count materials by status
   */
  async countByStatus(projectId: string, status: MaterialStatus): Promise<number> {
    return this.repository.count({
      where: { projectId, status, deletedAt: IsNull() },
    });
  }
}
