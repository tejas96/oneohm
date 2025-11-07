import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { SettingDataType } from '@oneohm-epc/shared-types';
import { Repository } from 'typeorm';

import { CreateOrganizationSettingDto } from '../dto/create-organization-setting.dto';
import { UpdateOrganizationSettingDto } from '../dto/update-organization-setting.dto';
import { OrganizationSettingEntity } from '../entities/organization-setting.entity';

/**
 * Organization Setting Repository
 * Handles database operations for OrganizationSetting entity
 */
@Injectable()
export class OrganizationSettingRepository {
  constructor(
    @InjectRepository(OrganizationSettingEntity)
    private readonly repository: Repository<OrganizationSettingEntity>,
  ) {}

  /**
   * Create a new organization setting
   * @param data - Setting creation data
   * @returns Created setting entity
   */
  async create(data: CreateOrganizationSettingDto): Promise<OrganizationSettingEntity> {
    const entity = this.repository.create({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return this.repository.save(entity);
  }

  /**
   * Find setting by ID
   * @param id - Setting UUID
   * @returns Setting entity or null if not found
   */
  async findOneById(id: string): Promise<OrganizationSettingEntity | null> {
    return this.repository.findOne({
      where: { id },
    });
  }

  /**
   * Find setting by organization ID and key
   * @param organizationId - Organization UUID
   * @param key - Setting key
   * @returns Setting entity or null if not found
   */
  async findOneByKey(
    organizationId: string,
    key: string,
  ): Promise<OrganizationSettingEntity | null> {
    return this.repository.findOne({
      where: { organizationId, key },
    });
  }

  /**
   * Find all settings for an organization
   * @param organizationId - Organization UUID
   * @param category - Optional category filter
   * @returns List of settings
   */
  async findByOrganization(
    organizationId: string,
    category?: string,
  ): Promise<OrganizationSettingEntity[]> {
    const where: Record<string, string> = { organizationId };

    if (category) {
      where.category = category;
    }

    return this.repository.find({
      where,
      order: { category: 'ASC', key: 'ASC' },
    });
  }

  /**
   * Find all settings with pagination
   * @param params - Pagination parameters
   * @returns Paginated settings list with total count
   */
  async findAll(params: {
    limit?: number;
    offset?: number;
    organizationId?: string;
  }): Promise<{ items: OrganizationSettingEntity[]; total: number }> {
    const { limit = 10, offset = 0, organizationId } = params;

    const where: Record<string, string> = {};
    if (organizationId) {
      where.organizationId = organizationId;
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
   * Update setting by ID
   * @param id - Setting UUID
   * @param data - Update data
   * @returns Updated setting entity
   * @throws NotFoundException if setting not found
   */
  async update(id: string, data: UpdateOrganizationSettingDto): Promise<OrganizationSettingEntity> {
    const setting = await this.findOneById(id);

    if (!setting) {
      throw new NotFoundException(`Organization setting with ID ${id} not found`);
    }

    Object.assign(setting, {
      ...data,
      updatedAt: new Date(),
    });

    return this.repository.save(setting);
  }

  /**
   * Delete setting by ID
   * @param id - Setting UUID
   * @throws NotFoundException if setting not found
   */
  async delete(id: string): Promise<void> {
    const setting = await this.findOneById(id);

    if (!setting) {
      throw new NotFoundException(`Organization setting with ID ${id} not found`);
    }

    await this.repository.delete(id);
  }

  /**
   * Upsert (insert or update) a setting
   * @param organizationId - Organization UUID
   * @param key - Setting key
   * @param value - Setting value
   * @param dataType - Data type
   * @returns Created or updated setting entity
   */
  async upsert(
    organizationId: string,
    key: string,
    value: string,
    dataType?: SettingDataType,
    category?: string,
  ): Promise<OrganizationSettingEntity> {
    const existing = await this.findOneByKey(organizationId, key);

    if (existing) {
      existing.value = value;
      if (dataType) {
        existing.dataType = dataType;
      }
      if (category) {
        existing.category = category;
      }
      existing.updatedAt = new Date();
      return this.repository.save(existing);
    }

    return this.create({
      organizationId,
      key,
      value,
      dataType,
      category,
    });
  }
}
