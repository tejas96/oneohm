import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LeadTemperature } from '@oneohm-epc/shared-types';
import { IsNull, Repository } from 'typeorm';

import { CustomerPropertyEntity } from '../entities/customer-property.entity';

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
      relations: ['customer'],
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
