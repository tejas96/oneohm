import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { OrganizationStatus } from '@oneohm-epc/shared-types';
import { FindOptionsWhere, IsNull, Repository } from 'typeorm';

import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { UpdateOrganizationDto } from '../dto/update-organization.dto';
import { OrganizationEntity } from '../entities/organization.entity';

/**
 * Organization Repository
 * Handles database operations for Organization entity
 */
@Injectable()
export class OrganizationRepository {
  constructor(
    @InjectRepository(OrganizationEntity)
    private readonly repository: Repository<OrganizationEntity>,
  ) {}

  /**
   * Create a new organization
   * @param data - Organization creation data
   * @returns Created organization entity
   */
  async create(data: CreateOrganizationDto): Promise<OrganizationEntity> {
    const entity = this.repository.create({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return this.repository.save(entity);
  }

  /**
   * Find organization by ID
   * @param id - Organization UUID
   * @returns Organization entity or null if not found
   */
  async findOneById(id: string): Promise<OrganizationEntity | null> {
    return this.repository.findOne({
      where: { id, deletedAt: IsNull() } as FindOptionsWhere<OrganizationEntity>,
      relations: ['settings'],
    });
  }

  /**
   * Find organization by code
   * @param code - Unique organization code
   * @returns Organization entity or null if not found
   */
  async findOneByCode(code: string): Promise<OrganizationEntity | null> {
    return this.repository.findOne({
      where: { code, deletedAt: IsNull() } as FindOptionsWhere<OrganizationEntity>,
    });
  }

  /**
   * Find all organizations with pagination
   * @param params - Pagination parameters
   * @returns Paginated organizations list with total count
   */
  async findAll(params: {
    limit?: number;
    offset?: number;
    status?: OrganizationStatus;
  }): Promise<{ items: OrganizationEntity[]; total: number }> {
    const { limit = 10, offset = 0, status } = params;

    const where: FindOptionsWhere<OrganizationEntity> = {
      deletedAt: IsNull(),
    };

    if (status) {
      where.status = status;
    }

    const [items, total] = await this.repository.findAndCount({
      where,
      take: limit,
      skip: offset,
      order: { createdAt: 'DESC' },
    });

    return { items, total };
  }

  /**
   * Update organization by ID
   * @param id - Organization UUID
   * @param data - Update data
   * @returns Updated organization entity
   * @throws NotFoundException if organization not found
   */
  async update(id: string, data: UpdateOrganizationDto): Promise<OrganizationEntity> {
    const organization = await this.findOneById(id);

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    Object.assign(organization, {
      ...data,
      updatedAt: new Date(),
    });

    return this.repository.save(organization);
  }

  /**
   * Soft delete organization by ID
   * @param id - Organization UUID
   * @throws NotFoundException if organization not found
   */
  async delete(id: string): Promise<void> {
    const organization = await this.findOneById(id);

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    await this.repository.softDelete(id);
  }

  /**
   * Check if organization code exists
   * @param code - Organization code
   * @param excludeId - Optional organization ID to exclude from check
   * @returns true if code exists, false otherwise
   */
  async codeExists(code: string, excludeId?: string): Promise<boolean> {
    const where: FindOptionsWhere<OrganizationEntity> = {
      code,
      deletedAt: IsNull(),
    };

    if (excludeId) {
      const count = await this.repository.count({
        where: {
          code,
          deletedAt: IsNull(),
        },
      });
      return count > (excludeId ? 1 : 0);
    }

    const count = await this.repository.count({ where });
    return count > 0;
  }
}
