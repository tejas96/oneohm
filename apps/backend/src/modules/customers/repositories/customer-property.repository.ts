import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  LeadTemperature,
  type PropertyStatus,
  PropertySortField,
  SortOrder,
} from '@tejas96/shared/types';
import { type EntityManager, IsNull, Repository } from 'typeorm';

import { PropertyQueryDto } from '../dto/property-query.dto';
import { CustomerPropertyEntity } from '../entities/customer-property.entity';

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
  [PropertySortField.SYSTEM_SIZE]:
    'CASE WHEN cv.totalWattageWp > 0 THEN cv.totalWattageWp / 1000.0 ELSE cv.systemSizeKw END',
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
   * Batch lookup active project IDs for a list of property IDs.
   */
  async findProjectIdsByPropertyIds(
    propertyIds: string[],
    manager?: EntityManager,
  ): Promise<Map<string, string>> {
    if (propertyIds.length === 0) {
      return new Map();
    }

    const rows = await (manager ?? this.repository.manager)
      .createQueryBuilder()
      .select('project.property_id', 'propertyId')
      .addSelect('project.id', 'projectId')
      .from('projects', 'project')
      .where('project.property_id IN (:...propertyIds)', { propertyIds })
      .andWhere('project.deleted_at IS NULL')
      .getRawMany<{ propertyId: string; projectId: string }>();

    return new Map(rows.map((row) => [row.propertyId, row.projectId]));
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
      qb.addSelect(['cv.systemSizeKw', 'cv.finalPrice']);
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

    if (query.fromDate) {
      qb.andWhere('property.created_at >= :fromDate', { fromDate: query.fromDate });
    }

    if (query.toDate) {
      // Backend already has a time component check pattern from customer profile repo.
      // For consistency we keep the T23:59:59.999Z append for date-only strings.
      const toDateStr = query.toDate.includes('T') ? query.toDate : `${query.toDate}T23:59:59.999Z`;
      qb.andWhere('property.created_at <= :toDate', { toDate: toDateStr });
    }

    if (query.quoteStatus !== undefined) {
      qb.andWhere('latestQuote.status = :quoteStatus', { quoteStatus: query.quoteStatus });
    }

    // Same wattage-preferred size the response DTO computes (see `findAll`'s
    // enrichment step) — filtering on the raw `systemSizeKw` column would
    // silently disagree with the value actually shown for the property.
    if (query.systemSizeMin !== undefined) {
      qb.andWhere(
        '(CASE WHEN cv.totalWattageWp > 0 THEN cv.totalWattageWp / 1000.0 ELSE cv.systemSizeKw END) >= :systemSizeMin',
        { systemSizeMin: query.systemSizeMin },
      );
    }

    if (query.systemSizeMax !== undefined) {
      qb.andWhere(
        '(CASE WHEN cv.totalWattageWp > 0 THEN cv.totalWattageWp / 1000.0 ELSE cv.systemSizeKw END) <= :systemSizeMax',
        { systemSizeMax: query.systemSizeMax },
      );
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
