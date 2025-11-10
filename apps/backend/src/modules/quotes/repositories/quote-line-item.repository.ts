import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { QuoteLineItemEntity } from '../entities/quote-line-item.entity';

/**
 * Quote Line Item Repository
 */
@Injectable()
export class QuoteLineItemRepository {
  constructor(
    @InjectRepository(QuoteLineItemEntity)
    private readonly repository: Repository<QuoteLineItemEntity>,
  ) {}

  /**
   * Create multiple line items
   */
  async createMany(lineItems: Partial<QuoteLineItemEntity>[]): Promise<QuoteLineItemEntity[]> {
    const entities = this.repository.create(lineItems);
    return this.repository.save(entities);
  }

  /**
   * Get line items for a version
   */
  async findByVersionId(versionId: string): Promise<QuoteLineItemEntity[]> {
    return this.repository.find({
      where: { quoteVersionId: versionId },
      relations: ['product'],
      order: { displayOrder: 'ASC' },
    });
  }

  /**
   * Delete line items for a version
   */
  async deleteByVersionId(versionId: string): Promise<void> {
    await this.repository.delete({ quoteVersionId: versionId });
  }
}


