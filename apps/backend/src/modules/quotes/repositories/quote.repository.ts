import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QuoteSortField, QuoteStatus, SortOrder } from '@oneohm-epc/shared/types';
import { Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import { QuoteQueryDto } from '../dto/quotes/quote-query.dto';
import { QuoteEntity } from '../entities/quote.entity';

/**
 * Latest quote info for property enrichment
 */
export interface LatestQuoteInfo {
  quoteNumber: string;
  status: QuoteStatus;
  quoteDate: Date;
  finalPrice?: number;
  systemSizeKw?: number;
}

const latestVersionJoinCondition = (quoteAlias: string): string => `cv.id = (
  SELECT qv.id
  FROM quote_versions qv
  WHERE qv.quote_id = ${quoteAlias}.id
  ORDER BY qv.created_at DESC, qv.version_number DESC, qv.id DESC
  LIMIT 1
)`;

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
      relations: ['customer', 'salesPerson', 'reseller', 'property', 'versions'],
    });

    if (!quote) {
      throw new NotFoundException(`Quote with ID ${id} not found`);
    }

    return quote;
  }

  /**
   * Find quotes with comprehensive filtering, sorting, and pagination
   * Primary method for the quote list API
   *
   * @param organizationId - Organization context
   * @param query - Query parameters (filters, sorting, pagination)
   * @returns Tuple of [quotes, total count]
   */
  async findWithFilters(
    organizationId: string,
    query: QuoteQueryDto,
  ): Promise<[QuoteEntity[], number]> {
    const qb = this.repository
      .createQueryBuilder('quote')
      .leftJoinAndSelect('quote.versions', 'cv', latestVersionJoinCondition('quote'))
      .leftJoinAndSelect('quote.customer', 'customer')
      .leftJoinAndSelect('quote.salesPerson', 'salesPerson')
      .leftJoinAndSelect('quote.reseller', 'reseller')
      .leftJoinAndSelect('quote.property', 'property')
      .where('quote.organizationId = :organizationId', { organizationId })
      .andWhere('quote.deletedAt IS NULL')
      .andWhere('quote.propertyId IS NOT NULL');

    // ===== Search (case-insensitive, multiple fields) =====
    if (query.search && query.search.length >= 2) {
      const searchTerm = `%${query.search}%`;
      qb.andWhere(
        `(
          quote.quoteNumber ILIKE :searchTerm OR
          customer.firstName ILIKE :searchTerm OR
          customer.lastName ILIKE :searchTerm OR
          CONCAT(customer.firstName, ' ', customer.lastName) ILIKE :searchTerm OR
          customer.phone ILIKE :searchTerm OR
          property.propertyName ILIKE :searchTerm
        )`,
        { searchTerm },
      );
    }

    // ===== Filters =====
    if (query.status) {
      qb.andWhere('quote.status = :status', { status: query.status });
    }

    if (query.customerId) {
      qb.andWhere('quote.customerId = :customerId', { customerId: query.customerId });
    }

    if (query.propertyId) {
      qb.andWhere('quote.propertyId = :propertyId', { propertyId: query.propertyId });
    }

    if (query.salesPersonId) {
      qb.andWhere('quote.salesPersonId = :salesPersonId', {
        salesPersonId: query.salesPersonId,
      });
    }

    if (query.resellerId) {
      qb.andWhere('quote.resellerId = :resellerId', {
        resellerId: query.resellerId,
      });
    }

    if (query.fromDate) {
      qb.andWhere('quote.quoteDate >= :fromDate', { fromDate: query.fromDate });
    }

    if (query.toDate) {
      // Accept both bare YYYY-MM-DD dates and full ISO timestamps.
      // When the caller sends a full ISO string (already includes time), use it
      // as-is. When only a date is provided, extend it to end-of-day so the
      // filter is inclusive of the entire selected day.
      const toDateValue = query.toDate.includes('T')
        ? query.toDate
        : `${query.toDate}T23:59:59.999Z`;
      qb.andWhere('quote.quoteDate <= :toDate', { toDate: toDateValue });
    }

    // Fetch all matching quotes ordered by createdAt desc, then keep one row per property.
    // Rule: if a property has any accepted quote, show the latest accepted quote; otherwise
    // show the latest quote by creation date.
    const allMatched = await qb
      .orderBy('quote.createdAt', 'DESC')
      .addOrderBy('quote.id', 'DESC')
      .getMany();

    const latestPerProperty = new Map<string, QuoteEntity>();
    for (const quote of allMatched) {
      if (!quote.propertyId) continue;
      const existing = latestPerProperty.get(quote.propertyId);
      if (!existing) {
        latestPerProperty.set(quote.propertyId, quote);
        continue;
      }

      const existingAccepted = existing.status === QuoteStatus.ACCEPTED;
      const candidateAccepted = quote.status === QuoteStatus.ACCEPTED;
      if (!existingAccepted && candidateAccepted) {
        latestPerProperty.set(quote.propertyId, quote);
      }
    }

    const groupedQuotes = Array.from(latestPerProperty.values());
    const sortDirection = query.sortOrder === SortOrder.ASC ? 'ASC' : 'DESC';
    groupedQuotes.sort((a, b) => {
      const dir = sortDirection === 'ASC' ? 1 : -1;
      const av = a.versions[0];
      const bv = b.versions[0];
      switch (query.sortBy) {
        case QuoteSortField.UPDATED_AT:
          return dir * (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
        case QuoteSortField.QUOTE_DATE:
          return dir * (new Date(a.quoteDate).getTime() - new Date(b.quoteDate).getTime());
        case QuoteSortField.VALID_UNTIL:
          return dir * (new Date(a.validUntil).getTime() - new Date(b.validUntil).getTime());
        case QuoteSortField.SYSTEM_SIZE:
          return dir * ((av?.systemSizeKw ?? 0) - (bv?.systemSizeKw ?? 0));
        case QuoteSortField.EFFECTIVE_PRICE:
          return dir * ((av?.effectivePrice ?? 0) - (bv?.effectivePrice ?? 0));
        case QuoteSortField.STATUS:
          return dir * a.status.localeCompare(b.status);
        case QuoteSortField.CUSTOMER_NAME: {
          const aName = `${a.customer.firstName} ${a.customer.lastName ?? ''}`.trim();
          const bName = `${b.customer.firstName} ${b.customer.lastName ?? ''}`.trim();
          return dir * aName.localeCompare(bName);
        }
        case QuoteSortField.CREATED_AT:
        default:
          return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      }
    });

    const total = groupedQuotes.length;
    const start = (query.page - 1) * query.limit;
    const end = start + query.limit;
    return [groupedQuotes.slice(start, end), total];
  }

  async findAllByPropertyId(propertyId: string, organizationId: string): Promise<QuoteEntity[]> {
    return this.repository
      .createQueryBuilder('quote')
      .leftJoinAndSelect('quote.versions', 'cv', latestVersionJoinCondition('quote'))
      .leftJoinAndSelect('quote.customer', 'customer')
      .leftJoinAndSelect('quote.salesPerson', 'salesPerson')
      .leftJoinAndSelect('quote.reseller', 'reseller')
      .leftJoinAndSelect('quote.property', 'property')
      .where('quote.organizationId = :organizationId', { organizationId })
      .andWhere('quote.propertyId = :propertyId', { propertyId })
      .andWhere('quote.deletedAt IS NULL')
      .orderBy('CASE WHEN quote.status = :acceptedStatus THEN 0 ELSE 1 END', 'ASC')
      .setParameter('acceptedStatus', QuoteStatus.ACCEPTED)
      .addOrderBy('quote.createdAt', 'DESC')
      .addOrderBy('quote.id', 'DESC')
      .getMany();
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
      } as QueryDeepPartialEntity<QuoteEntity>, // TypeORM has deep partial type limitations with relations
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
   * Must be called within a transaction for the pessimistic lock to work correctly.
   */
  async generateQuoteNumber(
    organizationCode: string,
    manager?: import('typeorm').EntityManager,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `QT-${organizationCode}-${year}`;

    const repo = manager ? manager.getRepository(QuoteEntity) : this.repository;

    const latestQuote = await repo
      .createQueryBuilder('quote')
      .withDeleted()
      .where('quote.quoteNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('quote.quoteNumber', 'DESC')
      .setLock('pessimistic_write')
      .getOne();

    let sequence = 1;
    if (latestQuote?.quoteNumber) {
      const parts = latestQuote.quoteNumber.split('-');
      const lastSequence = parseInt(parts[parts.length - 1] || '0', 10);
      sequence = lastSequence + 1;
    }

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

  /**
   * Find an accepted quote for a given property.
   * Used to enforce property-level locking once any quote is accepted.
   */
  async findAcceptedByPropertyId(
    propertyId: string,
    organizationId: string,
    excludeQuoteId?: string,
  ): Promise<QuoteEntity | null> {
    const qb = this.repository
      .createQueryBuilder('quote')
      .where('quote.organizationId = :organizationId', { organizationId })
      .andWhere('quote.propertyId = :propertyId', { propertyId })
      .andWhere('quote.status = :status', { status: QuoteStatus.ACCEPTED })
      .andWhere('quote.deletedAt IS NULL');
    if (excludeQuoteId) {
      qb.andWhere('quote.id != :excludeQuoteId', { excludeQuoteId });
    }
    return qb.getOne();
  }

  /**
   * Find latest quote for each property ID (batch lookup)
   * Uses PostgreSQL DISTINCT ON for efficient single-query retrieval
   *
   * @param propertyIds - Array of property IDs to look up
   * @param organizationId - Organization context
   * @returns Map of propertyId -> latest quote info
   */
  async findLatestByPropertyIds(
    propertyIds: string[],
    organizationId: string,
  ): Promise<Map<string, LatestQuoteInfo>> {
    // Early return for empty array (no properties = no quotes to look up)
    if (propertyIds.length === 0) {
      return new Map();
    }

    // PostgreSQL DISTINCT ON gives us the first row per property_id
    // Combined with ORDER BY createdAt DESC, we get the latest quote per property
    // Join latest quote version by creation date to get finalPrice/systemSizeKw
    const quotes = await this.repository
      .createQueryBuilder('quote')
      .leftJoinAndSelect('quote.versions', 'cv', latestVersionJoinCondition('quote'))
      .select([
        'quote.propertyId',
        'quote.quoteNumber',
        'quote.status',
        'quote.quoteDate',
        'cv.id',
        'cv.finalPrice',
        'cv.systemSizeKw',
      ])
      .distinctOn(['quote.propertyId'])
      .where('quote.propertyId IN (:...propertyIds)', { propertyIds })
      .andWhere('quote.organizationId = :organizationId', { organizationId })
      .andWhere('quote.deletedAt IS NULL')
      .orderBy('quote.propertyId')
      .addOrderBy('quote.createdAt', 'DESC')
      .addOrderBy('quote.id', 'DESC')
      .getMany();

    // Convert to Map for O(1) lookup
    const result = new Map<string, LatestQuoteInfo>();
    for (const quote of quotes) {
      if (quote.propertyId) {
        const cv = quote.versions[0];
        result.set(quote.propertyId, {
          quoteNumber: quote.quoteNumber,
          status: quote.status,
          quoteDate: quote.quoteDate,
          finalPrice: cv?.finalPrice != null ? Number(cv.finalPrice) : undefined,
          systemSizeKw: cv?.systemSizeKw != null ? Number(cv.systemSizeKw) : undefined,
        });
      }
    }

    return result;
  }
}
