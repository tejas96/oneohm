import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { CustomerStatus, UserProfileType, UserStatus } from '@oneohm-epc/shared-types';

import { UserRepository } from '../../users/repositories/user.repository';
import { ProfileService } from '../../users/services/profile.service';
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { UpdateCustomerDto } from '../dto/update-customer.dto';
import { CustomerProfileEntity } from '../entities/customer-profile.entity';
import { CustomerProfileRepository } from '../repositories/customer-profile.repository';

/**
 * Customer Service
 * Business logic for customer profile management
 */
@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(
    private readonly customerRepository: CustomerProfileRepository,
    @Inject(forwardRef(() => ProfileService))
    private readonly profileService: ProfileService,
    @Inject(forwardRef(() => UserRepository))
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * Create a new customer profile
   * Automatically creates or finds user and assigns customer role
   */
  async create(
    organizationId: string,
    createDto: CreateCustomerDto,
    createdBy?: string,
  ): Promise<CustomerProfileEntity> {
    this.logger.log(`Creating customer profile: ${createDto.phone}`);

    // Step 1: Find or create user by phone
    let user = await this.userRepository.findByPhone(createDto.phone);

    if (!user) {
      this.logger.log(`Creating new user for phone: ${createDto.phone}`);
      user = await this.userRepository.create({
        phone: createDto.phone,
        email: createDto.email,
        firstName: createDto.firstName || '',
        lastName: createDto.lastName,
        profileCompleted: false,
        status: UserStatus.ACTIVE,
      });
      this.logger.log(`User created: ${user.id}`);
    } else {
      this.logger.log(`Found existing user: ${user.id}`);
    }

    // Step 2: Check if profile already exists for this user in this org
    const existingProfile = await this.customerRepository.findByUserAndOrganization(
      user.id,
      organizationId,
    );

    if (existingProfile) {
      throw new ConflictException(`Customer profile already exists for this user in organization`);
    }

    // Step 3: Create customer profile using ProfileService (handles role assignment)
    // Include firstName and lastName in profileData (required by customer_profiles table)
    const customer = (await this.profileService.createProfile({
      userId: user.id,
      organizationId,
      profileType: UserProfileType.CUSTOMER,
      profileData: {
        ...createDto,
        firstName: createDto.firstName || user.firstName || 'Unknown',
        lastName: createDto.lastName || user.lastName,
        status: createDto.status || CustomerStatus.ACTIVE,
      },
      createdBy,
    })) as CustomerProfileEntity;

    this.logger.log(`✅ Customer profile created with auto-assigned role: ${customer.id}`);
    return customer;
  }

  /**
   * Find customer by ID
   */
  async findById(id: string, organizationId: string): Promise<CustomerProfileEntity> {
    const customer = await this.customerRepository.findById(id);

    if (customer?.organizationId !== organizationId) {
      throw new NotFoundException(`Customer with ID '${id}' not found`);
    }

    return customer;
  }

  /**
   * Find all customers for an organization
   */
  async findAll(organizationId: string): Promise<CustomerProfileEntity[]> {
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
  ): Promise<CustomerProfileEntity> {
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

    // Note: Consumer number is now on CustomerPropertyEntity
    // Use CustomerPropertyRepository for consumer number operations

    const updated = await this.customerRepository.update(id, {
      ...updateDto,
      updatedBy,
    });

    if (!updated) {
      throw new NotFoundException(`Customer with ID '${id}' not found`);
    }

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
  ): Promise<CustomerProfileEntity> {
    this.logger.log(`Updating customer ${id} status to: ${newStatus}`);

    const customer = await this.findById(id, organizationId);

    if (customer.status === newStatus) {
      throw new BadRequestException(`Customer is already in '${newStatus}' status`);
    }

    const updated = await this.customerRepository.update(id, {
      status: newStatus,
      updatedBy,
    });

    if (!updated) {
      throw new NotFoundException(`Customer with ID '${id}' not found`);
    }

    this.logger.log(`Customer status updated successfully: ${id} -> ${newStatus}`);
    return updated;
  }

  /**
   * Delete customer (soft delete)
   */
  async delete(id: string, organizationId: string, deletedBy?: string): Promise<void> {
    this.logger.log(`Deleting customer: ${id}`);

    // Verify customer exists and belongs to organization
    await this.findById(id, organizationId);

    await this.customerRepository.softDelete(id, deletedBy);

    this.logger.log(`Customer deleted successfully: ${id}`);
  }

  /**
   * Get customer statistics by status (optimized single query)
   */
  async getStatusStatistics(organizationId: string): Promise<Record<string, number>> {
    const stats = await this.customerRepository.getStatusStats(organizationId);

    // Initialize all statuses with 0
    const result: Record<string, number> = {
      [CustomerStatus.LEAD]: 0,
      [CustomerStatus.PROSPECT]: 0,
      [CustomerStatus.ACTIVE]: 0,
      [CustomerStatus.INACTIVE]: 0,
    };

    // Fill in actual counts from the single grouped query
    for (const stat of stats) {
      result[stat.status] = stat.count;
    }

    return result;
  }
}
