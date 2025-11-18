import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IntegrationProvider, IntegrationCategory } from '@oneohm-epc/shared-types';
import { Repository } from 'typeorm';

import { IntegrationEntity } from '../entities';

/**
 * Integration Repository
 * Handles database operations for integrations
 */
@Injectable()
export class IntegrationRepository {
  constructor(
    @InjectRepository(IntegrationEntity)
    private readonly repository: Repository<IntegrationEntity>,
  ) {}

  /**
   * Create a new integration
   */
  async create(data: Partial<IntegrationEntity>): Promise<IntegrationEntity> {
    const integration = this.repository.create(data);
    return this.repository.save(integration);
  }

  /**
   * Find integration by ID
   */
  async findById(id: string): Promise<IntegrationEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  /**
   * Find all integrations for an organization
   */
  async findByOrganization(organizationId: string): Promise<IntegrationEntity[]> {
    return this.repository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find active integrations for an organization
   */
  async findActiveByOrganization(organizationId: string): Promise<IntegrationEntity[]> {
    return this.repository.find({
      where: { organizationId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find integration by organization, provider, and category
   */
  async findByOrgProviderCategory(
    organizationId: string,
    provider: IntegrationProvider,
    category: IntegrationCategory,
  ): Promise<IntegrationEntity | null> {
    return this.repository.findOne({
      where: {
        organizationId,
        provider,
        category,
        isActive: true,
      },
    });
  }

  /**
   * Find all active integrations by category for an organization
   */
  async findByCategoryAndOrg(
    category: IntegrationCategory,
    organizationId: string,
  ): Promise<IntegrationEntity[]> {
    return this.repository.find({
      where: {
        organizationId,
        category,
        isActive: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Update integration
   */
  async update(id: string, data: Partial<IntegrationEntity>): Promise<IntegrationEntity | null> {
    await this.repository.update(id, data);
    return this.findById(id);
  }

  /**
   * Delete integration (soft delete by setting isActive = false)
   */
  async softDelete(id: string): Promise<boolean> {
    const result = await this.repository.update(id, { isActive: false });
    return (result.affected ?? 0) > 0;
  }

  /**
   * Hard delete integration
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  /**
   * Check if integration exists for org + provider + category
   */
  async exists(
    organizationId: string,
    provider: IntegrationProvider,
    category: IntegrationCategory,
  ): Promise<boolean> {
    const count = await this.repository.count({
      where: { organizationId, provider, category },
    });
    return count > 0;
  }
}
