import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QuoteSortField, QuoteStatus, SortOrder } from '@oneohm-epc/shared/types';
import { Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import { QuoteQueryDto } from '../dto/quotes/quote-query.dto';
import { QuoteEntity } from '../entities/quote.entity';

/**
 * Field mapping for safe sorting (prevents SQL injection via sortBy)
 * Maps enum values to entity property paths — TypeORM resolves these to DB columns
 */
const SORT_FIELD_MAP: Record<QuoteSortField, string> = {
  [QuoteSortField.CREATED_AT]: 'quote.createdAt',
  [QuoteSortField.UPDATED_AT]: 'quote.updatedAt',
  [QuoteSortField.QUOTE_DATE]: 'quote.quoteDate',
  [QuoteSortField.VALID_UNTIL]: 'quote.validUntil',
  [QuoteSortField.SYSTEM_SIZE]: 'cv.systemSizeKw',
  [QuoteSortField.EFFECTIVE_PRICE]: 'cv.effectivePrice',
  [QuoteSortField.STATUS]: 'quote.status',
  [QuoteSortField.CUSTOMER_NAME]: 'customer.firstName',
};

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
   * Find all quotes with filters
   */
  async findAll(
    organizationId: string,
    page = 1,
    limit = 20,
    filters?: {
      status?: QuoteStatus;
      customerId?: string;
      propertyId?: string;
      salesPersonId?: string;
      resellerId?: string;
      fromDate?: string;
      toDate?: string;
      search?: string;
    },
  ): Promise<{ quotes: QuoteEntity[]; total: number }> {
    const query = this.repository
      .createQueryBuilder('quote')
      .leftJoinAndSelect('quote.versions', 'cv', 'cv.isCurrent = :isCurrent', { isCurrent: true })
      .leftJoinAndSelect('quote.customer', 'customer')
      .leftJoinAndSelect('quote.salesPerson', 'salesPerson')
      .leftJoinAndSelect('quote.reseller', 'reseller')
      .leftJoinAndSelect('quote.property', 'property')
      .where('quote.organizationId = :organizationId', { organizationId })
      .andWhere('quote.deletedAt IS NULL');

    // Apply filters
    if (filters?.status) {
      query.andWhere('quote.status = :status', { status: filters.status });
    }

    if (filters?.customerId) {
      query.andWhere('quote.customerId = :customerId', { customerId: filters.customerId });
    }

    if (filters?.propertyId) {
      query.andWhere('quote.propertyId = :propertyId', { propertyId: filters.propertyId });
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
      .leftJoinAndSelect('quote.versions', 'cv', 'cv.isCurrent = :isCurrent', { isCurrent: true })
      .leftJoinAndSelect('quote.customer', 'customer')
      .leftJoinAndSelect('quote.salesPerson', 'salesPerson')
      .leftJoinAndSelect('quote.reseller', 'reseller')
      .leftJoinAndSelect('quote.property', 'property')
      .where('quote.organizationId = :organizationId', { organizationId })
      .andWhere('quote.deletedAt IS NULL');

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
      qb.andWhere('quote.quoteDate <= :toDate', {
        toDate: `${query.toDate}T23:59:59.999Z`,
      });
    }

    // ===== Sorting (using safe field mapping) =====
    const sortColumn = SORT_FIELD_MAP[query.sortBy] ?? SORT_FIELD_MAP[QuoteSortField.CREATED_AT];
    const sortDirection = query.sortOrder === SortOrder.ASC ? 'ASC' : 'DESC';
    qb.orderBy(sortColumn, sortDirection, 'NULLS LAST');

    if (query.sortBy === QuoteSortField.CUSTOMER_NAME) {
      qb.addOrderBy('customer.lastName', sortDirection, 'NULLS LAST');
    }

    // ===== Pagination =====
    qb.skip((query.page - 1) * query.limit).take(query.limit);

    return qb.getManyAndCount();
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
   * Find the most recent revisable (DRAFT or SENT) quote for a customer+property.
   * When maxVersions is provided, prefers quotes that still have version capacity.
   * Falls back to any revisable quote if all are at the limit.
   */
  async findRevisableQuote(
    organizationId: string,
    customerId: string,
    propertyId?: string,
    maxVersions?: number | null,
  ): Promise<QuoteEntity | null> {
    const baseConditions = (qb: import('typeorm').SelectQueryBuilder<QuoteEntity>) => {
      qb.where('quote.organizationId = :organizationId', { organizationId })
        .andWhere('quote.customerId = :customerId', { customerId })
        .andWhere('quote.status IN (:...statuses)', {
          statuses: [QuoteStatus.DRAFT, QuoteStatus.SENT],
        })
        .andWhere('quote.deletedAt IS NULL');

      if (propertyId) {
        qb.andWhere('quote.propertyId = :propertyId', { propertyId });
      } else {
        qb.andWhere('quote.propertyId IS NULL');
      }
    };

    // When maxVersions is set, only return quotes with remaining capacity.
    // If all quotes are maxed out, return null so a brand-new quote is created.
    if (maxVersions != null && maxVersions > 0) {
      const qb = this.repository.createQueryBuilder('quote');
      baseConditions(qb);
      qb.andWhere('quote.currentVersion < :maxVersions', { maxVersions });
      qb.orderBy('quote.createdAt', 'DESC');
      const withCapacity = await qb.getOne();
      return withCapacity;
    }

    // No maxVersions configured: return the most recent revisable quote
    const qb = this.repository.createQueryBuilder('quote');
    baseConditions(qb);
    qb.orderBy('quote.createdAt', 'DESC');
    return qb.getOne();
  }

  /**
   * Find ALL revisable (DRAFT or SENT) quotes for a customer+property.
   * Used to present the user with a choice of which quote to archive.
   */
  async findAllRevisableQuotes(
    organizationId: string,
    customerId: string,
    propertyId?: string,
  ): Promise<QuoteEntity[]> {
    const qb = this.repository
      .createQueryBuilder('quote')
      .where('quote.organizationId = :organizationId', { organizationId })
      .andWhere('quote.customerId = :customerId', { customerId })
      .andWhere('quote.status IN (:...statuses)', {
        statuses: [QuoteStatus.DRAFT, QuoteStatus.SENT],
      })
      .andWhere('quote.deletedAt IS NULL');

    if (propertyId) {
      qb.andWhere('quote.propertyId = :propertyId', { propertyId });
    } else {
      qb.andWhere('quote.propertyId IS NULL');
    }

    qb.orderBy('quote.createdAt', 'DESC');

    return qb.getMany();
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
    // Combined with ORDER BY quoteDate DESC, we get the latest quote per property
    // Join current version to get finalPrice and systemSizeKw
    const quotes = await this.repository
      .createQueryBuilder('quote')
      .leftJoinAndSelect('quote.versions', 'cv', 'cv.versionNumber = quote.currentVersion')
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
      .addOrderBy('quote.quoteDate', 'DESC')
      .getMany();

    // Convert to Map for O(1) lookup
    const result = new Map<string, LatestQuoteInfo>();
    for (const quote of quotes) {
      if (quote.propertyId) {
        const cv = quote.versions?.[0];
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
