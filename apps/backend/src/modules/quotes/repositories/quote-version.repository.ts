import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { QuoteVersionEntity } from '../entities/quote-version.entity';

/**
 * Quote Version Repository
 */
@Injectable()
export class QuoteVersionRepository {
  constructor(
    @InjectRepository(QuoteVersionEntity)
    private readonly repository: Repository<QuoteVersionEntity>,
  ) {}

  /**
   * Create a new version
   */
  async create(versionData: Partial<QuoteVersionEntity>): Promise<QuoteVersionEntity> {
    const version = this.repository.create(versionData);
    return this.repository.save(version);
  }

  /**
   * Get current version for a quote
   */
  async getCurrentVersion(quoteId: string): Promise<QuoteVersionEntity | null> {
    return this.repository.findOne({
      where: { quoteId, isCurrent: true },
      relations: ['lineItems', 'lineItems.product'],
    });
  }

  /**
   * Get all versions for a quote
   */
  async getVersionHistory(quoteId: string): Promise<QuoteVersionEntity[]> {
    return this.repository.find({
      where: { quoteId },
      relations: ['lineItems'],
      order: { versionNumber: 'DESC' },
    });
  }

  /**
   * Set version as current
   */
  async setCurrentVersion(quoteId: string, versionNumber: number): Promise<void> {
    // Set all versions as not current
    await this.repository.update({ quoteId }, { isCurrent: false });

    // Set specified version as current
    await this.repository.update({ quoteId, versionNumber }, { isCurrent: true });
  }
}
