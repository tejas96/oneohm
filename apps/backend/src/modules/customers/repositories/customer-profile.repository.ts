import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CustomerSortField, CustomerStatus, LeadSource, SortOrder } from '@oneohm-epc/shared/types';
import { IsNull, Repository } from 'typeorm';

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
      .andWhere(
        '(customer.createdBy = :userId OR customer.assigneeId = :userId)',
        { userId },
      )
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
      qb.andWhere(
        '(customer.createdBy = :createdBy OR customer.assigneeId = :createdBy)',
        { createdBy },
      );
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
      .leftJoinAndSelect('customer.properties', 'properties', 'properties.deleted_at IS NULL')
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

    if (query.state) {
      qb.andWhere('LOWER(customer.state) LIKE LOWER(:state)', { state: `%${query.state}%` });
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
      // Return customers where user is the creator OR the assignee (for field worker "my leads" view)
      qb.andWhere(
        '(customer.createdBy = :createdBy OR customer.assigneeId = :createdBy)',
        { createdBy: query.createdBy },
      );
    }

    if (query.fromDate) {
      qb.andWhere('customer.createdAt >= :fromDate', { fromDate: query.fromDate });
    }

    if (query.toDate) {
      // Add time to make toDate inclusive (end of day)
      qb.andWhere('customer.createdAt <= :toDate', {
        toDate: `${query.toDate}T23:59:59.999Z`,
      });
    }

    // ===== Sorting (using safe field mapping) =====
    const sortColumn = SORT_FIELD_MAP[query.sortBy] ?? SORT_FIELD_MAP[CustomerSortField.CREATED_AT];
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
}
