import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { PermissionEntity } from '../entities/permission.entity';

@Injectable()
export class PermissionRepository {
  constructor(
    @InjectRepository(PermissionEntity)
    public readonly repository: Repository<PermissionEntity>,
  ) {}

  /**
   * Find permission by code
   */
  async findByCode(code: string): Promise<PermissionEntity | null> {
    return this.repository.findOne({
      where: { code, isActive: true },
      relations: ['feature'],
    });
  }

  /**
   * Find all permissions for a feature
   */
  async findByFeatureId(featureId: string): Promise<PermissionEntity[]> {
    return this.repository.find({
      where: { featureId, isActive: true },
      order: { action: 'ASC' },
    });
  }

  /**
   * Find permissions by codes
   */
  async findByCodes(codes: string[]): Promise<PermissionEntity[]> {
    return this.repository.find({
      where: { code: In(codes), isActive: true },
      relations: ['feature'],
    });
  }

  /**
   * Find permissions by action and feature
   */
  async findByActionAndFeature(action: string, featureId: string): Promise<PermissionEntity[]> {
    return this.repository.find({
      where: { action, featureId, isActive: true },
    });
  }

  /**
   * Find permissions by scope
   */
  async findByScope(
    scope: 'all' | 'own' | 'department' | 'assigned' | 'custom',
  ): Promise<PermissionEntity[]> {
    return this.repository.find({
      where: { scope, isActive: true },
    });
  }

  /**
   * Create a new permission
   */
  async create(data: Partial<PermissionEntity>): Promise<PermissionEntity> {
    const permission = this.repository.create(data);
    return this.repository.save(permission);
  }

  /**
   * Find one permission by criteria
   */
  async findOne(
    criteria: Parameters<Repository<PermissionEntity>['findOne']>[0],
  ): Promise<PermissionEntity | null> {
    return this.repository.findOne(criteria);
  }

  /**
   * Find permissions by feature with pagination
   */
  async findByFeatureIdPaginated(
    featureId: string,
    skip: number,
    take: number,
  ): Promise<[PermissionEntity[], number]> {
    return this.repository.findAndCount({
      where: { featureId, isActive: true },
      order: { action: 'ASC' },
      skip,
      take,
    });
  }

  /**
   * Find all permissions with pagination
   */
  async findAllPaginated(skip: number, take: number): Promise<[PermissionEntity[], number]> {
    return this.repository.findAndCount({
      order: { action: 'ASC', name: 'ASC' },
      skip,
      take,
      relations: ['feature'],
    });
  }

  /**
   * Update a permission
   */
  async update(id: string, data: Partial<PermissionEntity>): Promise<void> {
    // Use save instead of update to avoid type issues with relations
    const permission = await this.repository.findOne({ where: { id } });
    if (!permission) {
      throw new Error(`Permission with ID ${id} not found`);
    }
    Object.assign(permission, data);
    await this.repository.save(permission);
  }

  /**
   * Delete a permission
   */
  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
