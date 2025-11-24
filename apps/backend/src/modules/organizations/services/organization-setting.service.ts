import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SettingDataType } from '@oneohm-epc/shared-types';

import { CreateOrganizationSettingDto } from '../dto/create-organization-setting.dto';
import { UpdateOrganizationSettingDto } from '../dto/update-organization-setting.dto';
import { OrganizationSettingEntity } from '../entities/organization-setting.entity';
import { OrganizationSettingRepository } from '../repositories/organization-setting.repository';

/**
 * Organization Setting Service
 * Business logic for organization settings management
 */
@Injectable()
export class OrganizationSettingService {
  private readonly logger = new Logger(OrganizationSettingService.name);

  constructor(private readonly organizationSettingRepository: OrganizationSettingRepository) {}

  /**
   * Create a new organization setting
   * @param createDto - Setting creation data
   * @param createdBy - User ID who is creating the setting
   * @returns Created setting
   */
  async create(
    createDto: CreateOrganizationSettingDto,
    createdBy?: string,
  ): Promise<OrganizationSettingEntity> {
    this.logger.log(`Creating setting for organization: ${createDto.organizationId}`);

    // TODO: Add business validation
    // - Check if organization exists
    // - Validate setting key format
    // - Check permissions

    const setting = await this.organizationSettingRepository.create({
      ...createDto,
      createdBy,
      updatedBy: createdBy,
    } as CreateOrganizationSettingDto);

    return setting;
  }

  /**
   * Find setting by ID
   * @param id - Setting UUID
   * @returns Setting entity
   * @throws NotFoundException if setting not found
   */
  async findById(id: string): Promise<OrganizationSettingEntity> {
    const setting = await this.organizationSettingRepository.findOneById(id);

    if (!setting) {
      throw new NotFoundException(`Setting with ID ${id} not found`);
    }

    return setting;
  }

  /**
   * Find setting by organization ID and key
   * @param organizationId - Organization UUID
   * @param key - Setting key
   * @returns Setting entity
   * @throws NotFoundException if setting not found
   */
  async findByKey(organizationId: string, key: string): Promise<OrganizationSettingEntity> {
    const setting = await this.organizationSettingRepository.findOneByKey(organizationId, key);

    if (!setting) {
      throw new NotFoundException(
        `Setting with key '${key}' not found for organization ${organizationId}`,
      );
    }

    return setting;
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
    return this.organizationSettingRepository.findByOrganization(organizationId, category);
  }

  /**
   * Find all settings with pagination
   * @param params - Query parameters
   * @returns Paginated list of settings
   */
  async findAll(params: { limit?: number; offset?: number; organizationId?: string }): Promise<{
    items: OrganizationSettingEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { limit = 10, offset = 0 } = params;

    const { items, total } = await this.organizationSettingRepository.findAll(params);

    return {
      items,
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
    };
  }

  /**
   * Update setting by ID
   * @param id - Setting UUID
   * @param updateDto - Update data
   * @param updatedBy - User ID who is updating
   * @returns Updated setting
   */
  async update(
    id: string,
    updateDto: UpdateOrganizationSettingDto,
    updatedBy?: string,
  ): Promise<OrganizationSettingEntity> {
    this.logger.log(`Updating setting: ${id}`);

    // TODO: Add business validation
    // - Check permissions
    // - Validate value against data type
    // - Check if setting is read-only

    const setting = await this.organizationSettingRepository.update(id, {
      ...updateDto,
      updatedBy,
    } as UpdateOrganizationSettingDto);

    return setting;
  }

  /**
   * Delete setting by ID
   * @param id - Setting UUID
   */
  async delete(id: string): Promise<void> {
    this.logger.log(`Deleting setting: ${id}`);

    // TODO: Add business validation
    // - Check if setting can be deleted
    // - Check permissions

    await this.organizationSettingRepository.delete(id);
  }

  /**
   * Upsert (create or update) a setting
   * @param organizationId - Organization UUID
   * @param key - Setting key
   * @param value - Setting value
   * @param dataType - Optional data type
   * @param category - Optional category
   * @param userId - User ID performing the action
   * @returns Created or updated setting
   */
  async upsert(
    organizationId: string,
    key: string,
    value: string,
    dataType?: SettingDataType,
    category?: string,
    userId?: string,
  ): Promise<OrganizationSettingEntity> {
    this.logger.log(`Upserting setting '${key}' for organization: ${organizationId}`);

    // TODO: Add business validation
    // - Validate value format
    // - Check permissions

    const setting = await this.organizationSettingRepository.upsert(
      organizationId,
      key,
      value,
      dataType,
      category,
    );

    // Update audit fields
    if (userId) {
      setting.updatedBy = userId;
      setting.createdBy ??= userId;
    }

    return setting;
  }

  /**
   * Get setting value by key
   * Returns the value as string, or default value if not found
   * @param organizationId - Organization UUID
   * @param key - Setting key
   * @param defaultValue - Default value if setting not found
   * @returns Setting value or default value
   */
  async getValue(
    organizationId: string,
    key: string,
    defaultValue?: string,
  ): Promise<string | null> {
    try {
      const setting = await this.findByKey(organizationId, key);
      return setting.value;
    } catch {
      return defaultValue ?? null;
    }
  }

  /**
   * Get all settings as key-value map
   * @param organizationId - Organization UUID
   * @param category - Optional category filter
   * @returns Map of key-value pairs
   */
  async getSettingsMap(
    organizationId: string,
    category?: string,
  ): Promise<Record<string, string | null>> {
    const settings = await this.findByOrganization(organizationId, category);

    return settings.reduce<Record<string, string | null>>((map, setting) => {
      map[setting.key] = setting.value;
      return map;
    }, {});
  }
}
