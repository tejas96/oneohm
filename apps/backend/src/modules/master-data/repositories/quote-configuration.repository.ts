import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { QuoteConfiguration } from '../entities/quote-configuration.entity';

/**
 * Quote Configuration Repository
 * Handles database operations for quote configurations
 * Each organization has ONE active configuration
 */
@Injectable()
export class QuoteConfigurationRepository {
  constructor(
    @InjectRepository(QuoteConfiguration)
    private readonly repository: Repository<QuoteConfiguration>,
  ) {}

  /**
   * Create a new quote configuration
   * Will deactivate any existing active config for the org
   */
  async create(
    organizationId: string,
    data: Partial<QuoteConfiguration>,
  ): Promise<QuoteConfiguration> {
    // Deactivate existing active configs
    await this.deactivateAll(organizationId);

    const config = this.repository.create({
      ...data,
      organizationId,
      isActive: true,
    });
    return this.repository.save(config);
  }

  /**
   * Get the active configuration for an organization
   * This is the main method used by the quote calculator
   */
  async getActiveConfig(organizationId: string): Promise<QuoteConfiguration | null> {
    return this.repository.findOne({
      where: {
        organizationId,
        isActive: true,
      },
    });
  }

  /**
   * Get or create default configuration
   * Creates a default config if none exists
   */
  async getOrCreateDefault(organizationId: string): Promise<QuoteConfiguration> {
    let config = await this.getActiveConfig(organizationId);

    if (!config) {
      config = await this.create(organizationId, {
        defaultValidityDays: 30,
        maxVersions: 3,
        defaultCompletionWeeks: 4,
        gstConfig: {
          rate1: 12,
          rate1Percentage: 70,
          rate2: 18,
          rate2Percentage: 30,
        },
        wattageRounding: {
          roundTo: 10,
          roundUpThreshold: 5,
        },
        paymentMilestones: [
          { stage: 'advance', name: 'Advance', percentage: 40, order: 1 },
          { stage: 'material_delivery', name: 'Material Delivery', percentage: 30, order: 2 },
          {
            stage: 'installation_complete',
            name: 'Installation Complete',
            percentage: 20,
            order: 3,
          },
          { stage: 'commissioning', name: 'Commissioning', percentage: 10, order: 4 },
        ],
        showInventoryStock: true,
      });
    }

    return config;
  }

  /**
   * Find all configurations for an organization (including inactive)
   */
  async findAll(organizationId: string): Promise<QuoteConfiguration[]> {
    return this.repository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find by ID
   */
  async findById(id: string, organizationId: string): Promise<QuoteConfiguration | null> {
    return this.repository.findOne({
      where: { id, organizationId },
    });
  }

  /**
   * Update quote configuration
   */
  async update(
    id: string,
    organizationId: string,
    data: Partial<QuoteConfiguration>,
  ): Promise<QuoteConfiguration> {
    await this.repository.update({ id, organizationId }, data);
    const updated = await this.findById(id, organizationId);
    if (!updated) {
      throw new Error('Quote configuration not found after update');
    }
    return updated;
  }

  /**
   * Set a configuration as active (deactivates others)
   */
  async setActive(id: string, organizationId: string): Promise<QuoteConfiguration> {
    await this.deactivateAll(organizationId);
    return this.update(id, organizationId, { isActive: true });
  }

  /**
   * Deactivate all configurations for an organization
   */
  async deactivateAll(organizationId: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(QuoteConfiguration)
      .set({ isActive: false })
      .where('organization_id = :organizationId', { organizationId })
      .execute();
  }

  /**
   * Delete quote configuration
   */
  async delete(id: string, organizationId: string): Promise<void> {
    await this.repository.delete({ id, organizationId });
  }
}
