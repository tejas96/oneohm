import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QuoteSortField, QuoteStatus, SortOrder } from '@tejas96/shared/types';
import { Repository, type EntityManager } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import { systemSizeKwOf } from '../../../common/utils';
import { QuoteQueryDto } from '../dto/quotes/quote-query.dto';
import { QuoteEntity } from '../entities/quote.entity';

/**
 * Latest quote info for property enrichment
 */
export interface LatestQuoteInfo {
  id: string;
  quoteNumber: string;
  status: QuoteStatus;
  /**
   * True when no LIVE quote exists on the roof and this is the newest voided
   * one, kept for its value alone. Callers must not present `status` as the
   * roof's current state when this is set — a voided quote keeps whatever
   * status it had, which is how a dead contract used to read "accepted".
   */
  voided: boolean;
  quoteDate: Date;
  finalPrice?: number;
  systemSizeKw?: number;
  totalWattageWp?: number;
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
  async findById(id: string): Promise<QuoteEntity> {
    const quote = await this.repository.findOne({
      where: { id },
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
   * @param query - Query parameters (filters, sorting, pagination)
   * @returns Tuple of [quotes, total count]
   */
  async findWithFilters(query: QuoteQueryDto): Promise<[QuoteEntity[], number]> {
    const qb = this.repository
      .createQueryBuilder('quote')
      .leftJoinAndSelect('quote.versions', 'cv', latestVersionJoinCondition('quote'))
      .leftJoinAndSelect('quote.customer', 'customer')
      .leftJoinAndSelect('quote.salesPerson', 'salesPerson')
      .leftJoinAndSelect('quote.reseller', 'reseller')
      .leftJoinAndSelect('quote.property', 'property')
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
      qb.andWhere('quote.quoteDate >= CAST(:fromDate AS date)', { fromDate: query.fromDate });
    }

    if (query.toDate) {
      /*
        `quote_date` is a bare DATE column, so compare it against dates.

        This used to extend a date-only bound to `T23:59:59.999Z`. Postgres then
        promoted the date column to a timestamptz at session midnight to compare
        them — and since IST midnight is 18:30 the previous day in UTC, a quote
        dated 1 September satisfied a filter ending 31 August. Verified against
        the live database before changing it.

        Casting instead keeps both ends on the calendar, where a date column
        belongs, and handles a full ISO instant too: the cast resolves it to its
        own calendar day in the session zone.
      */
      qb.andWhere('quote.quoteDate <= CAST(:toDate AS date)', { toDate: query.toDate });
    }

    /*
      Fetch all matching quotes ordered by createdAt desc, then keep one row per
      property — the one that best represents the roof; see `rank` below.

      That collapse is a LIST rule — the quotes page shows each roof once,
      represented by its current quote — and it is skipped when the caller has
      already named a property (see `rows` below).
    */
    const allMatched = await qb
      .orderBy('quote.createdAt', 'DESC')
      .addOrderBy('quote.id', 'DESC')
      .getMany();

    /*
      Which quote stands for a roof. Highest wins; ties go to the one already
      held, which is the newer, because `allMatched` is newest-first.

        2  a LIVE acceptance — the signed price is the roof's real price,
           whatever has been drafted since.
        1  any other live quote.
        0  a voided one.

      A voided quote scores below everything live, and that is the whole point
      of the rank. `status` cannot express this: voiding deliberately leaves it
      alone, so a withdrawn quote still reads `sent` and a withdrawn signed one
      still reads `accepted`. Ordered by date alone, a roof quoted again after
      a withdrawal was represented on the quotes list by the dead quote, and
      the live one it had been replaced with was not shown at all.

      Zero rather than excluded: a roof whose every quote has been withdrawn
      still has to appear on the list, or it silently leaves the pipeline.
    */
    const rank = (quote: QuoteEntity): number => {
      if (quote.voidedAt) return 0;
      return quote.status === QuoteStatus.ACCEPTED ? 2 : 1;
    };

    const latestPerProperty = new Map<string, QuoteEntity>();
    for (const quote of allMatched) {
      if (!quote.propertyId) continue;
      const existing = latestPerProperty.get(quote.propertyId);
      if (!existing || rank(quote) > rank(existing)) {
        latestPerProperty.set(quote.propertyId, quote);
      }
    }

    /*
      Asking for ONE roof's quotes and getting one row back is not a summary,
      it is a truncation. The collapse above exists so the list page shows each
      roof once; with `propertyId` already filtering to a single roof it has
      nothing left to collapse and only hides that roof's history.

      It hid real things. The property page's Quotes tab read "QUOTES 1" for a
      site with five, and the header above it took its system size and quote
      value from whichever single row survived — which, ordered by `createdAt`
      alone, could be a quote the office had already voided. The tab and the
      header disagreed with the version list on the quote page, which uses
      `findAllByPropertyId` and has always returned all of them.
    */
    const rows = query.propertyId ? allMatched : Array.from(latestPerProperty.values());
    const sortDirection = query.sortOrder === SortOrder.ASC ? 'ASC' : 'DESC';
    rows.sort((a, b) => {
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
          return dir * ((systemSizeKwOf(av ?? {}) ?? 0) - (systemSizeKwOf(bv ?? {}) ?? 0));
        case QuoteSortField.EFFECTIVE_PRICE:
          return dir * ((av?.effectivePrice ?? 0) - (bv?.effectivePrice ?? 0));
        case QuoteSortField.FINAL_PRICE:
          return dir * ((av?.finalPrice ?? 0) - (bv?.finalPrice ?? 0));
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

    const total = rows.length;
    const start = (query.page - 1) * query.limit;
    const end = start + query.limit;
    return [rows.slice(start, end), total];
  }

  /**
   * Has this roof ever been quoted at all — voided quotes included.
   *
   * Deliberately NOT `findLatestByPropertyIds`, which answers a different
   * question: that one skips voided quotes so cards stop showing a dead
   * quote's status as current. Using it as an existence check would let a
   * property whose only quotes are voided pass the hard-delete guard and
   * orphan those rows. "Is there a live quote" and "was anything ever
   * quoted here" are separate questions and need separate queries.
   */
  async existsAnyForProperty(propertyId: string, manager?: EntityManager): Promise<boolean> {
    const repo = manager ? manager.getRepository(QuoteEntity) : this.repository;
    const count = await repo
      .createQueryBuilder('quote')
      .where('quote.propertyId = :propertyId', { propertyId })
      .andWhere('quote.deletedAt IS NULL')
      .getCount();
    return count > 0;
  }

  /**
   * Every quote ever raised on a roof, live ones first.
   *
   * Voided quotes are NOT filtered out — they are the history of what was
   * tried on this site, and dropping them would make a cancelled project's
   * contract vanish. They are only demoted: the accepted-first ordering asks
   * for the LIVE contract, and a voided quote that still reads `accepted`
   * (voiding leaves `status` alone) is not one. Sorting it to the top would
   * put a dead contract where the reader looks for the current one.
   */
  async findAllByPropertyId(propertyId: string): Promise<QuoteEntity[]> {
    return this.repository
      .createQueryBuilder('quote')
      .leftJoinAndSelect('quote.versions', 'cv', latestVersionJoinCondition('quote'))
      .leftJoinAndSelect('quote.customer', 'customer')
      .leftJoinAndSelect('quote.salesPerson', 'salesPerson')
      .leftJoinAndSelect('quote.reseller', 'reseller')
      .leftJoinAndSelect('quote.property', 'property')
      .andWhere('quote.propertyId = :propertyId', { propertyId })
      .andWhere('quote.deletedAt IS NULL')
      .orderBy(
        'CASE WHEN quote.status = :acceptedStatus AND quote.voidedAt IS NULL THEN 0 ELSE 1 END',
        'ASC',
      )
      .addOrderBy('CASE WHEN quote.voidedAt IS NULL THEN 0 ELSE 1 END', 'ASC')
      .setParameter('acceptedStatus', QuoteStatus.ACCEPTED)
      .addOrderBy('quote.createdAt', 'DESC')
      .addOrderBy('quote.id', 'DESC')
      .getMany();
  }

  /**
   * Update quote
   */
  async update(id: string, quoteData: Partial<QuoteEntity>): Promise<QuoteEntity> {
    await this.repository.update(
      { id },
      {
        ...quoteData,
        updatedAt: new Date(),
      } as QueryDeepPartialEntity<QuoteEntity>, // TypeORM has deep partial type limitations with relations
    );

    return this.findById(id);
  }

  /**
   * Delete quote (soft delete)
   */
  async delete(id: string): Promise<void> {
    const quote = await this.findById(id);
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
    excludeQuoteId?: string,
  ): Promise<QuoteEntity | null> {
    const qb = this.repository
      .createQueryBuilder('quote')
      .andWhere('quote.propertyId = :propertyId', { propertyId })
      .andWhere('quote.status = :status', { status: QuoteStatus.ACCEPTED })
      .andWhere('quote.deletedAt IS NULL')
      .andWhere('quote.voidedAt IS NULL');
    if (excludeQuoteId) {
      qb.andWhere('quote.id != :excludeQuoteId', { excludeQuoteId });
    }
    return qb.getOne();
  }

  /**
   * Kill every quote on a roof that a rep could still act on. Without this a
   * `sent` quote survives the site being closed and gets chased.
   *
   * `excludeQuoteId` spares one quote. The rejection path passes the rejected
   * quote's own id: voiding it would stamp an administrative marker over the
   * customer's genuine decision, so the quote that CARRIES the decision keeps
   * it. Project cancellation deliberately passes nothing — there, voiding the
   * accepted quote is the entire point, because that is what unlocks the roof.
   */
  async voidAllOpenForProperty(
    propertyId: string,
    reason: string,
    userId: string,
    manager?: EntityManager,
    excludeQuoteId?: string,
  ): Promise<number> {
    const repo = manager ? manager.getRepository(QuoteEntity) : this.repository;
    const qb = repo
      .createQueryBuilder()
      .update(QuoteEntity)
      .set({ voidedAt: new Date(), voidReason: reason, updatedBy: userId })
      .where('property_id = :propertyId', { propertyId })
      .andWhere('voided_at IS NULL')
      .andWhere('deleted_at IS NULL');
    if (excludeQuoteId) {
      qb.andWhere('id != :excludeQuoteId', { excludeQuoteId });
    }
    const result = await qb.execute();
    return result.affected ?? 0;
  }

  /**
   * Find the latest LIVE quote for each property ID (batch lookup)
   * Uses PostgreSQL DISTINCT ON for efficient single-query retrieval
   *
   * Voided quotes are excluded here, not just demoted. This feeds
   * `latestQuoteStatus` on every property/customer surface that treats it as
   * "the current quote" (cards, list/detail pages, the sales-pipeline stage
   * calc) - a voided quote is not current, and those surfaces were never
   * designed to render a void state. A property whose only quote has been
   * voided is correctly absent from the returned map (reads as "no live
   * quote"), never the dead quote's status. The full history, voided quotes
   * included, is still available via findAllByPropertyId.
   *
   * @param propertyIds - Array of property IDs to look up
   * @returns Map of propertyId -> latest LIVE quote info (properties whose
   *   only quote(s) are voided are absent from the map)
   */
  async findLatestByPropertyIds(
    propertyIds: string[],
    manager?: EntityManager,
  ): Promise<Map<string, LatestQuoteInfo>> {
    // Early return for empty array (no properties = no quotes to look up)
    if (propertyIds.length === 0) {
      return new Map();
    }

    // PostgreSQL DISTINCT ON gives us the first row per property_id
    // Combined with ORDER BY createdAt DESC, we get the latest quote per property
    // Join latest quote version by creation date to get finalPrice/totalWattageWp
    const quotes = await (manager ?? this.repository.manager)
      .getRepository(QuoteEntity)
      .createQueryBuilder('quote')
      .leftJoinAndSelect('quote.versions', 'cv', latestVersionJoinCondition('quote'))
      .select([
        'quote.id',
        'quote.propertyId',
        'quote.quoteNumber',
        'quote.status',
        'quote.quoteDate',
        'cv.id',
        'cv.finalPrice',
        'cv.totalWattageWp',
      ])
      .distinctOn(['quote.propertyId'])
      .where('quote.propertyId IN (:...propertyIds)', { propertyIds })
      .addSelect('quote.voidedAt')
      .andWhere('quote.deletedAt IS NULL')
      // Live quotes win outright. A voided one is only reached when the roof
      // has nothing live left — it still carries the value of what was tried,
      // which a lost site needs in order to say "we quoted X and lost".
      .orderBy('quote.propertyId')
      .addOrderBy('CASE WHEN quote.voided_at IS NULL THEN 0 ELSE 1 END', 'ASC')
      .addOrderBy('quote.createdAt', 'DESC')
      .addOrderBy('quote.id', 'DESC')
      .getMany();

    // Convert to Map for O(1) lookup
    const result = new Map<string, LatestQuoteInfo>();
    for (const quote of quotes) {
      if (quote.propertyId) {
        const cv = quote.versions[0];
        result.set(quote.propertyId, {
          id: quote.id,
          quoteNumber: quote.quoteNumber,
          status: quote.status,
          voided: quote.voidedAt != null,
          quoteDate: quote.quoteDate,
          finalPrice: cv?.finalPrice != null ? Number(cv.finalPrice) : undefined,
          systemSizeKw: systemSizeKwOf(cv ?? {}),
          totalWattageWp: cv?.totalWattageWp != null ? Number(cv.totalWattageWp) : undefined,
        });
      }
    }

    return result;
  }
}
