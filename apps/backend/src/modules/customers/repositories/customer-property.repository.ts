import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  LeadTemperature,
  ProjectStatus,
  PropertyStatus,
  PropertySortField,
  SortOrder,
} from '@tejas96/shared/types';
import { type EntityManager, IsNull, Repository } from 'typeorm';

import { PROPERTY_NEEDS_FOLLOWUP } from './followup-predicates';
import { systemSizeKwSql } from '../../../common/utils/transform.util';
import { PropertyQueryDto } from '../dto/property-query.dto';
import { CustomerPropertyEntity } from '../entities/customer-property.entity';

/**
 * A converted site's live contract, and how it splits.
 *
 * `quotedValue + changeOrderValue === contractValue` — asserted in the
 * database, so the split can be printed without re-deriving it.
 */
export interface PropertyContractValue {
  contractValue: number;
  quotedValue: number;
  changeOrderValue: number;
}

/**
 * Field mapping for safe sorting (prevents SQL injection via sortBy)
 * Maps enum values to entity property paths (camelCase) — TypeORM resolves these to DB columns.
 * Quote fields (cv.*) require conditional LEFT JOINs added in findWithFilters.
 *
 * SYSTEM_SIZE is a raw CASE expression, not a column path: sorting must use
 * the same wattage-preferred size the response DTO displays, or "sort by
 * system size" would order by a number the row next to it doesn't show.
 */
const SORT_FIELD_MAP: Record<PropertySortField, string> = {
  [PropertySortField.CREATED_AT]: 'property.createdAt',
  [PropertySortField.UPDATED_AT]: 'property.updatedAt',
  [PropertySortField.PROPERTY_NAME]: 'property.propertyName',
  [PropertySortField.CITY]: 'property.city',
  [PropertySortField.LEAD_TEMPERATURE]: 'property.leadTemperature',
  [PropertySortField.PROPERTY_TYPE]: 'property.propertyType',
  [PropertySortField.STATUS]: 'property.status',
  [PropertySortField.SYSTEM_SIZE]: systemSizeKwSql('cv'),
  [PropertySortField.QUOTE_COST]: 'cv.finalPrice',
};

const QUOTE_SORT_FIELDS = new Set<PropertySortField>([
  PropertySortField.SYSTEM_SIZE,
  PropertySortField.QUOTE_COST,
]);

@Injectable()
export class CustomerPropertyRepository {
  constructor(
    @InjectRepository(CustomerPropertyEntity)
    public readonly repository: Repository<CustomerPropertyEntity>,
  ) {}

  /**
   * Update property status by ID (transaction-aware, no ownership check — caller must pre-validate)
   */
  async updateStatusById(
    propertyId: string,
    status: PropertyStatus,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = this.getRepo(manager);
    await repo.update(propertyId, { status });
  }

  /**
   * Close this site as lost, with the reason captured at the moment someone
   * knows it. Sibling properties and the customer are deliberately untouched —
   * one dead site does not kill the account.
   */
  async markLost(
    id: string,
    reason: string,
    updatedBy: string,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = this.getRepo(manager);
    await repo.update(id, {
      status: PropertyStatus.LOST,
      lostReason: reason,
      lostAt: new Date(),
      updatedBy,
    });
  }

  async findById(id: string): Promise<CustomerPropertyEntity | null> {
    return this.repository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: [
        'customer',
        'project',
        'discom',
        'siteVisitAssigneeUser',
        'siteSurveyAssigneeUser',
      ],
    });
  }

  async findByIdAndOrganization(id: string): Promise<CustomerPropertyEntity | null> {
    return this.repository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: [
        'customer',
        'creator',
        'project',
        'discom',
        'siteVisitAssigneeUser',
        'siteSurveyAssigneeUser',
      ],
    });
  }

  async findByCustomer(customerId: string): Promise<CustomerPropertyEntity[]> {
    return this.repository.find({
      where: { customerId, deletedAt: IsNull() },
      relations: ['discom'],
      order: { isPrimary: 'DESC', createdAt: 'DESC' },
    });
  }

  async findByOrganization(page = 1, limit = 20): Promise<[CustomerPropertyEntity[], number]> {
    return this.repository.findAndCount({
      where: { deletedAt: IsNull() },
      relations: ['customer'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
  }

  async findByConsumerNumber(consumerNumber: string): Promise<CustomerPropertyEntity | null> {
    return this.repository.findOne({
      where: { consumerNumber, deletedAt: IsNull() },
      relations: ['customer'],
    });
  }

  async findByTemperature(
    temperature: LeadTemperature,
    page = 1,
    limit = 20,
  ): Promise<[CustomerPropertyEntity[], number]> {
    return this.repository.findAndCount({
      where: { leadTemperature: temperature, deletedAt: IsNull() },
      relations: ['customer'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
  }

  async create(property: Partial<CustomerPropertyEntity>): Promise<CustomerPropertyEntity> {
    const newProperty = this.repository.create(property);
    return this.repository.save(newProperty);
  }

  async update(
    id: string,
    updates: Partial<CustomerPropertyEntity>,
  ): Promise<CustomerPropertyEntity | null> {
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
    const repo = manager ? manager.getRepository(CustomerPropertyEntity) : this.repository;
    const result = await repo.delete({ id });
    return (result.affected ?? 0) > 0;
  }

  /**
   * Set a property as primary for a customer
   * Unsets all other properties as non-primary first
   */
  async setPrimary(propertyId: string, customerId: string, updatedBy?: string): Promise<void> {
    // First, unset all primary flags for this customer
    await this.repository.update({ customerId, deletedAt: IsNull() }, { isPrimary: false });

    // Then set the specified property as primary
    await this.repository.update({ id: propertyId }, { isPrimary: true, updatedBy });
  }

  async countByCustomer(customerId: string): Promise<number> {
    return this.repository.count({
      where: { customerId, deletedAt: IsNull() },
    });
  }

  /**
   * Batch lookup each property's live project — its id AND its current status.
   *
   * The status travels with the id because a site's own `status` column stops
   * moving the moment it converts: it is written to CONVERTED when the project
   * is created and back to ACTIVE only if that project is deleted. Nothing
   * marks a site whose project finished, stalled or was called off, so every
   * list that shows a site's state has to read the project to tell the truth.
   */
  async findProjectsByPropertyIds(
    propertyIds: string[],
    manager?: EntityManager,
  ): Promise<Map<string, { id: string; status: ProjectStatus }>> {
    if (propertyIds.length === 0) {
      return new Map();
    }

    const rows = await (manager ?? this.repository.manager)
      .createQueryBuilder()
      .select('project.property_id', 'propertyId')
      .addSelect('project.id', 'projectId')
      .addSelect('project.status', 'status')
      .from('projects', 'project')
      .where('project.property_id IN (:...propertyIds)', { propertyIds })
      .andWhere('project.deleted_at IS NULL')
      .getRawMany<{ propertyId: string; projectId: string; status: ProjectStatus }>();

    return new Map(rows.map((row) => [row.propertyId, { id: row.projectId, status: row.status }]));
  }

  /**
   * What each property's project is worth NOW, split into the part that came
   * from the signed quote and the part agreed since.
   *
   * Every screen that lists a site used to show `latestQuoteFinalPrice` — the
   * quote's own value, frozen at signing. That is right for a row that stands
   * for a QUOTE, and wrong for a row that stands for a converted site: bill the
   * customer for material added on site and the project's Money tab moves while
   * the customer page, the property page and the site list all keep reporting
   * the original figure, with nothing on screen explaining the gap.
   *
   * Read from `v_project_balance`, the same view the projects list already uses
   * for exactly this reason (see ProjectRepository.getPaymentSummaries) — one
   * definition of "what this project is worth", not a second one computed here.
   */
  async findContractValuesByPropertyIds(
    propertyIds: string[],
    manager?: EntityManager,
  ): Promise<Map<string, PropertyContractValue>> {
    if (propertyIds.length === 0) {
      return new Map();
    }

    const rows = await (manager ?? this.repository.manager).query<
      Array<{
        propertyId: string;
        contractPaise: string;
        quotedPaise: string;
        changeOrderPaise: string;
      }>
    >(
      `SELECT p.property_id      AS "propertyId",
              b.contract_paise   AS "contractPaise",
              b.quoted_paise     AS "quotedPaise",
              b.change_order_paise AS "changeOrderPaise"
         FROM projects p
         JOIN v_project_balance b ON b.project_id = p.id
        WHERE p.property_id = ANY($1::uuid[])
          AND p.deleted_at IS NULL`,
      [propertyIds],
    );

    return new Map(
      rows.map((row) => [
        row.propertyId,
        {
          // Rupees, matching latestQuoteFinalPrice beside which these are
          // rendered. The ledger's own unit is paise; conversion happens once,
          // here, rather than in each of the five screens that read this.
          contractValue: Number(row.contractPaise) / 100,
          quotedValue: Number(row.quotedPaise) / 100,
          changeOrderValue: Number(row.changeOrderPaise) / 100,
        },
      ]),
    );
  }

  /**
   * Next pending followup per property, and whether the site needs one.
   *
   * `needsFollowup` is evaluated with the SHARED predicate rather than derived
   * on the client from a null date. Deriving it would omit the accepted-quote
   * exclusion, so a site with a won quote that is not yet converted would show
   * a red dot while being absent from both the chip and the gaps tab — three
   * such sites exist on current data. The dot must not disagree with the
   * numbers beside it.
   *
   * Batched like the other enrichments here; a per-row query would be N+1
   * across a customer's whole portfolio. "Next" stays derived — nothing is
   * stored on the property.
   */
  async findFollowupStateByPropertyIds(
    propertyIds: string[],
  ): Promise<Map<string, { nextAt: Date | null; needsFollowup: boolean }>> {
    if (propertyIds.length === 0) return new Map();

    const rows: Array<{ id: string; next_at: Date | null; needs_followup: boolean }> =
      await this.repository.manager.query(
        `
      SELECT p.id,
             (SELECT MIN(f.scheduled_at) FROM followups f
               WHERE f.property_id = p.id AND f.deleted_at IS NULL AND f.status = 'pending')
               AS next_at,
             (${PROPERTY_NEEDS_FOLLOWUP('p')}) AS needs_followup
        FROM customer_properties p
       WHERE p.id = ANY($1::uuid[])
      `,
        [propertyIds],
      );

    return new Map(
      rows.map((row) => [row.id, { nextAt: row.next_at, needsFollowup: row.needs_followup }]),
    );
  }

  async countByTemperature(temperature: LeadTemperature): Promise<number> {
    return this.repository.count({
      where: { leadTemperature: temperature, deletedAt: IsNull() },
    });
  }

  /**
   * Find properties with comprehensive filtering, sorting, and pagination
   * This is the primary method for the property list API
   *
   * @param query - Query parameters (filters, sorting, pagination)
   * @returns Tuple of [properties, total count]
   */
  async findWithFilters(query: PropertyQueryDto): Promise<[CustomerPropertyEntity[], number]> {
    const needsQuoteJoin =
      QUOTE_SORT_FIELDS.has(query.sortBy) ||
      query.quoteStatus !== undefined ||
      query.systemSizeMin !== undefined ||
      query.systemSizeMax !== undefined;

    const qb = this.repository
      .createQueryBuilder('property')
      .leftJoinAndSelect('property.customer', 'customer')
      .leftJoinAndSelect('property.creator', 'creator')
      .leftJoinAndSelect('property.discom', 'discom');

    if (needsQuoteJoin) {
      qb.leftJoin(
        'property.quotes',
        'latestQuote',
        'latestQuote.id = ' +
          '(SELECT q2.id FROM quotes q2 WHERE q2.property_id = property.id ' +
          'AND q2.deleted_at IS NULL ' +
          'ORDER BY q2.created_at DESC, q2.id DESC LIMIT 1)',
      );
      qb.leftJoin(
        'latestQuote.versions',
        'cv',
        `cv.id = (
          SELECT qv.id
          FROM quote_versions qv
          WHERE qv.quote_id = "latestQuote".id
          ORDER BY qv.created_at DESC, qv.version_number DESC, qv.id DESC
          LIMIT 1
        )`,
      );
      qb.addSelect(['cv.totalWattageWp', 'cv.finalPrice']);
    }

    qb.where('property.deletedAt IS NULL');

    // ===== Search (case-insensitive, multiple fields including customer name) =====
    if (query.search && query.search.length >= 2) {
      const searchTerm = `%${query.search.toLowerCase()}%`;
      qb.andWhere(
        `(
          LOWER(property.property_name) LIKE :searchTerm OR
          LOWER(property.address) LIKE :searchTerm OR
          LOWER(property.city) LIKE :searchTerm OR
          property.consumer_number LIKE :searchTerm OR
          LOWER(customer.first_name) LIKE :searchTerm OR
          LOWER(customer.last_name) LIKE :searchTerm OR
          LOWER(CONCAT(customer.first_name, ' ', customer.last_name)) LIKE :searchTerm
        )`,
        { searchTerm },
      );
    }

    // ===== Filters =====
    if (query.leadTemperature) {
      qb.andWhere('property.leadTemperature = :leadTemperature', {
        leadTemperature: query.leadTemperature,
      });
    }

    if (query.propertyType) {
      qb.andWhere('property.propertyType = :propertyType', {
        propertyType: query.propertyType,
      });
    }

    if (query.status) {
      qb.andWhere('property.status = :status', { status: query.status });
    }

    if (query.connectionType) {
      qb.andWhere('property.connectionType = :connectionType', {
        connectionType: query.connectionType,
      });
    }

    if (query.siteStatus) {
      qb.andWhere('property.siteStatus = :siteStatus', {
        siteStatus: query.siteStatus,
      });
    }

    if (query.city) {
      qb.andWhere('LOWER(property.city) LIKE LOWER(:city)', { city: `%${query.city}%` });
    }

    if (query.state) {
      qb.andWhere('LOWER(property.state) LIKE LOWER(:state)', { state: `%${query.state}%` });
    }

    if (query.createdBy) {
      qb.andWhere('property.created_by = :createdBy', { createdBy: query.createdBy });
    }

    // Entity-property form (`property.siteVisitAssignee`), not the raw column
    // name. This file mixes both — `property.siteStatus` sits two clauses above
    // `property.created_by` — so the form was verified by generating the SQL
    // rather than copied from a neighbour. TypeORM resolves this to
    // `property.site_visit_assignee`; see the ManyToOne on the same column,
    // which is why the raw form is ambiguous here and the property form is not.
    if (query.siteVisitAssignee) {
      qb.andWhere('property.siteVisitAssignee = :siteVisitAssignee', {
        siteVisitAssignee: query.siteVisitAssignee,
      });
    }

    if (query.siteSurveyAssignee) {
      qb.andWhere('property.siteSurveyAssignee = :siteSurveyAssignee', {
        siteSurveyAssignee: query.siteSurveyAssignee,
      });
    }

    if (query.fromDate) {
      qb.andWhere('property.created_at >= :fromDate', { fromDate: query.fromDate });
    }

    if (query.toDate) {
      /*
        Same rule as `customer-profile.repository.ts`, and for the same reason: the
        `fromDate` above is parsed in the session timezone, so pinning this end to
        UTC with a `T23:59:59.999Z` suffix pushed it 05:29 IST past the day the
        caller asked for, sweeping in records created the following morning. A full
        instant still means that instant.
      */
      if (query.toDate.includes('T')) {
        qb.andWhere('property.created_at <= :toDate', { toDate: query.toDate });
      } else {
        qb.andWhere("property.created_at < (CAST(:toDate AS date) + INTERVAL '1 day')", {
          toDate: query.toDate,
        });
      }
    }

    if (query.quoteStatus !== undefined) {
      qb.andWhere('latestQuote.status = :quoteStatus', { quoteStatus: query.quoteStatus });
    }

    if (query.systemSizeMin !== undefined) {
      qb.andWhere(`${systemSizeKwSql('cv')} >= :systemSizeMin`, {
        systemSizeMin: query.systemSizeMin,
      });
    }

    if (query.systemSizeMax !== undefined) {
      qb.andWhere(`${systemSizeKwSql('cv')} <= :systemSizeMax`, {
        systemSizeMax: query.systemSizeMax,
      });
    }

    // ===== Sorting (using safe field mapping) =====
    const sortColumn = SORT_FIELD_MAP[query.sortBy] ?? SORT_FIELD_MAP[PropertySortField.CREATED_AT];
    const sortDirection = query.sortOrder === SortOrder.ASC ? 'ASC' : 'DESC';
    qb.orderBy(sortColumn, sortDirection, needsQuoteJoin ? 'NULLS LAST' : undefined);

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
   * Get temperature statistics in a single query
   * Returns count of properties grouped by lead_temperature
   */
  async getTemperatureStats(): Promise<{ temperature: LeadTemperature; count: number }[]> {
    const result = await this.repository
      .createQueryBuilder('property')
      .select('property.lead_temperature', 'temperature')
      .addSelect('COUNT(*)', 'count')
      .andWhere('property.deleted_at IS NULL')
      .groupBy('property.lead_temperature')
      .getRawMany<{ temperature: LeadTemperature; count: string }>();

    return result.map((r) => ({
      temperature: r.temperature,
      count: parseInt(r.count, 10),
    }));
  }

  private getRepo(manager?: EntityManager): Repository<CustomerPropertyEntity> {
    return manager ? manager.getRepository(CustomerPropertyEntity) : this.repository;
  }
}
