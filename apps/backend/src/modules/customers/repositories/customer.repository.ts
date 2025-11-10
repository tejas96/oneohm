import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CustomerStatus } from '@oneohm-epc/shared-types';
import { Repository } from 'typeorm';

import { CustomerEntity } from '../entities/customer.entity';

/**
 * Customer Repository
 * Handles database operations for customers
 */
@Injectable()
export class CustomerRepository {
  constructor(
    @InjectRepository(CustomerEntity)
    private readonly repository: Repository<CustomerEntity>,
  ) {}

  /**
   * Create a new customer
   */
  async create(data: Partial<CustomerEntity>): Promise<CustomerEntity> {
    const customer = this.repository.create(data);
    return this.repository.save(customer);
  }

  /**
   * Find customer by ID (excluding soft-deleted records)
   */
  async findById(id: string): Promise<CustomerEntity | null> {
    return this.repository.findOne({
      where: { id },
    });
  }

  /**
   * Find all customers for an organization (excluding soft-deleted records)
   */
  async findAll(organizationId: string): Promise<CustomerEntity[]> {
    return this.repository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find customers by phone
   */
  async findByPhone(organizationId: string, phone: string): Promise<CustomerEntity[]> {
    return this.repository.find({
      where: { organizationId, phone },
    });
  }

  /**
   * Find customer by email
   */
  async findByEmail(organizationId: string, email: string): Promise<CustomerEntity | null> {
    return this.repository.findOne({
      where: { organizationId, email },
    });
  }

  /**
   * Find customer by consumer number
   */
  async findByConsumerNumber(
    organizationId: string,
    consumerNumber: string,
  ): Promise<CustomerEntity | null> {
    return this.repository.findOne({
      where: { organizationId, consumerNumber },
    });
  }

  /**
   * Update customer
   */
  async update(id: string, data: Partial<CustomerEntity>): Promise<CustomerEntity> {
    await this.repository.update(id, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Customer not found after update');
    }
    return updated;
  }

  /**
   * Soft delete customer
   */
  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }

  /**
   * Count customers by status for an organization
   */
  async countByStatus(organizationId: string, status: CustomerStatus): Promise<number> {
    return this.repository.count({
      where: { organizationId, status },
    });
  }
}
