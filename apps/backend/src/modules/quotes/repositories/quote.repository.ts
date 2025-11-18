import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QuoteStatus } from '@oneohm-epc/shared-types';
import { Repository } from 'typeorm';

import { QuoteEntity } from '../entities/quote.entity';

/**
 * Quote Repository
 * Handles database operations for quotes
 */
@Injectable()
export class QuoteRepository {
  constructor(
    @InjectRepository(QuoteEntity)
    private readonly repository: Repository<QuoteEntity>,
  ) {}

  /**
   * Create a new quote
   */
  async create(quoteData: Partial<QuoteEntity>): Promise<QuoteEntity> {
    const quote = this.repository.create(quoteData);
    return this.repository.save(quote);
  }

  /**
   * Find quote by ID
   */
  async findById(id: string, organizationId: string): Promise<QuoteEntity> {
    const quote = await this.repository.findOne({
      where: { id, organizationId },
      relations: ['customer', 'salesPerson', 'reseller', 'versions', 'versions.lineItems'],
    });

    if (!quote) {
      throw new NotFoundException(`Quote with ID ${id} not found`);
    }

    return quote;
  }

  /**
   * Find all quotes with filters
   */
  async findAll(
    organizationId: string,
    page = 1,
    limit = 20,
    filters?: {
      status?: QuoteStatus;
      customerId?: string;
      salesPersonId?: string;
      resellerId?: string;
      fromDate?: string;
      toDate?: string;
      search?: string;
    },
  ): Promise<{ quotes: QuoteEntity[]; total: number }> {
    const query = this.repository
      .createQueryBuilder('quote')
      .leftJoinAndSelect('quote.customer', 'customer')
      .leftJoinAndSelect('quote.salesPerson', 'salesPerson')
      .leftJoinAndSelect('quote.reseller', 'reseller')
      .where('quote.organizationId = :organizationId', { organizationId })
      .andWhere('quote.deletedAt IS NULL');

    // Apply filters
    if (filters?.status) {
      query.andWhere('quote.status = :status', { status: filters.status });
    }

    if (filters?.customerId) {
      query.andWhere('quote.customerId = :customerId', { customerId: filters.customerId });
    }

    if (filters?.salesPersonId) {
      query.andWhere('quote.salesPersonId = :salesPersonId', {
        salesPersonId: filters.salesPersonId,
      });
    }

    if (filters?.resellerId) {
      query.andWhere('quote.resellerId = :resellerId', {
        resellerId: filters.resellerId,
      });
    }

    if (filters?.fromDate) {
      query.andWhere('quote.quoteDate >= :fromDate', { fromDate: filters.fromDate });
    }

    if (filters?.toDate) {
      query.andWhere('quote.quoteDate <= :toDate', { toDate: filters.toDate });
    }

    if (filters?.search) {
      query.andWhere(
        '(quote.quoteNumber ILIKE :search OR customer.firstName ILIKE :search OR customer.lastName ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    // Pagination
    query.skip((page - 1) * limit).take(limit);

    // Order by date desc
    query.orderBy('quote.createdAt', 'DESC');

    const [quotes, total] = await query.getManyAndCount();

    return { quotes, total };
  }

  /**
   * Update quote
   */
  async update(
    id: string,
    organizationId: string,
    quoteData: Partial<QuoteEntity>,
  ): Promise<QuoteEntity> {
    await this.repository.update(
      { id, organizationId },
      {
        ...quoteData,
        updatedAt: new Date(),
      } as Partial<QuoteEntity>, // TypeORM has deep partial type limitations with relations
    );

    return this.findById(id, organizationId);
  }

  /**
   * Delete quote (soft delete)
   */
  async delete(id: string, organizationId: string): Promise<void> {
    const quote = await this.findById(id, organizationId);
    await this.repository.softDelete(quote.id);
  }

  /**
   * Generate next quote number
   */
  async generateQuoteNumber(organizationCode: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `QT-${organizationCode}-${year}`;

    // Find the latest quote number for this org and year
    const latestQuote = await this.repository
      .createQueryBuilder('quote')
      .where('quote.quoteNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('quote.quoteNumber', 'DESC')
      .getOne();

    let sequence = 1;
    if (latestQuote?.quoteNumber) {
      // Extract sequence number from last quote
      const parts = latestQuote.quoteNumber.split('-');
      const lastSequence = parseInt(parts[parts.length - 1] || '0', 10);
      sequence = lastSequence + 1;
    }

    // Format: QT-ORGCODE-YYYY-0001
    return `${prefix}-${sequence.toString().padStart(4, '0')}`;
  }

  /**
   * Find expired quotes
   */
  async findExpiredQuotes(): Promise<QuoteEntity[]> {
    const today = new Date().toISOString().split('T')[0];

    return this.repository
      .createQueryBuilder('quote')
      .where('quote.validUntil < :today', { today })
      .andWhere('quote.status NOT IN (:...statuses)', {
        statuses: [QuoteStatus.ACCEPTED, QuoteStatus.REJECTED, QuoteStatus.EXPIRED],
      })
      .andWhere('quote.deletedAt IS NULL')
      .getMany();
  }

  /**
   * Bulk update status (for expiry cron job)
   */
  async bulkUpdateStatus(quoteIds: string[], status: QuoteStatus): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(QuoteEntity)
      .set({ status, updatedAt: new Date() })
      .where('id IN (:...quoteIds)', { quoteIds })
      .execute();
  }
}
