import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CustomerStatus } from '@oneohm-epc/shared-types';

import { CreateCustomerDto } from '../dto/create-customer.dto';
import { UpdateCustomerDto } from '../dto/update-customer.dto';
import { CustomerEntity } from '../entities/customer.entity';
import { CustomerRepository } from '../repositories/customer.repository';

/**
 * Customer Service
 * Business logic for customer management
 */
@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(private readonly customerRepository: CustomerRepository) {}

  /**
   * Create a new customer
   */
  async create(
    organizationId: string,
    createDto: CreateCustomerDto,
    createdBy?: string,
  ): Promise<CustomerEntity> {
    this.logger.log(`Creating customer: ${createDto.firstName} ${createDto.lastName ?? ''}`);

    // Check if phone already exists for this organization
    const existingByPhone = await this.customerRepository.findByPhone(
      organizationId,
      createDto.phone,
    );
    if (existingByPhone.length > 0) {
      this.logger.warn(`Customer with phone ${createDto.phone} already exists`);
      // Note: Not throwing error as multiple customers can share a phone
      // but logging for awareness
    }

    // Check if email already exists (if provided)
    if (createDto.email) {
      const existingByEmail = await this.customerRepository.findByEmail(
        organizationId,
        createDto.email,
      );
      if (existingByEmail) {
        throw new ConflictException(`Customer with email '${createDto.email}' already exists`);
      }
    }

    // Check if consumer number already exists (if provided)
    if (createDto.consumerNumber) {
      const existingByConsumerNumber = await this.customerRepository.findByConsumerNumber(
        organizationId,
        createDto.consumerNumber,
      );
      if (existingByConsumerNumber) {
        throw new ConflictException(
          `Customer with consumer number '${createDto.consumerNumber}' already exists`,
        );
      }
    }

    const customer = await this.customerRepository.create({
      ...createDto,
      organizationId,
      createdBy,
      updatedBy: createdBy,
    });

    this.logger.log(`Customer created successfully: ${customer.id}`);
    return customer;
  }

  /**
   * Find customer by ID
   */
  async findById(id: string, organizationId: string): Promise<CustomerEntity> {
    const customer = await this.customerRepository.findById(id);

    if (customer?.organizationId !== organizationId) {
      throw new NotFoundException(`Customer with ID '${id}' not found`);
    }

    return customer;
  }

  /**
   * Find all customers for an organization
   */
  async findAll(organizationId: string): Promise<CustomerEntity[]> {
    return this.customerRepository.findAll(organizationId);
  }

  /**
   * Update customer
   */
  async update(
    id: string,
    organizationId: string,
    updateDto: UpdateCustomerDto,
    updatedBy?: string,
  ): Promise<CustomerEntity> {
    this.logger.log(`Updating customer: ${id}`);

    // Verify customer exists and belongs to organization
    await this.findById(id, organizationId);

    // Check for email conflicts (if email is being updated)
    if (updateDto.email) {
      const existingByEmail = await this.customerRepository.findByEmail(
        organizationId,
        updateDto.email,
      );
      if (existingByEmail && existingByEmail.id !== id) {
        throw new ConflictException(`Customer with email '${updateDto.email}' already exists`);
      }
    }

    // Check for consumer number conflicts (if being updated)
    if (updateDto.consumerNumber) {
      const existingByConsumerNumber = await this.customerRepository.findByConsumerNumber(
        organizationId,
        updateDto.consumerNumber,
      );
      if (existingByConsumerNumber && existingByConsumerNumber.id !== id) {
        throw new ConflictException(
          `Customer with consumer number '${updateDto.consumerNumber}' already exists`,
        );
      }
    }

    const updated = await this.customerRepository.update(id, {
      ...updateDto,
      updatedBy,
    });

    this.logger.log(`Customer updated successfully: ${id}`);
    return updated;
  }

  /**
   * Update customer status (generic status management)
   */
  async updateStatus(
    id: string,
    organizationId: string,
    newStatus: CustomerStatus,
    updatedBy?: string,
  ): Promise<CustomerEntity> {
    this.logger.log(`Updating customer ${id} status to: ${newStatus}`);

    const customer = await this.findById(id, organizationId);

    if (customer.status === newStatus) {
      throw new BadRequestException(`Customer is already in '${newStatus}' status`);
    }

    const updated = await this.customerRepository.update(id, {
      status: newStatus,
      updatedBy,
    });

    this.logger.log(`Customer status updated successfully: ${id} -> ${newStatus}`);
    return updated;
  }

  /**
   * Delete customer (soft delete)
   */
  async delete(id: string, organizationId: string): Promise<void> {
    this.logger.log(`Deleting customer: ${id}`);

    // Verify customer exists and belongs to organization
    await this.findById(id, organizationId);

    await this.customerRepository.softDelete(id);

    this.logger.log(`Customer deleted successfully: ${id}`);
  }

  /**
   * Get customer statistics by status
   */
  async getStatusStatistics(organizationId: string): Promise<Record<string, number>> {
    const statuses = Object.values(CustomerStatus);
    const stats: Record<string, number> = {};

    for (const status of statuses) {
      stats[status] = await this.customerRepository.countByStatus(organizationId, status);
    }

    return stats;
  }
}
