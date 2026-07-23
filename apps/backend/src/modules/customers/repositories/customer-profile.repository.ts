import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CustomerSortField, CustomerStatus, LeadSource, SortOrder } from '@tejas96/shared/types';
import {
  hasAnyCustomerPropertyFilter,
  hasContradictoryCustomerPropertyFilters,
} from '@tejas96/shared/utils';
import { IsNull, Repository, type EntityManager, type SelectQueryBuilder } from 'typeorm';

import { CustomerQueryDto } from '../dto/customer-query.dto';
import { CustomerProfileEntity } from '../entities/customer-profile.entity';

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
  organizationId: string,
  query: CustomerQueryDto,
): void {
  if (!hasAnyCustomerPropertyFilter(query)) {
    return;
  }

  const conditions: string[] = [
    'prop.customer_id = customer.id',
    'prop.deleted_at IS NULL',
    'prop.organization_id = :propFilterOrgId',
  ];
  const params: Record<string, unknown> = { propFilterOrgId: organizationId };

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
  if (query.quoteStatus !== undefined) {
    conditions.push('latest_quote.status = :quoteStatus');
    params.quoteStatus = query.quoteStatus;
  }
  if (query.propertySystemSizeMin !== undefined) {
    conditions.push('cv.system_size_kw >= :propertySystemSizeMin');
    params.propertySystemSizeMin = query.propertySystemSizeMin;
  }
  if (query.propertySystemSizeMax !== undefined) {
    conditions.push('cv.system_size_kw <= :propertySystemSizeMax');
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
            AND q2.organization_id = :propFilterOrgId
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
      relations: ['user', 'organization', 'creator', 'assignee'],
    });
  }

  async findByUserAndOrganization(
    userId: string,
    organizationId: string,
  ): Promise<CustomerProfileEntity | null> {
    return this.repository.findOne({
      where: { userId, organizationId, deletedAt: IsNull() },
      relations: ['user', 'organization'],
    });
  }

  async findByUserId(userId: string): Promise<CustomerProfileEntity[]> {
    return this.repository.find({
      where: { userId, deletedAt: IsNull() },
      relations: ['organization'],
    });
  }

  async findByOrganization(
    organizationId: string,
    page = 1,
    limit = 20,
  ): Promise<[CustomerProfileEntity[], number]> {
    return this.repository.findAndCount({
      where: { organizationId, deletedAt: IsNull() },
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

  async hardDelete(id: string, organizationId: string, manager?: EntityManager): Promise<boolean> {
    const repo = manager ? manager.getRepository(CustomerProfileEntity) : this.repository;
    const result = await repo.delete({ id, organizationId });
    return (result.affected ?? 0) > 0;
  }

  /**
   * Find customers created by or assigned to a specific user.
   * Used for field workers to see their own and assigned customers.
   */
  async findByCreatedBy(
    organizationId: string,
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<[CustomerProfileEntity[], number]> {
    return this.repository
      .createQueryBuilder('customer')
      .leftJoinAndSelect('customer.user', 'user')
      .leftJoinAndSelect('customer.organization', 'organization')
      .leftJoinAndSelect('customer.properties', 'properties', 'properties.deleted_at IS NULL')
      .leftJoinAndSelect('customer.assignee', 'assignee')
      .where('customer.organizationId = :organizationId', { organizationId })
      .andWhere('customer.deletedAt IS NULL')
      .andWhere('(customer.createdBy = :userId OR customer.assigneeId = :userId)', { userId })
      .orderBy('customer.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }

  async findByPhone(organizationId: string, phone: string): Promise<CustomerProfileEntity[]> {
    return this.repository.find({
      where: { organizationId, phone, deletedAt: IsNull() },
    });
  }

  async findOneByPhone(
    organizationId: string,
    phone: string,
  ): Promise<CustomerProfileEntity | null> {
    return this.repository.findOne({
      where: { organizationId, phone, deletedAt: IsNull() },
    });
  }

  async findByEmail(organizationId: string, email: string): Promise<CustomerProfileEntity | null> {
    return this.repository
      .createQueryBuilder('cp')
      .where('cp.organization_id = :organizationId', { organizationId })
      .andWhere('LOWER(cp.email) = LOWER(:email)', { email })
      .andWhere('cp.deleted_at IS NULL')
      .getOne();
  }

  /**
   * Find customer by consumer number (searches through properties)
   * @deprecated Consumer number is now on CustomerPropertyEntity
   * Consider using CustomerPropertyRepository.findByConsumerNumber instead
   */
  async findByConsumerNumber(
    organizationId: string,
    consumerNumber: string,
  ): Promise<CustomerProfileEntity | null> {
    return this.repository
      .createQueryBuilder('customer')
      .innerJoin('customer.properties', 'property')
      .where('customer.organizationId = :organizationId', { organizationId })
      .andWhere('property.consumerNumber = :consumerNumber', { consumerNumber })
      .andWhere('customer.deletedAt IS NULL')
      .andWhere('property.deletedAt IS NULL')
      .getOne();
  }

  async countByStatus(organizationId: string, status: CustomerStatus): Promise<number> {
    return this.repository.count({
      where: { organizationId, status, deletedAt: IsNull() },
    });
  }

  /**
   * Get status statistics in a single query
   * Returns count of customers grouped by status
   */
  async getStatusStats(
    organizationId: string,
  ): Promise<{ status: CustomerStatus; count: number }[]> {
    const result = await this.repository
      .createQueryBuilder('customer')
      .select('customer.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('customer.organizationId = :organizationId', { organizationId })
      .andWhere('customer.deletedAt IS NULL')
      .groupBy('customer.status')
      .getRawMany<{ status: CustomerStatus; count: string }>();

    return result.map((r) => ({
      status: r.status,
      count: parseInt(r.count, 10),
    }));
  }

  /**
   * Search customers by name, phone, or email
   * Searches within the organization context
   *
   * @param organizationId - Organization to search in
   * @param searchQuery - Search term (searches first name, last name, phone, email, group)
   * @param createdBy - Optional: filter by creator (for field workers)
   * @param page - Page number
   * @param limit - Items per page
   * @returns Matching customers with pagination
   */
  async search(
    organizationId: string,
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
      .leftJoinAndSelect('customer.organization', 'organization')
      .leftJoinAndSelect('customer.properties', 'properties', 'properties.deleted_at IS NULL')
      .leftJoinAndSelect('customer.assignee', 'assignee')
      .where('customer.organizationId = :organizationId', { organizationId })
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
   * @param organizationId - Organization context
   * @param query - Query parameters (filters, sorting, pagination)
   * @returns Tuple of [customers, total count]
   */
  async findWithFilters(
    organizationId: string,
    query: CustomerQueryDto,
  ): Promise<[CustomerProfileEntity[], number]> {
    const qb = this.repository
      .createQueryBuilder('customer')
      .leftJoinAndSelect('customer.user', 'user')
      .leftJoinAndSelect('customer.organization', 'organization')
      .loadRelationCountAndMap(
        'customer.propertyCount',
        'customer.properties',
        'propertyCountRel',
        (qb) => qb.where('propertyCountRel.deletedAt IS NULL'),
      )
      .leftJoinAndSelect('customer.creator', 'creator')
      .leftJoinAndSelect('customer.assignee', 'assignee')
      .where('customer.organizationId = :organizationId', { organizationId })
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

      applyMatchingPropertyFilter(qb, organizationId, query);
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
  async findDistinctGroups(
    organizationId: string,
  ): Promise<{ groupCode: string; groupName: string }[]> {
    const rows = await this.repository
      .createQueryBuilder('customer')
      .select('customer.groupCode', 'groupCode')
      .addSelect('customer.groupName', 'groupName')
      .where('customer.organizationId = :organizationId', { organizationId })
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
  async generateGroupCode(organizationId: string): Promise<string> {
    const pattern = 'GRP-%';

    const result = await this.repository
      .createQueryBuilder('customer')
      .withDeleted()
      .select('customer.groupCode', 'code')
      .where('customer.organizationId = :organizationId', { organizationId })
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
  async groupCodeExists(organizationId: string, groupCode: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { organizationId, groupCode, deletedAt: IsNull() },
    });
    return count > 0;
  }

  /**
   * Returns human-readable reasons why a customer cannot be permanently deleted.
   */
  async getCustomerDeleteBlockers(
    customerId: string,
    organizationId: string,
    manager?: EntityManager,
  ): Promise<string[]> {
    const flags = await this.queryDeleteBlockerFlags([customerId], organizationId, manager);
    return this.mapDeleteBlockerFlags(flags.get(customerId));
  }

  async getCustomerDeleteBlockersBatch(
    customerIds: string[],
    organizationId: string,
  ): Promise<Map<string, string[]>> {
    const flags = await this.queryDeleteBlockerFlags(customerIds, organizationId);
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
    hasServiceRequests: boolean;
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
    if (row?.hasServiceRequests) {
      reasons.push('Cannot delete: customer has service requests');
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
    organizationId: string,
    manager?: EntityManager,
  ): Promise<
    Map<
      string,
      {
        hasProperties: boolean;
        hasProjects: boolean;
        hasQuotes: boolean;
        hasPayments: boolean;
        hasServiceRequests: boolean;
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
        hasServiceRequests: boolean;
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
            AND cp.organization_id = :organizationId
            AND cp.deleted_at IS NULL
        )`,
        'hasProperties',
      )
      .addSelect(
        `EXISTS(
          SELECT 1 FROM projects p
          INNER JOIN customer_properties cp ON cp.id = p.property_id
          WHERE cp.customer_id = customer.id
            AND cp.organization_id = :organizationId
            AND p.deleted_at IS NULL
        )`,
        'hasProjects',
      )
      .addSelect(
        `EXISTS(
          SELECT 1 FROM quotes q
          WHERE q.customer_id = customer.id
            AND q.organization_id = :organizationId
            AND q.deleted_at IS NULL
        )`,
        'hasQuotes',
      )
      .addSelect(
        `EXISTS(
          SELECT 1 FROM payments p
          WHERE p.customer_id = customer.id
            AND p.organization_id = :organizationId
            AND p.deleted_at IS NULL
        )`,
        'hasPayments',
      )
      .addSelect(
        `EXISTS(
          SELECT 1 FROM service_requests sr
          WHERE sr.customer_id = customer.id
            AND sr.organization_id = :organizationId
            AND sr.deleted_at IS NULL
        )`,
        'hasServiceRequests',
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
      .andWhere('customer.organizationId = :organizationId', { organizationId })
      .setParameters({ organizationId })
      .getRawMany<{
        customerId: string;
        hasProperties: boolean;
        hasProjects: boolean;
        hasQuotes: boolean;
        hasPayments: boolean;
        hasServiceRequests: boolean;
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
        hasServiceRequests: row.hasServiceRequests,
        hasLoans: row.hasLoans,
        hasSubsidies: row.hasSubsidies,
        hasFeedback: row.hasFeedback,
      });
    }

    return result;
  }
}
