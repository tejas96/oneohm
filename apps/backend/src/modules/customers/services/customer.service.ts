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

import { generateEntityCode } from '../../../common/utils/code-generator.util';
import { OrganizationRepository } from '../../organizations/repositories/organization.repository';
import { UserRepository } from '../../users/repositories/user.repository';
import { ProfileService } from '../../users/services/profile.service';
import { AvailabilityResponseDto } from '../dto/check-availability.dto';
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { CustomerQueryDto } from '../dto/customer-query.dto';
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
    private readonly organizationRepository: OrganizationRepository,
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

    // Step 4: Generate human-readable code (e.g. CUST-ONEOHM_EPC-2026-0001)
    try {
      const org = await this.organizationRepository.findOneById(organizationId);
      if (org) {
        const customerCode = await generateEntityCode(
          this.customerRepository.repository,
          'customerCode',
          'CUST',
          org.code,
          'customer_code',
        );
        await this.customerRepository.update(customer.id, { customerCode });
        customer.customerCode = customerCode;
      }
    } catch (err) {
      this.logger.warn(`Failed to generate customer code for ${customer.id}: ${String(err)}`);
    }

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
   * Find all customers for an organization with filters, sorting, and pagination
   * Supports both legacy signature (page, limit) and new query DTO
   *
   * @overload Legacy signature for backward compatibility
   * @overload New signature with CustomerQueryDto for full filtering
   */
  async findAll(
    organizationId: string,
    query: CustomerQueryDto,
  ): Promise<{ data: CustomerProfileEntity[]; total: number }>;
  async findAll(
    organizationId: string,
    page: number,
    limit: number,
  ): Promise<{ data: CustomerProfileEntity[]; total: number }>;
  async findAll(
    organizationId: string,
    pageOrQuery: number | CustomerQueryDto = 1,
    limit = 20,
  ): Promise<{ data: CustomerProfileEntity[]; total: number }> {
    // New query-based approach
    if (typeof pageOrQuery === 'object') {
      const [data, total] = await this.customerRepository.findWithFilters(
        organizationId,
        pageOrQuery,
      );
      return { data, total };
    }

    // Legacy approach - convert to query DTO
    const legacyQuery = new CustomerQueryDto();
    legacyQuery.page = pageOrQuery;
    legacyQuery.limit = limit;
    const [data, total] = await this.customerRepository.findWithFilters(
      organizationId,
      legacyQuery,
    );
    return { data, total };
  }

  /**
   * Find customers created by a specific user (for field workers)
   * Returns data in FindAllResponse format for consistency
   */
  async findByCreator(
    organizationId: string,
    createdBy: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: CustomerProfileEntity[]; total: number }> {
    const [data, total] = await this.customerRepository.findByCreatedBy(
      organizationId,
      createdBy,
      page,
      limit,
    );
    return { data, total };
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

  /**
   * Search customers by query string
   * Searches across name, phone, email, and city
   *
   * @param organizationId - Organization to search in
   * @param query - Search query string
   * @param createdBy - Optional: filter by creator ID (for field workers)
   * @param page - Page number
   * @param limit - Items per page
   */
  async search(
    organizationId: string,
    query: string,
    createdBy?: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: CustomerProfileEntity[]; total: number }> {
    this.logger.log(`Searching customers: query="${query}", org=${organizationId}`);

    // Return empty results for empty or very short queries
    if (!query || query.trim().length < 2) {
      return { data: [], total: 0 };
    }

    const [data, total] = await this.customerRepository.search(
      organizationId,
      query.trim(),
      createdBy,
      page,
      limit,
    );

    this.logger.log(`Search found ${total} results for query="${query}"`);
    return { data, total };
  }

  /**
   * Check if phone/email is already registered for a customer in this organization
   * Used to prevent duplicate customer creation in the lead wizard
   *
   * @param organizationId - Organization to check in
   * @param phone - Phone number to check (optional, with country code e.g. +919876543210)
   * @param email - Email to check (optional)
   * @param excludeCustomerId - Customer ID to exclude from check (for edit mode)
   * @throws BadRequestException if neither phone nor email is provided
   */
  async checkAvailability(
    organizationId: string,
    phone?: string,
    email?: string,
    excludeCustomerId?: string,
  ): Promise<AvailabilityResponseDto> {
    // Validate that at least one of phone or email is provided
    if (!phone && !email) {
      throw new BadRequestException('At least one of phone or email is required');
    }

    this.logger.log(
      `Checking availability: phone=${phone || 'N/A'}, email=${email || 'N/A'}, org=${organizationId}`,
    );

    const result: AvailabilityResponseDto = {
      phoneExists: false,
      emailExists: false,
    };

    // Check phone availability
    if (phone) {
      // Step 1: Find user by phone in the users table
      const user = await this.userRepository.findByPhone(phone);

      if (user) {
        // Step 2: Check if this user has a customer profile in this organization
        const existingProfile = await this.customerRepository.findByUserAndOrganization(
          user.id,
          organizationId,
        );

        // Phone exists if profile found AND it's not the excluded customer (edit mode)
        if (existingProfile && existingProfile.id !== excludeCustomerId) {
          result.phoneExists = true;
          result.phoneError = 'This phone number is already registered';
          this.logger.log(`Phone ${phone} already exists for customer ${existingProfile.id}`);
        }
      }
    }

    // Check email availability
    if (email) {
      const existingByEmail = await this.customerRepository.findByEmail(organizationId, email);

      // Email exists if found AND it's not the excluded customer (edit mode)
      if (existingByEmail && existingByEmail.id !== excludeCustomerId) {
        result.emailExists = true;
        result.emailError = 'This email is already registered';
        this.logger.log(`Email ${email} already exists for customer ${existingByEmail.id}`);
      }
    }

    return result;
  }
}
