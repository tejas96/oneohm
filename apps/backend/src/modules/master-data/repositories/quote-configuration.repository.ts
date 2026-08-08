import { BadRequestException, Injectable } from '@nestjs/common';
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
  async create(data: Partial<QuoteConfiguration>): Promise<QuoteConfiguration> {
    // Deactivate existing active configs
    await this.deactivateAll();

    const config = this.repository.create({
      ...data,
      isActive: true,
    });
    return this.repository.save(config);
  }

  /**
   * Get the active configuration for an organization
   * This is the main method used by the quote calculator
   */
  async getActiveConfig(): Promise<QuoteConfiguration | null> {
    return this.repository.findOne({
      where: {
        isActive: true,
      },
    });
  }

  /**
   * Get or create default configuration
   * Creates a default config if none exists
   */
  async getOrCreateDefault(): Promise<QuoteConfiguration> {
    let config = await this.getActiveConfig();

    if (!config) {
      try {
        config = await this.create({
          defaultValidityDays: 30,
          maxVersions: 3,
          defaultCompletionWeeks: 4,
          gstConfig: {
            rate1: 5,
            rate1Percentage: 70,
            rate2: 18,
            rate2Percentage: 30,
          },
          paymentMilestones: [
            { stage: 'advance', name: 'Advance', percentage: 10, order: 1 },
            {
              stage: 'installation_complete',
              name: 'Installation Complete',
              percentage: 85,
              order: 2,
            },
            { stage: 'commissioning', name: 'Commissioning', percentage: 5, order: 3 },
          ],
          showInventoryStock: true,
          profitMarginTiers: [],
        });
      } catch (error: unknown) {
        const err = error as { code?: string };
        if (err?.code === '23503') {
          throw new BadRequestException(`Invalid quote configuration`);
        }
        throw error;
      }
    }

    return config;
  }

  /**
   * Find all configurations for an organization (including inactive)
   */
  async findAll(): Promise<QuoteConfiguration[]> {
    return this.repository.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find by ID
   */
  async findById(id: string): Promise<QuoteConfiguration | null> {
    return this.repository.findOne({
      where: { id },
    });
  }

  /**
   * Update quote configuration
   */
  async update(id: string, data: Partial<QuoteConfiguration>): Promise<QuoteConfiguration> {
    await this.repository.update({ id }, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Quote configuration not found after update');
    }
    return updated;
  }

  /**
   * Set a configuration as active (deactivates others)
   */
  async setActive(id: string): Promise<QuoteConfiguration> {
    await this.deactivateAll();
    return this.update(id, { isActive: true });
  }

  /**
   * Deactivate all configurations for an organization
   */
  async deactivateAll(): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(QuoteConfiguration)
      .set({ isActive: false })
      .execute();
  }

  /**
   * Delete quote configuration
   */
  async delete(id: string): Promise<void> {
    await this.repository.delete({ id });
  }
}
