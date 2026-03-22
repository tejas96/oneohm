import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CustomerSortField, CustomerStatus, SortOrder } from '@oneohm-epc/shared/types';
import { IsNull, Repository } from 'typeorm';

import { CustomerQueryDto } from '../dto/customer-query.dto';
import { CustomerProfileEntity } from '../entities/customer-profile.entity';

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
      relations: ['user', 'organization', 'creator'],
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
   * Find customers created by a specific user
   * Used for field workers to see only their own customers
   */
  async findByCreatedBy(
    organizationId: string,
    createdBy: string,
    page = 1,
    limit = 20,
  ): Promise<[CustomerProfileEntity[], number]> {
    return this.repository.findAndCount({
      where: { organizationId, createdBy, deletedAt: IsNull() },
      relations: ['user', 'organization', 'properties'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
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
      .where('customer.organization_id = :organizationId', { organizationId })
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
      .where('customer.organization_id = :organizationId', { organizationId })
      .andWhere('customer.deleted_at IS NULL')
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
   * @param searchQuery - Search term (searches first name, last name, phone, email)
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
      .where('customer.organization_id = :organizationId', { organizationId })
      .andWhere('customer.deleted_at IS NULL')
      .andWhere(
        `(
          LOWER(customer.first_name) LIKE :searchTerm OR
          LOWER(customer.last_name) LIKE :searchTerm OR
          LOWER(CONCAT(customer.first_name, ' ', customer.last_name)) LIKE :searchTerm OR
          customer.phone LIKE :searchTerm OR
          LOWER(customer.email) LIKE :searchTerm OR
          LOWER(customer.city) LIKE :searchTerm
        )`,
        { searchTerm },
      );

    // Filter by creator if specified (for field workers)
    if (createdBy) {
      qb.andWhere('customer.created_by = :createdBy', { createdBy });
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
      .where('customer.organization_id = :organizationId', { organizationId })
      .andWhere('customer.deleted_at IS NULL');

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
          LOWER(customer.city) LIKE :searchTerm
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
      qb.andWhere('customer.lead_source = :leadSource', { leadSource: query.leadSource });
    }

    if (query.createdBy) {
      qb.andWhere('customer.created_by = :createdBy', { createdBy: query.createdBy });
    }

    if (query.fromDate) {
      qb.andWhere('customer.created_at >= :fromDate', { fromDate: query.fromDate });
    }

    if (query.toDate) {
      // Add time to make toDate inclusive (end of day)
      qb.andWhere('customer.created_at <= :toDate', {
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
}
