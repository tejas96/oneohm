import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { FeatureEntity } from '../entities/feature.entity';

@Injectable()
export class FeatureRepository {
  constructor(
    @InjectRepository(FeatureEntity)
    public readonly repository: Repository<FeatureEntity>,
  ) {}

  /**
   * Find feature by code
   */
  async findByCode(code: string): Promise<FeatureEntity | null> {
    return this.repository.findOne({
      where: { code },
      relations: ['parent', 'children', 'permissions'],
    });
  }

  /**
   * Find all active features
   */
  async findAllActive(): Promise<FeatureEntity[]> {
    return this.repository.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC', name: 'ASC' },
      relations: ['parent', 'children'],
    });
  }

  /**
   * Find all root features (no parent)
   */
  async findRootFeatures(): Promise<FeatureEntity[]> {
    return this.repository.find({
      where: { parentFeatureId: IsNull(), isActive: true },
      order: { displayOrder: 'ASC' },
      relations: ['children'],
    });
  }

  /**
   * Find features by type
   */
  async findByType(
    featureType: 'module' | 'sub_feature' | 'component' | 'workflow',
  ): Promise<FeatureEntity[]> {
    return this.repository.find({
      where: { featureType, isActive: true },
      order: { displayOrder: 'ASC' },
    });
  }

  /**
   * Check if feature requires license
   */
  async requiresLicense(featureId: string): Promise<boolean> {
    const feature = await this.repository.findOne({
      where: { id: featureId },
      select: ['requiresLicense', 'licenseTier'],
    });
    return feature?.requiresLicense || false;
  }

  /**
   * Get feature with all permissions
   */
  async findWithPermissions(featureId: string): Promise<FeatureEntity | null> {
    return this.repository.findOne({
      where: { id: featureId },
      relations: ['permissions'],
    });
  }

  /**
   * Create a new feature
   */
  async create(data: Partial<FeatureEntity>): Promise<FeatureEntity> {
    const feature = this.repository.create(data);
    return this.repository.save(feature);
  }

  /**
   * Find one feature by criteria
   */
  async findOne(
    criteria: Parameters<Repository<FeatureEntity>['findOne']>[0],
  ): Promise<FeatureEntity | null> {
    return this.repository.findOne(criteria);
  }

  /**
   * Find active features with pagination
   */
  async findActivePaginated(skip: number, take: number): Promise<[FeatureEntity[], number]> {
    return this.repository.findAndCount({
      where: { isActive: true },
      order: { displayOrder: 'ASC', name: 'ASC' },
      skip,
      take,
    });
  }

  /**
   * Find all features with pagination
   */
  async findAllPaginated(skip: number, take: number): Promise<[FeatureEntity[], number]> {
    return this.repository.findAndCount({
      order: { displayOrder: 'ASC', name: 'ASC' },
      skip,
      take,
    });
  }

  /**
   * Update a feature
   */
  async update(id: string, data: Partial<FeatureEntity>): Promise<void> {
    // Use save instead of update to avoid type issues with relations
    const feature = await this.repository.findOne({ where: { id } });
    if (!feature) {
      throw new Error(`Feature with ID ${id} not found`);
    }
    Object.assign(feature, data);
    await this.repository.save(feature);
  }

  /**
   * Delete a feature
   */
  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
