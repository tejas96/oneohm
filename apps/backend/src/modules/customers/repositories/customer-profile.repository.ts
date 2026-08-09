import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CustomerSortField,
  CustomerStatus,
  LeadSource,
  PropertyStatus,
  QuoteStatus,
  SortOrder,
} from '@tejas96/shared/types';
import {
  hasAnyCustomerPropertyFilter,
  hasContradictoryCustomerPropertyFilters,
} from '@tejas96/shared/utils';
import { IsNull, Repository, type EntityManager, type SelectQueryBuilder } from 'typeorm';

import { CustomerQueryDto } from '../dto/customer-query.dto';
import { CustomerProfileEntity } from '../entities/customer-profile.entity';

/**
 * Per-customer roll-up of the site portfolio, as rendered by the CRM list's
 * "Site portfolio" column (count · capacity, status distribution bar, quoted
 * total) and by the expanded row's summary pills.
 */
export interface SitePortfolioSummary {
  siteCount: number;
  /** Sites keyed by `PropertyStatus` — drives the stacked distribution bar. */
  statusCounts: Record<string, number>;
  convertedCount: number;
  /** Sites that have at least one quote. */
  quotedSiteCount: number;
  /**
   * Σ system size (kW) across each site's current quote version, preferring
   * the modules actually selected (`total_wattage_wp / 1000`) over the quote's
   * `system_size_kw` field. See `getSitePortfolioSummaries` for why.
   */
  totalSystemSizeKw: number;
  /** Σ final price across each site's current quote version. */
  totalQuotedAmount: number;
}

/** Company-wide CRM roll-up behind the four KPI cards on the list page. */
export interface CustomerOverviewStats {
  customers: number;
  customersThisMonth: number;
  sites: number;
  sitesThisMonth: number;
  /** Σ quoted value of sites still in play (quote sent/viewed, not converted). */
  pipelineValue: number;
  /** Sites whose latest quote is out and unanswered. */
  awaitingReply: number;
  /** Of those, unanswered for longer than `AWAITING_AGEING_DAYS`. */
  awaitingAgeing: number;
}

/** A quote sitting unanswered longer than this is flagged as ageing. */
const AWAITING_AGEING_DAYS = 7;

/**
 * Correlated-subquery joins resolving each property's latest quote (`latest_quote`)
 * and that quote's current version (`cv`), for a query whose driving table is
 * aliased `prop`.
 *
 * Shared verbatim by the portfolio roll-up and the overview stats so both read
 * the same "latest quote" as the property list
 * (`CustomerPropertyRepository.findWithFilters`) — three places computing
 * "latest" differently is exactly how a KPI drifts from the table beneath it.
 *
 */
function latestQuoteJoins(): string {
  return `
    LEFT JOIN quotes latest_quote ON latest_quote.id = (
      SELECT q2.id FROM quotes q2
      WHERE q2.property_id = prop.id
        AND q2.deleted_at IS NULL
      ORDER BY q2.created_at DESC, q2.id DESC
      LIMIT 1
    )
    LEFT JOIN quote_versions cv ON cv.id = (
      SELECT qv.id FROM quote_versions qv
      WHERE qv.quote_id = latest_quote.id
      ORDER BY qv.created_at DESC, qv.version_number DESC, qv.id DESC
      LIMIT 1
    )
  `;
}

/** Quote states that mean "sent to the customer, still unanswered". */
const AWAITING_QUOTE_STATUSES: readonly string[] = [QuoteStatus.SENT, QuoteStatus.VIEWED];

/**
 * `PropertyStatus.CONVERTED` widened to `string`.
 *
 * Raw-SQL rows come back as plain strings, and comparing one directly against
 * an enum member is a type error even though the values match. Widening once
 * here beats an inline cast at the comparison, which would suppress the check
 * rather than explain it.
 */
const CONVERTED_STATUS: string = PropertyStatus.CONVERTED;

/** First instant of the current month, in server-local time. */
function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}

/** `AWAITING_AGEING_DAYS` ago, as a `YYYY-MM-DD` string for a `date` column. */
function ageingCutoffDate(): string {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - AWAITING_AGEING_DAYS);
  return `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(
    cutoff.getDate(),
  ).padStart(2, '0')}`;
}

/**
 * Known lead source enum values used to identify "other" / custom sources
 * when filtering. Any lead_source value NOT in this list is considered "other".
 */
const KNOWN_LEAD_SOURCE_VALUES = Object.values(LeadSource) as string[];

/**
 * Field mapping for safe sorting (prevents SQL injection via sortBy)
 * Maps enum values to entity property paths (camelCase) - TypeORM resolves these to DB columns
 */
const SORT_FIELD_MAP: Record<CustomerSortField, string> = {
  [CustomerSortField.CREATED_AT]: 'customer.createdAt',
  [CustomerSortField.UPDATED_AT]: 'customer.updatedAt',
  [CustomerSortField.FIRST_NAME]: 'customer.firstName',
  [CustomerSortField.CITY]: 'customer.city',
  [CustomerSortField.STATUS]: 'customer.status',
};

function needsQuoteJoinForPropertyFilter(query: CustomerQueryDto): boolean {
  return (
    query.quoteStatus !== undefined ||
    query.propertySystemSizeMin !== undefined ||
    query.propertySystemSizeMax !== undefined
  );
}

function applyMatchingPropertyFilter(
  qb: SelectQueryBuilder<CustomerProfileEntity>,
  query: CustomerQueryDto,
): void {
  if (!hasAnyCustomerPropertyFilter(query)) {
    return;
  }

  const conditions: string[] = ['prop.customer_id = customer.id', 'prop.deleted_at IS NULL'];
  const params: Record<string, unknown> = {};

  if (query.propertyType) {
    conditions.push('prop.property_type = :propertyType');
    params.propertyType = query.propertyType;
  }
  if (query.propertyStatus) {
    conditions.push('prop.status = :propertyStatus');
    params.propertyStatus = query.propertyStatus;
  }
  if (query.connectionType) {
    conditions.push('prop.connection_type = :connectionType');
    params.connectionType = query.connectionType;
  }
  if (query.leadTemperature) {
    conditions.push('prop.lead_temperature = :leadTemperature');
    params.leadTemperature = query.leadTemperature;
  }
  if (query.propertyCity) {
    conditions.push('LOWER(prop.city) LIKE LOWER(:propertyCity)');
    params.propertyCity = `%${query.propertyCity}%`;
  }
  if (query.propertyState) {
    conditions.push('LOWER(prop.state) LIKE LOWER(:propertyState)');
    params.propertyState = `%${query.propertyState}%`;
  }
  if (query.propertyConsumerNumber) {
    conditions.push('LOWER(prop.consumer_number) LIKE LOWER(:propertyConsumerNumber)');
    params.propertyConsumerNumber = `%${query.propertyConsumerNumber}%`;
  }
  if (query.quoteStatus !== undefined) {
    conditions.push('latest_quote.status = :quoteStatus');
    params.quoteStatus = query.quoteStatus;
  }
  // Same wattage-preferred size as getSitePortfolioSummaries — filtering on
  // the raw `system_size_kw` column would silently disagree with the value
  // the "Site portfolio" column and "System Size" range filter both display.
  if (query.propertySystemSizeMin !== undefined) {
    conditions.push(
      `(CASE WHEN cv.total_wattage_wp > 0 THEN cv.total_wattage_wp / 1000.0 ELSE cv.system_size_kw END) >= :propertySystemSizeMin`,
    );
    params.propertySystemSizeMin = query.propertySystemSizeMin;
  }
  if (query.propertySystemSizeMax !== undefined) {
    conditions.push(
      `(CASE WHEN cv.total_wattage_wp > 0 THEN cv.total_wattage_wp / 1000.0 ELSE cv.system_size_kw END) <= :propertySystemSizeMax`,
    );
    params.propertySystemSizeMax = query.propertySystemSizeMax;
  }

  const whereClause = conditions.join(' AND ');

  if (needsQuoteJoinForPropertyFilter(query)) {
    qb.andWhere(
      `EXISTS (
        SELECT 1 FROM customer_properties prop
        LEFT JOIN quotes latest_quote ON latest_quote.id = (
          SELECT q2.id FROM quotes q2
          WHERE q2.property_id = prop.id
            AND q2.deleted_at IS NULL
          ORDER BY q2.created_at DESC, q2.id DESC
          LIMIT 1
        )
        LEFT JOIN quote_versions cv ON cv.id = (
          SELECT qv.id FROM quote_versions qv
          WHERE qv.quote_id = latest_quote.id
          ORDER BY qv.created_at DESC, qv.version_number DESC, qv.id DESC
          LIMIT 1
        )
        WHERE ${whereClause}
      )`,
      params,
    );
  } else {
    qb.andWhere(
      `EXISTS (
        SELECT 1 FROM customer_properties prop
        WHERE ${whereClause}
      )`,
      params,
    );
  }
}

@Injectable()
export class CustomerProfileRepository {
  constructor(
    @InjectRepository(CustomerProfileEntity)
    public readonly repository: Repository<CustomerProfileEntity>,
  ) {}

  async findById(id: string): Promise<CustomerProfileEntity | null> {
    return this.repository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['user', 'creator', 'assignee'],
    });
  }

  async findByUserAndOrganization(userId: string): Promise<CustomerProfileEntity | null> {
    return this.repository.findOne({
      where: { userId, deletedAt: IsNull() },
      relations: ['user'],
    });
  }

  async findByUserId(userId: string): Promise<CustomerProfileEntity[]> {
    return this.repository.find({
      where: { userId, deletedAt: IsNull() },
      relations: [],
    });
  }

  async findByOrganization(page = 1, limit = 20): Promise<[CustomerProfileEntity[], number]> {
    return this.repository.findAndCount({
      where: { deletedAt: IsNull() },
      relations: ['user', 'properties'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
  }

  async create(profile: Partial<CustomerProfileEntity>): Promise<CustomerProfileEntity> {
    const newProfile = this.repository.create(profile);
    return this.repository.save(newProfile);
  }

  async update(
    id: string,
    updates: Partial<CustomerProfileEntity>,
  ): Promise<CustomerProfileEntity | null> {
    // Use type assertion to avoid TypeScript recursion issues with circular entity references
    await this.repository.update({ id }, updates as Record<string, unknown>);
    return this.findById(id);
  }

  async softDelete(id: string, deletedBy?: string): Promise<boolean> {
    const result = await this.repository.update(
      { id },
      {
        deletedAt: new Date(),
        updatedBy: deletedBy,
      },
    );
    return (result.affected ?? 0) > 0;
  }

  async hardDelete(id: string, manager?: EntityManager): Promise<boolean> {
    const repo = manager ? manager.getRepository(CustomerProfileEntity) : this.repository;
    const result = await repo.delete({ id });
    return (result.affected ?? 0) > 0;
  }

  /**
   * Find customers created by or assigned to a specific user.
   * Used for field workers to see their own and assigned customers.
   */
  async findByCreatedBy(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<[CustomerProfileEntity[], number]> {
    return this.repository
      .createQueryBuilder('customer')
      .leftJoinAndSelect('customer.user', 'user')
      .leftJoinAndSelect('customer.properties', 'properties', 'properties.deleted_at IS NULL')
      .leftJoinAndSelect('customer.assignee', 'assignee')
      .andWhere('customer.deletedAt IS NULL')
      .andWhere('(customer.createdBy = :userId OR customer.assigneeId = :userId)', { userId })
      .orderBy('customer.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }

  async findByPhone(phone: string): Promise<CustomerProfileEntity[]> {
    return this.repository.find({
      where: { phone, deletedAt: IsNull() },
    });
  }

  async findOneByPhone(phone: string): Promise<CustomerProfileEntity | null> {
    return this.repository.findOne({
      where: { phone, deletedAt: IsNull() },
    });
  }

  async findByEmail(email: string): Promise<CustomerProfileEntity | null> {
    return this.repository
      .createQueryBuilder('cp')
      .andWhere('LOWER(cp.email) = LOWER(:email)', { email })
      .andWhere('cp.deleted_at IS NULL')
      .getOne();
  }

  /**
   * Find customer by consumer number (searches through properties)
   * @deprecated Consumer number is now on CustomerPropertyEntity
   * Consider using CustomerPropertyRepository.findByConsumerNumber instead
   */
  async findByConsumerNumber(consumerNumber: string): Promise<CustomerProfileEntity | null> {
    return this.repository
      .createQueryBuilder('customer')
      .innerJoin('customer.properties', 'property')
      .andWhere('property.consumerNumber = :consumerNumber', { consumerNumber })
      .andWhere('customer.deletedAt IS NULL')
      .andWhere('property.deletedAt IS NULL')
      .getOne();
  }

  async countByStatus(status: CustomerStatus): Promise<number> {
    return this.repository.count({
      where: { status, deletedAt: IsNull() },
    });
  }

  /**
   * Get status statistics in a single query
   * Returns count of customers grouped by status
   */
  async getStatusStats(): Promise<{ status: CustomerStatus; count: number }[]> {
    const result = await this.repository
      .createQueryBuilder('customer')
      .select('customer.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .andWhere('customer.deletedAt IS NULL')
      .groupBy('customer.status')
      .getRawMany<{ status: CustomerStatus; count: string }>();

    return result.map((r) => ({
      status: r.status,
      count: parseInt(r.count, 10),
    }));
  }

  /**
   * Roll up each customer's site portfolio in ONE query for a whole page of
   * customers.
   *
   * Grouping by `(customer_id, status)` rather than `customer_id` alone is what
   * lets a single pass produce both the per-status counts (the distribution
   * bar) and the capacity/value totals — the alternative was two queries or a
   * `jsonb_object_agg` that no longer explains itself. Folding the handful of
   * status rows per customer happens in JS, which is free at page size.
   *
   * Sites with no quote contribute 0 to both sums (`SUM` skips NULL), so a
   * customer with sites but no quotes reports real counts and a zero value
   * rather than dropping out.
   *
   * System size prefers `total_wattage_wp / 1000` over `system_size_kw`: the
   * former is derived from the modules actually selected during quote
   * calculation (the real installed capacity); the latter is a user-entered
   * field on the quote and can go stale relative to it. This mirrors the
   * precedence `CustomerPropertyService.findByCustomer` already applies —
   * this query must not silently disagree with the nested sites panel, which
   * reads that service.
   */
  async getSitePortfolioSummaries(
    customerIds: string[],
  ): Promise<Map<string, SitePortfolioSummary>> {
    const summaries = new Map<string, SitePortfolioSummary>();
    if (customerIds.length === 0) {
      return summaries;
    }

    const rows = await this.repository.manager.query<
      {
        customerId: string;
        status: string;
        count: string;
        quotedCount: string;
        systemSizeKw: string;
        quotedAmount: string;
      }[]
    >(
      `
      SELECT prop.customer_id                            AS "customerId",
             prop.status                                 AS "status",
             COUNT(*)                                    AS "count",
             COUNT(latest_quote.id)                      AS "quotedCount",
             COALESCE(SUM(
               CASE WHEN cv.total_wattage_wp > 0
                    THEN cv.total_wattage_wp / 1000.0
                    ELSE cv.system_size_kw
               END
             ), 0)                                       AS "systemSizeKw",
             COALESCE(SUM(cv.final_price), 0)            AS "quotedAmount"
      FROM customer_properties prop
      ${latestQuoteJoins()} WHERE prop.customer_id = ANY($1::uuid[])
        AND prop.deleted_at IS NULL
      GROUP BY prop.customer_id, prop.status
      `,
      [customerIds],
    );

    for (const row of rows) {
      const existing = summaries.get(row.customerId) ?? {
        siteCount: 0,
        statusCounts: {},
        convertedCount: 0,
        quotedSiteCount: 0,
        totalSystemSizeKw: 0,
        totalQuotedAmount: 0,
      };

      const count = Number(row.count);
      existing.siteCount += count;
      existing.statusCounts[row.status] = (existing.statusCounts[row.status] ?? 0) + count;
      if (row.status === CONVERTED_STATUS) existing.convertedCount += count;
      existing.quotedSiteCount += Number(row.quotedCount);
      existing.totalSystemSizeKw += Number(row.systemSizeKw);
      existing.totalQuotedAmount += Number(row.quotedAmount);

      summaries.set(row.customerId, existing);
    }

    return summaries;
  }

  /**
   * Company-wide CRM roll-up for the customer list's KPI cards.
   *
   * Two queries rather than one: the customer counts have no property join, and
   * forcing them through the property aggregate would either miss customers
   * with no sites or need a `COUNT(DISTINCT …)` that fights the same join.
   *
   * "Pipeline" deliberately counts only sites that are still in play — a quote
   * is out, unanswered, and the site has not converted. Accepted and converted
   * value belongs to revenue, not pipeline; draft value was never offered.
   */
  async getOverviewStats(): Promise<CustomerOverviewStats> {
    const monthStart = startOfCurrentMonth();
    const ageingCutoff = ageingCutoffDate();

    const [customerRow] = await this.repository.manager.query<
      { customers: string; customersThisMonth: string }[]
    >(
      `
      SELECT COUNT(*)                                                  AS "customers",
             COUNT(*) FILTER (WHERE c.created_at >= $1)                AS "customersThisMonth"
      FROM customer_profiles c WHERE c.deleted_at IS NULL
      `,
      [monthStart],
    );

    const [siteRow] = await this.repository.manager.query<
      {
        sites: string;
        sitesThisMonth: string;
        pipelineValue: string;
        awaitingReply: string;
        awaitingAgeing: string;
      }[]
    >(
      `
      SELECT COUNT(*)                                     AS "sites",
             COUNT(*) FILTER (WHERE prop.created_at >= $1) AS "sitesThisMonth",
             COALESCE(SUM(cv.final_price) FILTER (
               WHERE prop.status <> $2
                 AND latest_quote.status = ANY($3::varchar[])
             ), 0)                                        AS "pipelineValue",
             COUNT(*) FILTER (
               WHERE latest_quote.status = ANY($3::varchar[])
             )                                            AS "awaitingReply",
             COUNT(*) FILTER (
               WHERE latest_quote.status = ANY($3::varchar[])
                 AND latest_quote.quote_date < $4::date
             )                                            AS "awaitingAgeing"
      FROM customer_properties prop
      ${latestQuoteJoins()} WHERE prop.deleted_at IS NULL
      `,
      [monthStart, PropertyStatus.CONVERTED, [...AWAITING_QUOTE_STATUSES], ageingCutoff],
    );

    return {
      customers: Number(customerRow?.customers ?? 0),
      customersThisMonth: Number(customerRow?.customersThisMonth ?? 0),
      sites: Number(siteRow?.sites ?? 0),
      sitesThisMonth: Number(siteRow?.sitesThisMonth ?? 0),
      pipelineValue: Number(siteRow?.pipelineValue ?? 0),
      awaitingReply: Number(siteRow?.awaitingReply ?? 0),
      awaitingAgeing: Number(siteRow?.awaitingAgeing ?? 0),
    };
  }

  /**
   * Search customers by name, phone, or email
   * Searches within the organization context
   *
   * @param searchQuery - Search term (searches first name, last name, phone, email, group)
   * @param createdBy - Optional: filter by creator (for field workers)
   * @param page - Page number
   * @param limit - Items per page
   * @returns Matching customers with pagination
   */
  async search(
    searchQuery: string,
    createdBy?: string,
    page = 1,
    limit = 20,
  ): Promise<[CustomerProfileEntity[], number]> {
    // Search across multiple fields (case-insensitive)
    const searchTerm = `%${searchQuery.toLowerCase()}%`;

    const qb = this.repository
      .createQueryBuilder('customer')
      .leftJoinAndSelect('customer.user', 'user')
      .leftJoinAndSelect('customer.properties', 'properties', 'properties.deleted_at IS NULL')
      .leftJoinAndSelect('customer.assignee', 'assignee')
      .andWhere('customer.deletedAt IS NULL')
      .andWhere(
        `(
          LOWER(customer.first_name) LIKE :searchTerm OR
          LOWER(customer.last_name) LIKE :searchTerm OR
          LOWER(CONCAT(customer.first_name, ' ', customer.last_name)) LIKE :searchTerm OR
          customer.phone LIKE :searchTerm OR
          LOWER(customer.email) LIKE :searchTerm OR
          LOWER(customer.city) LIKE :searchTerm OR
          LOWER(COALESCE(customer.group_code, '')) LIKE :searchTerm OR
          LOWER(COALESCE(customer.group_name, '')) LIKE :searchTerm
        )`,
        { searchTerm },
      );

    // Filter by creator OR assignee (for field workers — covers both own-created and assigned)
    if (createdBy) {
      qb.andWhere('(customer.createdBy = :createdBy OR customer.assigneeId = :createdBy)', {
        createdBy,
      });
    }

    qb.orderBy('customer.createdAt', 'DESC');

    // Split getCount + getMany to avoid TypeORM getManyAndCount crash
    // when leftJoinAndSelect is combined with orderBy on a joined alias.
    const total = await qb.getCount();
    const data = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return [data, total];
  }

  /**
   * Find customers with comprehensive filtering, sorting, and pagination
   * This is the primary method for the customer list API
   *
   * @param query - Query parameters (filters, sorting, pagination)
   * @returns Tuple of [customers, total count]
   */
  async findWithFilters(query: CustomerQueryDto): Promise<[CustomerProfileEntity[], number]> {
    const qb = this.repository
      .createQueryBuilder('customer')
      .leftJoinAndSelect('customer.user', 'user')
      .loadRelationCountAndMap(
        'customer.propertyCount',
        'customer.properties',
        'propertyCountRel',
        (qb) => qb.where('propertyCountRel.deletedAt IS NULL'),
      )
      .leftJoinAndSelect('customer.creator', 'creator')
      .leftJoinAndSelect('customer.assignee', 'assignee')
      .andWhere('customer.deletedAt IS NULL');

    // ===== Search (case-insensitive, multiple fields) =====
    if (query.search && query.search.length >= 2) {
      const searchTerm = `%${query.search.toLowerCase()}%`;
      qb.andWhere(
        `(
          LOWER(customer.first_name) LIKE :searchTerm OR
          LOWER(customer.last_name) LIKE :searchTerm OR
          LOWER(CONCAT(customer.first_name, ' ', customer.last_name)) LIKE :searchTerm OR
          customer.phone LIKE :searchTerm OR
          LOWER(customer.email) LIKE :searchTerm OR
          LOWER(customer.city) LIKE :searchTerm OR
          LOWER(COALESCE(customer.group_code, '')) LIKE :searchTerm OR
          LOWER(COALESCE(customer.group_name, '')) LIKE :searchTerm
        )`,
        { searchTerm },
      );
    }

    // ===== Filters =====
    if (query.status) {
      qb.andWhere('customer.status = :status', { status: query.status });
    }

    if (query.city) {
      qb.andWhere('LOWER(customer.city) LIKE LOWER(:city)', { city: `%${query.city}%` });
    }

    if (query.leadSource) {
      if (String(query.leadSource) === String(LeadSource.OTHER)) {
        // "Other" means any lead_source that is not one of the standard enum values
        const knownValues = KNOWN_LEAD_SOURCE_VALUES.filter(
          (v) => String(v) !== String(LeadSource.OTHER),
        );
        qb.andWhere(
          `customer.lead_source IS NOT NULL AND LOWER(customer.lead_source) NOT IN (:...knownValues)`,
          { knownValues },
        );
      } else {
        qb.andWhere('customer.leadSource = :leadSource', { leadSource: query.leadSource });
      }
    }

    if (query.groupSearch) {
      const groupSearchTerm = `%${query.groupSearch.toLowerCase()}%`;
      qb.andWhere(
        `(LOWER(COALESCE(customer.group_code, '')) LIKE :groupSearchTerm OR LOWER(COALESCE(customer.group_name, '')) LIKE :groupSearchTerm)`,
        { groupSearchTerm },
      );
    }

    if (query.createdBy) {
      if (query.createdBy === 'self') {
        qb.andWhere('customer.createdBy = customer.userId');
      } else {
        qb.andWhere('customer.createdBy = :createdBy', {
          createdBy: query.createdBy,
        });
      }
    }

    if (query.assigneeId) {
      qb.andWhere('customer.assigneeId = :assigneeId', {
        assigneeId: query.assigneeId,
      });
    }

    if (hasContradictoryCustomerPropertyFilters(query)) {
      // Contradictory: "no properties" cannot match any property-level filter.
      qb.andWhere('1 = 0');
    } else {
      if (query.hasProperty !== undefined && !hasAnyCustomerPropertyFilter(query)) {
        const subQuery = qb
          .subQuery()
          .select('prop.id')
          .from('customer_properties', 'prop')
          .where('prop.customerId = customer.id')
          .andWhere('prop.deletedAt IS NULL');

        if (query.hasProperty) {
          qb.andWhere(`EXISTS (${subQuery.getQuery()})`);
        } else {
          qb.andWhere(`NOT EXISTS (${subQuery.getQuery()})`);
        }
      }

      applyMatchingPropertyFilter(qb, query);
    }

    if (query.fromDate) {
      qb.andWhere('customer.createdAt >= :fromDate', { fromDate: query.fromDate });
    }

    if (query.toDate) {
      // If toDate already includes a time component, trust it as an exact boundary.
      // For date-only values, append end-of-day UTC to preserve previous behavior.
      const normalizedToDate = query.toDate.includes('T')
        ? query.toDate
        : `${query.toDate}T23:59:59.999Z`;
      qb.andWhere('customer.createdAt <= :toDate', {
        toDate: normalizedToDate,
      });
    }

    // ===== Sorting (using safe field mapping) =====
    const sortColumn = SORT_FIELD_MAP[query.sortBy];
    const sortDirection = query.sortOrder === SortOrder.ASC ? 'ASC' : 'DESC';
    qb.orderBy(sortColumn, sortDirection);

    // Split getCount + getMany to avoid TypeORM getManyAndCount crash
    // when leftJoinAndSelect is combined with orderBy on a joined alias.
    const total = await qb.getCount();
    const data = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getMany();

    return [data, total];
  }

  /**
   * Returns all distinct (group_code, group_name) pairs for an organization.
   * Used to populate the group selector in the customer form.
   */
  async findDistinctGroups(): Promise<{ groupCode: string; groupName: string }[]> {
    const rows = await this.repository
      .createQueryBuilder('customer')
      .select('customer.groupCode', 'groupCode')
      .addSelect('customer.groupName', 'groupName')
      .andWhere('customer.groupCode IS NOT NULL')
      .andWhere('customer.deletedAt IS NULL')
      .distinctOn(['customer.groupCode'])
      .orderBy('customer.groupCode', 'ASC')
      .getRawMany<{ groupCode: string; groupName: string }>();

    return rows;
  }

  /**
   * Generates the next available group code for an organization.
   * Format: GRP-XXXX (e.g. GRP-0001, GRP-0042).
   * Uses withDeleted() so codes from soft-deleted records are never reused.
   */
  async generateGroupCode(): Promise<string> {
    const pattern = 'GRP-%';

    const result = await this.repository
      .createQueryBuilder('customer')
      .withDeleted()
      .select('customer.groupCode', 'code')
      .andWhere('customer.groupCode LIKE :pattern', { pattern })
      .orderBy('customer.groupCode', 'DESC')
      .limit(1)
      .getRawOne<{ code: string }>();

    let nextSeq = 1;
    if (result?.code) {
      const parts = result.code.split('-');
      const lastPart = parts[parts.length - 1];
      if (lastPart) {
        const parsed = parseInt(lastPart, 10);
        nextSeq = Number.isNaN(parsed) ? 1 : parsed + 1;
      }
    }

    return `GRP-${String(nextSeq).padStart(4, '0')}`;
  }

  /**
   * Checks whether a group code exists for the given organization.
   * Used for validation when a client provides a groupCode explicitly.
   */
  async groupCodeExists(groupCode: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { groupCode, deletedAt: IsNull() },
    });
    return count > 0;
  }

  /**
   * Returns human-readable reasons why a customer cannot be permanently deleted.
   */
  async getCustomerDeleteBlockers(customerId: string, manager?: EntityManager): Promise<string[]> {
    const flags = await this.queryDeleteBlockerFlags([customerId], manager);
    return this.mapDeleteBlockerFlags(flags.get(customerId));
  }

  async getCustomerDeleteBlockersBatch(customerIds: string[]): Promise<Map<string, string[]>> {
    const flags = await this.queryDeleteBlockerFlags(customerIds);
    const result = new Map<string, string[]>();
    for (const customerId of customerIds) {
      result.set(customerId, this.mapDeleteBlockerFlags(flags.get(customerId)));
    }
    return result;
  }

  private mapDeleteBlockerFlags(row?: {
    hasProperties: boolean;
    hasProjects: boolean;
    hasQuotes: boolean;
    hasPayments: boolean;
    hasLoans: boolean;
    hasSubsidies: boolean;
    hasFeedback: boolean;
  }): string[] {
    const reasons: string[] = [];

    if (row?.hasProperties) {
      reasons.push('Remove all properties before deleting this customer.');
    }
    if (row?.hasProjects) {
      reasons.push('Cannot delete: customer has projects linked to properties');
    }
    if (row?.hasQuotes) {
      reasons.push('Cannot delete: customer has quotations');
    }
    if (row?.hasPayments) {
      reasons.push('Cannot delete: customer has payment records');
    }
    if (row?.hasLoans) {
      reasons.push('Cannot delete: customer has loan applications');
    }
    if (row?.hasSubsidies) {
      reasons.push('Cannot delete: customer has subsidy applications');
    }
    if (row?.hasFeedback) {
      reasons.push('Cannot delete: customer has feedback records');
    }

    return reasons;
  }

  private async queryDeleteBlockerFlags(
    customerIds: string[],
    manager?: EntityManager,
  ): Promise<
    Map<
      string,
      {
        hasProperties: boolean;
        hasProjects: boolean;
        hasQuotes: boolean;
        hasPayments: boolean;
        hasLoans: boolean;
        hasSubsidies: boolean;
        hasFeedback: boolean;
      }
    >
  > {
    const result = new Map<
      string,
      {
        hasProperties: boolean;
        hasProjects: boolean;
        hasQuotes: boolean;
        hasPayments: boolean;
        hasLoans: boolean;
        hasSubsidies: boolean;
        hasFeedback: boolean;
      }
    >();

    if (customerIds.length === 0) {
      return result;
    }

    const repo = manager ? manager.getRepository(CustomerProfileEntity) : this.repository;

    const rows = await repo
      .createQueryBuilder('customer')
      .select('customer.id', 'customerId')
      .addSelect(
        `EXISTS(
          SELECT 1 FROM customer_properties cp
          WHERE cp.customer_id = customer.id
            AND cp.deleted_at IS NULL
        )`,
        'hasProperties',
      )
      .addSelect(
        `EXISTS(
          SELECT 1 FROM projects p
          INNER JOIN customer_properties cp ON cp.id = p.property_id
          WHERE cp.customer_id = customer.id
            AND p.deleted_at IS NULL
        )`,
        'hasProjects',
      )
      .addSelect(
        `EXISTS(
          SELECT 1 FROM quotes q
          WHERE q.customer_id = customer.id
            AND q.deleted_at IS NULL
        )`,
        'hasQuotes',
      )
      .addSelect(
        // Ledger entries are append-only, so there is no deleted_at to filter;
        // a reversed receipt still counts as "this customer has paid us before".
        `EXISTS(
          SELECT 1 FROM ledger_entries le
          WHERE le.customer_id = customer.id
            AND le.direction = 'in'
        )`,
        'hasPayments',
      )
      .addSelect(
        `EXISTS(
          SELECT 1 FROM loan_applications la
          WHERE la.customer_id = customer.id
            AND la.deleted_at IS NULL
        )`,
        'hasLoans',
      )
      .addSelect(
        `EXISTS(
          SELECT 1 FROM subsidy_applications sa
          WHERE sa.customer_id = customer.id
            AND sa.deleted_at IS NULL
        )`,
        'hasSubsidies',
      )
      .addSelect(
        `EXISTS(
          SELECT 1 FROM customer_feedback cf
          WHERE cf.customer_id = customer.id
            AND cf.deleted_at IS NULL
        )`,
        'hasFeedback',
      )
      .where('customer.id IN (:...customerIds)', { customerIds })
      .getRawMany<{
        customerId: string;
        hasProperties: boolean;
        hasProjects: boolean;
        hasQuotes: boolean;
        hasPayments: boolean;
        hasLoans: boolean;
        hasSubsidies: boolean;
        hasFeedback: boolean;
      }>();

    for (const row of rows) {
      result.set(row.customerId, {
        hasProperties: row.hasProperties,
        hasProjects: row.hasProjects,
        hasQuotes: row.hasQuotes,
        hasPayments: row.hasPayments,
        hasLoans: row.hasLoans,
        hasSubsidies: row.hasSubsidies,
        hasFeedback: row.hasFeedback,
      });
    }

    return result;
  }
}
