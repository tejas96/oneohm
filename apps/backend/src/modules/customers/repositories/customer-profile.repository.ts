import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ACTIVE_TICKET_STATUSES,
  CustomerSortField,
  CustomerStatus,
  LeadSource,
  LossReason,
  PropertyStatus,
  QuoteStatus,
  ServiceTicketKind,
  SortOrder,
} from '@tejas96/shared/types';
import {
  hasAnyCustomerPropertyFilter,
  hasContradictoryCustomerPropertyFilters,
} from '@tejas96/shared/utils';
import { IsNull, Repository, type EntityManager, type SelectQueryBuilder } from 'typeorm';

import { CUSTOMER_NEEDS_FOLLOWUP } from './followup-predicates';
import { systemSizeKwSqlRaw } from '../../../common/utils/transform.util';
import { dealQuoteOrderSql } from '../../quotes/sql/deal-facts.sql';
import { CustomerQueryDto } from '../dto/customer-query.dto';
import { CustomerProfileEntity } from '../entities/customer-profile.entity';
import {
  NEXT_FOLLOWUP_COLUMNS,
  nextPendingFollowupSql,
  toNextFollowup,
  type NextFollowupColumns,
  type NextFollowupRow,
} from '../sql/next-followup.sql';
import { SITE_JOURNEY_COLUMNS, siteJourneyCte, type SiteJourneyRow } from '../sql/site-journey.sql';

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
  totalPortfolioAmount: number;
}

/** What a customer's row says about follow-ups, for one page of the list. */
export interface CustomerFollowupState {
  /** The shared "needs follow-up" predicate — the same one the list filter uses. */
  needsFollowup: boolean;
  /** Pending follow-ups on the customer and on its sites that are not deleted. */
  pendingFollowupCount: number;
  /** The earliest of those, or null when nothing is pending. */
  nextFollowup: NextFollowupRow | null;
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
  /** Customers with at least one open site nobody owes an action. */
  needsFollowup: number;
}

/** A quote sitting unanswered longer than this is flagged as ageing. */
const AWAITING_AGEING_DAYS = 7;

/**
 * Correlated-subquery joins resolving each property's latest quote (`latest_quote`)
 * and that quote's current version (`cv`), for a query whose driving table is
 * aliased `prop`.
 *
 * Used by the overview stats, which read the same "latest quote" as the
 * property list (`CustomerPropertyRepository.findWithFilters`).
 *
 * The site-portfolio roll-up does NOT use this any more — it reads each site's
 * DEAL quote (`dealQuoteJoins` below), the quote the journey and the site panel
 * show. "Latest" is simply the newest quote, voided or not, so a roof with an
 * accepted quote and a newer draft (or a newer voided one) reported a value on
 * the customer's row that its own sites did not add up to.
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

/**
 * The same two joins — same aliases, `latest_quote` and `cv` — but resolving
 * each property's DEAL quote: a live accepted quote, else the newest live one,
 * else the newest voided one (`dealQuoteOrderSql`, the ordering the quote list
 * and the site journey rank with). For the site-portfolio roll-up only.
 */
function dealQuoteJoins(): string {
  return `
    LEFT JOIN quotes latest_quote ON latest_quote.id = (
      SELECT q2.id FROM quotes q2
      WHERE q2.property_id = prop.id
        AND q2.deleted_at IS NULL
      ORDER BY ${dealQuoteOrderSql('q2')}
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
  if (query.propertySystemSizeMin !== undefined) {
    conditions.push(`${systemSizeKwSqlRaw('cv')} >= :propertySystemSizeMin`);
    params.propertySystemSizeMin = query.propertySystemSizeMin;
  }
  if (query.propertySystemSizeMax !== undefined) {
    conditions.push(`${systemSizeKwSqlRaw('cv')} <= :propertySystemSizeMax`);
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

/**
 * The search box also finds a customer by one of their sites: its consumer
 * number or its site code. Uses the caller's :searchTerm (lower-case, %-wrapped)
 * and :consumerNumberTerm (siteSearchParams).
 */
const SITE_MATCHES_SEARCH = `EXISTS (
            SELECT 1 FROM customer_properties site
            WHERE site.customer_id = customer.id
              AND site.deleted_at IS NULL
              AND (
                COALESCE(site.consumer_number, '') LIKE :consumerNumberTerm OR
                LOWER(COALESCE(site.property_code, '')) LIKE :searchTerm
              )
          )`;

/** Consumer numbers are stored as digits: "2799 9000 0951" or "2799-9000-0951" still match. */
function siteSearchParams(search: string): { consumerNumberTerm: string } {
  return { consumerNumberTerm: `%${search.replace(/[\s-]/g, '').toLowerCase()}%` };
}

/**
 * Stored names can carry stray white space ("Hanmant " + "Kharade", a tab after
 * a surname), so a typed full name misses the plain first + ' ' + last match.
 * This compares both sides with the white space squeezed to single spaces.
 * Uses :nameTerm (nameSearchParams). It only adds matches.
 */
const NAME_MATCHES_SEARCH = `LOWER(btrim(regexp_replace(
            concat_ws(' ', customer.first_name, customer.last_name), '\\s+', ' ', 'g'
          ))) LIKE :nameTerm`;

function nameSearchParams(search: string): { nameTerm: string } {
  return { nameTerm: `%${search.trim().replace(/\s+/g, ' ').toLowerCase()}%` };
}

/**
 * Name A-Z / Z-A ignores white space typed before the first name, and ignores
 * case: a database with a byte-order collation would list "ASHOK" before "Aadesh".
 */
const NAME_SORT_ALIAS = 'customer_name_sort';
const NAME_SORT_SQL = `LOWER(regexp_replace(customer.first_name, '^\\s+', ''))`;

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
    manager?: EntityManager,
  ): Promise<CustomerProfileEntity | null> {
    const repo = manager ? manager.getRepository(CustomerProfileEntity) : this.repository;
    // Use type assertion to avoid TypeScript recursion issues with circular entity references
    await repo.update({ id }, updates as Record<string, unknown>);
    // Read back on the same manager, so a caller's transaction sees its own write.
    return repo.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['user', 'creator', 'assignee'],
    });
  }

  /**
   * Close an enquiry that never got a property. The property-level equivalent
   * lives on CustomerPropertyRepository; a customer with sites is never marked
   * lost this way, because losing one site does not kill the account.
   */
  async markLost(
    id: string,
    reason: string,
    lossReason: LossReason,
    updatedBy: string,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = manager ? manager.getRepository(CustomerProfileEntity) : this.repository;
    await repo.update({ id }, {
      status: CustomerStatus.LOST,
      lostReason: reason,
      lossReason,
      lostAt: new Date(),
      updatedBy,
    } as Record<string, unknown>);
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
   * Each site is read at its DEAL quote (`dealQuoteJoins`): a live accepted
   * quote, else the newest live one, else the newest voided one — the quote
   * the journey stage is read from and the one the site panel prints. So the
   * row's ₹ and kW are the sum of what its site blocks show (a converted site
   * still counts at its contract, below), and never the value of a later draft
   * or of a voided quote while a live one exists.
   *
   * System size prefers `total_wattage_wp / 1000` over `system_size_kw`: the
   * former is derived from the modules actually selected during quote
   * calculation (the real installed capacity); the latter is a user-entered
   * field on the quote and can go stale relative to it. This mirrors the
   * precedence `CustomerPropertyService.findByCustomer` already applies —
   * this query must not silently disagree with the nested sites panel, which
   * reads that service.
   *
   * The `pj` join carries `AND pj.status <> 'cancelled'`, matching
   * `ProjectRepository.findLiveByPropertyId`. A roof can now hold several
   * cancelled projects plus at most one live one (the DB's own
   * `UQ_projects_property_id` index only enforces uniqueness among the
   * non-cancelled rows — see migration 1857015000000-OneLiveProjectPerRoof),
   * so an unfiltered join fans one property row out into one row per project.
   * `COUNT(*)`, `quotedCount` and `systemSizeKw` read `prop`/`cv` values that
   * do not vary with `pj` at all, so that fan-out does not just double-count
   * `bal.contract_paise` — it inflates every aggregate in this query by the
   * number of extra project rows. Filtering to the live project caps the join
   * at exactly the one row the index guarantees; a property whose only
   * project is cancelled (never re-sold) falls back to `cv.final_price`, the
   * same value a not-yet-converted site reports.
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
        portfolioAmount: string;
      }[]
    >(
      `
      SELECT prop.customer_id                            AS "customerId",
             prop.status                                 AS "status",
             COUNT(*)                                    AS "count",
             COUNT(latest_quote.id)                      AS "quotedCount",
             COALESCE(SUM(
               CASE WHEN cv.total_wattage_wp > 0
                    THEN ROUND(cv.total_wattage_wp / 1000.0, 2)
                    ELSE 0
               END
             ), 0)                                       AS "systemSizeKw",
             /*
              * A converted site counts at its CONTRACT, everything else at its
              * quote. Summing cv.final_price alone reported a customer's
              * portfolio at the price their sites were quoted, which stops
              * moving the moment they sign — so billing them for material added
              * on site raised the project, the site list and the customer's own
              * Outstanding tile while this total stayed behind, with nothing on
              * screen reconciling them.
              *
              * v_project_balance is the same view the projects list and the
              * site rows read, so all four now answer with one number.
              */
             COALESCE(SUM(COALESCE(bal.contract_paise / 100.0, cv.final_price)), 0)
                                                         AS "portfolioAmount"
      FROM customer_properties prop
      LEFT JOIN projects pj ON pj.property_id = prop.id AND pj.deleted_at IS NULL
        AND pj.status <> 'cancelled'
      LEFT JOIN v_project_balance bal ON bal.project_id = pj.id
      ${dealQuoteJoins()} WHERE prop.customer_id = ANY($1::uuid[])
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
        totalPortfolioAmount: 0,
      };

      const count = Number(row.count);
      existing.siteCount += count;
      existing.statusCounts[row.status] = (existing.statusCounts[row.status] ?? 0) + count;
      if (row.status === CONVERTED_STATUS) existing.convertedCount += count;
      existing.quotedSiteCount += Number(row.quotedCount);
      existing.totalSystemSizeKw += Number(row.systemSizeKw);
      existing.totalPortfolioAmount += Number(row.portfolioAmount);

      summaries.set(row.customerId, existing);
    }

    return summaries;
  }

  /**
   * Names of assignees whose user account has been archived (soft-deleted).
   *
   * The list query joins `customer.assignee` the ORM's way, which leaves out a
   * soft-deleted user — so a customer still assigned to someone who has left
   * came back with an `assigneeId` and no assignee, and read "Not assigned".
   * It is assigned; the person is archived. Looked up separately, and only for
   * the ids the join came back empty for, so the list query itself is untouched.
   */
  async getArchivedUserNames(userIds: string[]): Promise<Map<string, string>> {
    const names = new Map<string, string>();
    if (userIds.length === 0) return names;

    const rows = await this.repository.manager.query<{ id: string; name: string | null }[]>(
      `SELECT u.id,
              NULLIF(btrim(concat_ws(' ', u.first_name, u.last_name)), '') AS name
         FROM users u
        WHERE u.id = ANY($1::uuid[])
          AND u.deleted_at IS NOT NULL`,
      [userIds],
    );
    for (const row of rows) {
      if (row.name) names.set(row.id, row.name);
    }
    return names;
  }

  /**
   * Every site of a page of customers, placed on its journey by the one SQL
   * rule (`siteJourneyCte`) — the same rows the customer's own site list
   * publishes, so the roll-up on a list row cannot disagree with the sites
   * behind it. Grouped by customer; a customer with no site has no entry.
   */
  async getSiteJourneysByCustomerIds(
    customerIds: string[],
  ): Promise<Map<string, SiteJourneyRow[]>> {
    const byCustomer = new Map<string, SiteJourneyRow[]>();
    if (customerIds.length === 0) {
      return byCustomer;
    }

    const rows = await this.repository.manager.query<SiteJourneyRow[]>(
      `WITH ${siteJourneyCte({ customerIdsParam: '$1' })}
       SELECT ${SITE_JOURNEY_COLUMNS} FROM site_journey sj`,
      [customerIds],
    );

    for (const row of rows) {
      const bucket = byCustomer.get(row.customerId);
      if (bucket) bucket.push(row);
      else byCustomer.set(row.customerId, [row]);
    }
    return byCustomer;
  }

  /**
   * Follow-up state for a page of customers, in one query.
   *
   * `needsFollowup` is the SHARED predicate, evaluated per row — the list's
   * "Needs follow-up" filter embeds the same text, so a row and the filter that
   * returned it cannot disagree.
   *
   * The next follow-up is looked for on the customer itself and on its sites
   * that are not deleted; a follow-up left behind on a deleted site is not
   * something anyone can act on from this row.
   */
  async getFollowupStateByCustomerIds(
    customerIds: string[],
  ): Promise<Map<string, CustomerFollowupState>> {
    if (customerIds.length === 0) {
      return new Map();
    }

    const rows = await this.repository.manager.query<
      Array<{ id: string; needs_followup: boolean } & NextFollowupColumns>
    >(
      `
      SELECT c.id,
             (${CUSTOMER_NEEDS_FOLLOWUP('c')}) AS needs_followup,
             ${NEXT_FOLLOWUP_COLUMNS}
        FROM customer_profiles c
        LEFT JOIN LATERAL (${nextPendingFollowupSql(`
               f.customer_id = c.id
           AND (f.property_id IS NULL OR EXISTS (
                 SELECT 1 FROM customer_properties site
                  WHERE site.id = f.property_id
                    AND site.customer_id = c.id
                    AND site.deleted_at IS NULL))`)}) nf ON true
       WHERE c.id = ANY($1::uuid[])
      `,
      [customerIds],
    );

    return new Map(
      rows.map((row) => [
        row.id,
        {
          needsFollowup: row.needs_followup,
          pendingFollowupCount: row.pending_count,
          nextFollowup: toNextFollowup(row),
        },
      ]),
    );
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
      { customers: string; customersThisMonth: string; needsFollowup: string }[]
    >(
      `
      SELECT COUNT(*)                                     AS "customers",
             COUNT(*) FILTER (WHERE c.created_at >= $1)   AS "customersThisMonth",
             COUNT(*) FILTER (WHERE ${CUSTOMER_NEEDS_FOLLOWUP('c')}) AS "needsFollowup"
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
      needsFollowup: Number(customerRow?.needsFollowup ?? 0),
      sites: Number(siteRow?.sites ?? 0),
      sitesThisMonth: Number(siteRow?.sitesThisMonth ?? 0),
      pipelineValue: Number(siteRow?.pipelineValue ?? 0),
      awaitingReply: Number(siteRow?.awaitingReply ?? 0),
      awaitingAgeing: Number(siteRow?.awaitingAgeing ?? 0),
    };
  }

  /**
   * Search customers by name, phone, or email
   * Full-text-ish search across customer fields
   *
   * @param searchQuery - Search term (name, phone, email, city, group, a site's consumer number or site code)
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
          ${NAME_MATCHES_SEARCH} OR
          customer.phone LIKE :searchTerm OR
          LOWER(customer.email) LIKE :searchTerm OR
          LOWER(customer.city) LIKE :searchTerm OR
          LOWER(COALESCE(customer.group_code, '')) LIKE :searchTerm OR
          LOWER(COALESCE(customer.group_name, '')) LIKE :searchTerm OR
          ${SITE_MATCHES_SEARCH}
        )`,
        { searchTerm, ...nameSearchParams(searchQuery), ...siteSearchParams(searchQuery) },
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
  /**
   * @param currentUserId - required only for `query.mine`. Passed as an argument
   * rather than read off the query so it cannot be spoofed: a caller who could
   * put a user id in the query string could read somebody else's caseload.
   */
  async findWithFilters(
    query: CustomerQueryDto,
    currentUserId?: string,
  ): Promise<[CustomerProfileEntity[], number]> {
    const qb = this.repository
      .createQueryBuilder('customer')
      .leftJoinAndSelect('customer.user', 'user')
      .loadRelationCountAndMap(
        'customer.propertyCount',
        'customer.properties',
        'propertyCountRel',
        (qb) => qb.where('propertyCountRel.deletedAt IS NULL'),
      )
      .loadRelationCountAndMap(
        'customer.activeTicketCount',
        'customer.serviceTickets',
        'activeTicketRel',
        (countQb) =>
          countQb
            .where('activeTicketRel.deletedAt IS NULL')
            .andWhere('activeTicketRel.status IN (:...activeTicketStatuses)', {
              activeTicketStatuses: [...ACTIVE_TICKET_STATUSES],
            })
            // Issue tickets only (fix 2): a checkup is created open and
            // unassigned, so counting it here would fold every routine
            // maintenance visit into this existing "active ticket" chip.
            .andWhere('activeTicketRel.kind = :activeTicketKind', {
              activeTicketKind: ServiceTicketKind.ISSUE,
            }),
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
          ${NAME_MATCHES_SEARCH} OR
          customer.phone LIKE :searchTerm OR
          LOWER(customer.email) LIKE :searchTerm OR
          LOWER(customer.city) LIKE :searchTerm OR
          LOWER(COALESCE(customer.group_code, '')) LIKE :searchTerm OR
          LOWER(COALESCE(customer.group_name, '')) LIKE :searchTerm OR
          ${SITE_MATCHES_SEARCH}
        )`,
        { searchTerm, ...nameSearchParams(query.search), ...siteSearchParams(query.search) },
      );
    }

    // ===== Filters =====
    if (query.status) {
      qb.andWhere('customer.status = :status', { status: query.status });
    }

    if (query.city) {
      qb.andWhere('LOWER(customer.city) LIKE LOWER(:city)', { city: `%${query.city}%` });
    }

    /*
     * Followup assignee, matched across the whole unit — the customer's own
     * followups and every one of its sites'.
     *
     * EXISTS rather than a join: a customer with six followups assigned to the
     * same person would otherwise return six duplicate rows and wreck the page
     * count. Status is deliberately unfiltered, because the avatar column falls
     * back to whoever closed the last followup when nothing is pending, and a
     * filter that could not find the row you can see would be worse than none.
     */
    if (query.followupAssigneeId) {
      qb.andWhere(
        `EXISTS (
           SELECT 1 FROM followups f
            WHERE f.customer_id = customer.id
              AND f.deleted_at IS NULL
              AND f.assigned_to_user_id = :followupAssigneeId
         )`,
        { followupAssigneeId: query.followupAssigneeId },
      );
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

    /*
      The caller's own caseload — created by them OR assigned to them.

      This is a UNION and is the reason the parameter exists at all: `createdBy`
      and `assigneeId` below are separate andWhere clauses, so sending both asks
      for the INTERSECTION — leads a rep both created and was assigned — which is
      a much smaller set and never what a caseload means.

      It composes with everything else. `mine` narrows to the rep; search, the
      building filters, the status filters and the sort all still apply on top,
      which is why this is a parameter on the existing query rather than a route
      of its own.
    */
    if (query.mine && currentUserId) {
      qb.andWhere('(customer.createdBy = :mineUserId OR customer.assigneeId = :mineUserId)', {
        mineUserId: currentUserId,
      });
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

    if (query.resellerId) {
      qb.andWhere('customer.resellerId = :resellerId', { resellerId: query.resellerId });
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

    // Same predicate as the activeTicketCount mapping above, so the chip a row
    // shows and this filter can never disagree about what "active" means.
    if (query.hasActiveTickets !== undefined) {
      // Issue tickets only (fix 2): same predicate as activeTicketCount above.
      const activeTicketSubQuery = `
        SELECT 1 FROM service_tickets st
        WHERE st.customer_id = customer.id
          AND st.status IN (:...activeTicketFilterStatuses)
          AND st.kind = :activeTicketFilterKind
          AND st.deleted_at IS NULL
      `;
      qb.andWhere(
        query.hasActiveTickets
          ? `EXISTS (${activeTicketSubQuery})`
          : `NOT EXISTS (${activeTicketSubQuery})`,
        {
          activeTicketFilterStatuses: [...ACTIVE_TICKET_STATUSES],
          activeTicketFilterKind: ServiceTicketKind.ISSUE,
        },
      );
    }

    if (query.fromDate) {
      qb.andWhere('customer.createdAt >= :fromDate', { fromDate: query.fromDate });
    }

    if (query.toDate) {
      /*
        BOTH ENDS OF THIS RANGE MUST RESOLVE IN THE SAME ZONE.

        `fromDate` above is bound raw, so a bare `YYYY-MM-DD` is parsed by Postgres
        in the session timezone — Asia/Kolkata, pinned on the connection. This end
        used to append `T23:59:59.999Z`, nailing it to UTC while the other end
        floated with the session. UTC midnight is 05:29 IST, so the upper bound
        reached five and a half hours PAST the day the caller asked for, and swept
        in records created in the small hours of the following morning.

        Measured on live data: a 1-16 August range returned 11 customers, one of
        whom was created 17 August at 00:53 IST. The half-open bound below returns
        the correct 10. It resolves in the session zone like its partner, cannot
        drop the final millisecond the way a `<=` against a fixed `.999` can, and
        matches the pattern already used by `service-ticket.repository.ts`.

        A caller that sends a full instant means that instant, not the end of its
        day, so that form is still trusted exactly as given.
      */
      if (query.toDate.includes('T')) {
        qb.andWhere('customer.createdAt <= :toDate', { toDate: query.toDate });
      } else {
        qb.andWhere("customer.createdAt < (CAST(:toDate AS date) + INTERVAL '1 day')", {
          toDate: query.toDate,
        });
      }
    }

    if (query.needsFollowup) {
      qb.andWhere(`(${CUSTOMER_NEEDS_FOLLOWUP('customer')})`);
    }

    // ===== Sorting (using safe field mapping) =====
    const sortColumn = SORT_FIELD_MAP[query.sortBy];
    const sortDirection = query.sortOrder === SortOrder.ASC ? 'ASC' : 'DESC';
    if (query.sortBy === CustomerSortField.FIRST_NAME) {
      // TypeORM pages with a DISTINCT sub-query, so an expression must be a
      // selected alias before it can be sorted on. The raw column breaks ties.
      qb.addSelect(NAME_SORT_SQL, NAME_SORT_ALIAS)
        .orderBy(NAME_SORT_ALIAS, sortDirection)
        .addOrderBy(sortColumn, sortDirection);
    } else {
      qb.orderBy(sortColumn, sortDirection);
    }

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
   * Returns all distinct (group_code, group_name) pairs.
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
   * Generates the next available group code.
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
   * Checks whether a group code already exists.
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
    hasServiceTickets: boolean;
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
    if (row?.hasServiceTickets) {
      reasons.push('Cannot delete: customer has service tickets');
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
        hasServiceTickets: boolean;
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
        hasServiceTickets: boolean;
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
      .addSelect(
        `EXISTS(
          SELECT 1 FROM service_tickets st
          WHERE st.customer_id = customer.id
            AND st.deleted_at IS NULL
        )`,
        'hasServiceTickets',
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
        hasServiceTickets: boolean;
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
        hasServiceTickets: row.hasServiceTickets,
      });
    }

    return result;
  }
}
