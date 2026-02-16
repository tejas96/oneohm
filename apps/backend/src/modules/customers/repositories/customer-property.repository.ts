import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LeadTemperature, PropertySortField, SortOrder } from '@oneohm-epc/shared-types';
import { IsNull, Repository } from 'typeorm';

import { PropertyQueryDto } from '../dto/property-query.dto';
import { CustomerPropertyEntity } from '../entities/customer-property.entity';

/**
 * Field mapping for safe sorting (prevents SQL injection via sortBy)
 * Maps enum values to entity property paths (camelCase) - TypeORM resolves these to DB columns
 */
const SORT_FIELD_MAP: Record<PropertySortField, string> = {
  [PropertySortField.CREATED_AT]: 'property.createdAt',
  [PropertySortField.UPDATED_AT]: 'property.updatedAt',
  [PropertySortField.PROPERTY_NAME]: 'property.propertyName',
  [PropertySortField.CITY]: 'property.city',
  [PropertySortField.LEAD_TEMPERATURE]: 'property.leadTemperature',
  [PropertySortField.PROPERTY_TYPE]: 'property.propertyType',
  [PropertySortField.STATUS]: 'property.status',
};

@Injectable()
export class CustomerPropertyRepository {
  constructor(
    @InjectRepository(CustomerPropertyEntity)
    public readonly repository: Repository<CustomerPropertyEntity>,
  ) {}

  async findById(id: string): Promise<CustomerPropertyEntity | null> {
    return this.repository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['customer', 'organization'],
    });
  }

  async findByIdAndOrganization(
    id: string,
    organizationId: string,
  ): Promise<CustomerPropertyEntity | null> {
    return this.repository.findOne({
      where: { id, organizationId, deletedAt: IsNull() },
      relations: ['customer', 'creator'],
    });
  }

  async findByCustomer(customerId: string): Promise<CustomerPropertyEntity[]> {
    return this.repository.find({
      where: { customerId, deletedAt: IsNull() },
      order: { isPrimary: 'DESC', createdAt: 'DESC' },
    });
  }

  async findByOrganization(
    organizationId: string,
    page = 1,
    limit = 20,
  ): Promise<[CustomerPropertyEntity[], number]> {
    return this.repository.findAndCount({
      where: { organizationId, deletedAt: IsNull() },
      relations: ['customer'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
  }

  async findByConsumerNumber(
    organizationId: string,
    consumerNumber: string,
  ): Promise<CustomerPropertyEntity | null> {
    return this.repository.findOne({
      where: { organizationId, consumerNumber, deletedAt: IsNull() },
      relations: ['customer'],
    });
  }

  async findByTemperature(
    organizationId: string,
    temperature: LeadTemperature,
    page = 1,
    limit = 20,
  ): Promise<[CustomerPropertyEntity[], number]> {
    return this.repository.findAndCount({
      where: { organizationId, leadTemperature: temperature, deletedAt: IsNull() },
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

  async countByTemperature(organizationId: string, temperature: LeadTemperature): Promise<number> {
    return this.repository.count({
      where: { organizationId, leadTemperature: temperature, deletedAt: IsNull() },
    });
  }

  /**
   * Find properties with comprehensive filtering, sorting, and pagination
   * This is the primary method for the property list API
   *
   * @param organizationId - Organization context
   * @param query - Query parameters (filters, sorting, pagination)
   * @returns Tuple of [properties, total count]
   */
  async findWithFilters(
    organizationId: string,
    query: PropertyQueryDto,
  ): Promise<[CustomerPropertyEntity[], number]> {
    const qb = this.repository
      .createQueryBuilder('property')
      .leftJoinAndSelect('property.customer', 'customer')
      .leftJoinAndSelect('property.creator', 'creator')
      .where('property.organizationId = :organizationId', { organizationId })
      .andWhere('property.deletedAt IS NULL');

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

    if (query.city) {
      qb.andWhere('LOWER(property.city) LIKE LOWER(:city)', { city: `%${query.city}%` });
    }

    if (query.state) {
      qb.andWhere('LOWER(property.state) LIKE LOWER(:state)', { state: `%${query.state}%` });
    }

    if (query.createdBy) {
      qb.andWhere('property.created_by = :createdBy', { createdBy: query.createdBy });
    }

    if (query.fromDate) {
      qb.andWhere('property.created_at >= :fromDate', { fromDate: query.fromDate });
    }

    if (query.toDate) {
      qb.andWhere('property.created_at <= :toDate', {
        toDate: `${query.toDate}T23:59:59.999Z`,
      });
    }

    // ===== Sorting (using safe field mapping) =====
    const sortColumn =
      SORT_FIELD_MAP[query.sortBy] ?? SORT_FIELD_MAP[PropertySortField.CREATED_AT];
    const sortDirection = query.sortOrder === SortOrder.ASC ? 'ASC' : 'DESC';
    qb.orderBy(sortColumn, sortDirection);

    // ===== Pagination =====
    qb.skip((query.page - 1) * query.limit).take(query.limit);

    return qb.getManyAndCount();
  }

  /**
   * Get temperature statistics in a single query
   * Returns count of properties grouped by lead_temperature
   */
  async getTemperatureStats(
    organizationId: string,
  ): Promise<{ temperature: LeadTemperature; count: number }[]> {
    const result = await this.repository
      .createQueryBuilder('property')
      .select('property.lead_temperature', 'temperature')
      .addSelect('COUNT(*)', 'count')
      .where('property.organization_id = :organizationId', { organizationId })
      .andWhere('property.deleted_at IS NULL')
      .groupBy('property.lead_temperature')
      .getRawMany<{ temperature: LeadTemperature; count: string }>();

    return result.map((r) => ({
      temperature: r.temperature,
      count: parseInt(r.count, 10),
    }));
  }
}
