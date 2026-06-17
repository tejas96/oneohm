import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { CustomerStatus, UserProfileType, UserStatus } from '@tejas96/shared/types';
import { normalizePhoneToE164 } from '@tejas96/shared/utils';

import { generateEntityCode } from '../../../common/utils/code-generator.util';
import { EmployeeProfileRepository } from '../../employees/repositories/employee-profile.repository';
import { OrganizationRepository } from '../../organizations/repositories/organization.repository';
import { UserRepository } from '../../users/repositories/user.repository';
import { ProfileService } from '../../users/services/profile.service';
import { AvailabilityResponseDto } from '../dto/check-availability.dto';
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { CustomerQueryDto } from '../dto/customer-query.dto';
import { UpdateCustomerDto } from '../dto/update-customer.dto';
import { CustomerProfileEntity } from '../entities/customer-profile.entity';
import { CustomerProfileRepository } from '../repositories/customer-profile.repository';

/** Normalize email to lowercase, trimmed. Returns undefined for empty/whitespace-only input. */
function normalizeEmail(raw: string): string | undefined {
  const trimmed = raw.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : undefined;
}

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
    private readonly employeeProfileRepository: EmployeeProfileRepository,
  ) {}

  /**
   * Create a new customer profile
   * Normalizes phone/email, finds-or-creates a users row, then creates the customer_profile.
   */
  async create(
    organizationId: string,
    createDto: CreateCustomerDto,
    createdBy?: string,
  ): Promise<CustomerProfileEntity> {
    const phone = normalizePhoneToE164(createDto.phone);
    const email = createDto.email ? normalizeEmail(createDto.email) : undefined;

    this.logger.log(`Creating customer profile: phone=${phone}, email=${email ?? 'N/A'}`);

    // Step 1: Check for duplicates within this organization
    await this.guardOrgDuplicates(organizationId, phone, email);

    // Step 2: Find or create user by phone (for login capability)
    const user = await this.findOrCreateUser(phone, email, createDto);

    // Step 3: Guard against duplicate profile for same user+org
    const existingProfile = await this.customerRepository.findByUserAndOrganization(
      user.id,
      organizationId,
    );
    if (existingProfile) {
      throw new ConflictException('Customer profile already exists for this user in organization');
    }

    // Step 4: Create customer profile using ProfileService (handles role assignment)
    const customer = (await this.profileService.createProfile({
      userId: user.id,
      organizationId,
      profileType: UserProfileType.CUSTOMER,
      profileData: {
        ...createDto,
        phone,
        email,
        firstName: createDto.firstName || user.firstName || 'Unknown',
        lastName: createDto.lastName || user.lastName,
        status: createDto.status || CustomerStatus.ACTIVE,
      },
      createdBy,
    })) as CustomerProfileEntity;

    // Step 5: Generate human-readable code
    await this.assignCustomerCode(customer, organizationId);

    // Step 6: Resolve group assignment (best-effort — does not roll back the customer on error)
    try {
      await this.resolveGroupAssignment(
        customer,
        organizationId,
        createDto.groupCode,
        createDto.groupName,
      );
    } catch (err: unknown) {
      this.logger.warn(`Group assignment failed for customer ${customer.id}: ${String(err)}`);
      // Customer is already persisted; surface the error so the caller can retry assignment
      throw err;
    }

    this.logger.log(`Customer profile created: ${customer.id}`);
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
   * Normalizes phone/email and checks for org-scoped conflicts before saving.
   */
  async update(
    id: string,
    organizationId: string,
    updateDto: UpdateCustomerDto,
    updatedBy?: string,
  ): Promise<CustomerProfileEntity> {
    this.logger.log(`Updating customer: ${id}`);

    await this.findById(id, organizationId);

    // Normalize email: null = explicit clear (→ null in DB), string = normalize, undefined = skip
    if (updateDto.email === null) {
      // Explicit clear — keep as null so TypeORM writes NULL to the column
    } else if (updateDto.email !== undefined) {
      const normalized = normalizeEmail(updateDto.email);
      // Empty string after normalization also becomes null (clear intent)
      updateDto.email = normalized ?? null;
    }

    // Normalize phone: undefined = skip update
    if (updateDto.phone !== undefined) {
      const normalizedPhone = normalizePhoneToE164(updateDto.phone);
      updateDto.phone = normalizedPhone.length > 0 ? normalizedPhone : undefined;
    }

    // Normalize alternatePhone: null = explicit clear
    if (updateDto.alternatePhone === null) {
      // Keep as null — TypeORM will write NULL to the column
    } else if (updateDto.alternatePhone !== undefined) {
      const normalized = normalizePhoneToE164(updateDto.alternatePhone);
      updateDto.alternatePhone = normalized.length > 0 ? normalized : null;
    }

    // Check for email conflicts within this org (exclude self)
    if (updateDto.email) {
      const existingByEmail = await this.customerRepository.findByEmail(
        organizationId,
        updateDto.email,
      );
      if (existingByEmail && existingByEmail.id !== id) {
        throw new ConflictException(
          `Customer with email '${updateDto.email}' already exists in this organization`,
        );
      }
    }

    // Check for phone conflicts within this org (exclude self)
    if (updateDto.phone) {
      const existingByPhone = await this.customerRepository.findOneByPhone(
        organizationId,
        updateDto.phone,
      );
      if (existingByPhone && existingByPhone.id !== id) {
        throw new ConflictException(
          `Customer with phone '${updateDto.phone}' already exists in this organization`,
        );
      }
    }

    // Strip group fields from the base update — group assignment is handled below
    // to ensure validation (code exists) happens before any DB write
    const {
      groupCode: groupCodeToStrip,
      groupName: groupNameToStrip,
      ...profileUpdateFields
    } = updateDto;
    void groupCodeToStrip;
    void groupNameToStrip;

    const updated = await this.customerRepository.update(id, {
      ...(profileUpdateFields as Partial<CustomerProfileEntity>),
      updatedBy,
    });

    if (!updated) {
      throw new NotFoundException(`Customer with ID '${id}' not found`);
    }

    // Sync names to the core user record
    if (profileUpdateFields.firstName !== undefined || profileUpdateFields.lastName !== undefined) {
      await this.profileService.updateUserBasicInfo(updated.userId, {
        firstName: profileUpdateFields.firstName,
        lastName: profileUpdateFields.lastName,
      });
    }

    // Resolve group assignment if group fields were provided in update
    if (updateDto.groupCode !== undefined || updateDto.groupName !== undefined) {
      // Treat empty strings the same as null for group clearing
      const resolvedCode = updateDto.groupCode === '' ? null : updateDto.groupCode;
      const resolvedName = updateDto.groupName === '' ? null : updateDto.groupName;
      await this.resolveGroupAssignment(updated, organizationId, resolvedCode, resolvedName);
      // Re-fetch after group update to return accurate state
      const refreshed = await this.customerRepository.findById(id);
      if (refreshed) return refreshed;
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
   * Check if phone/email is already registered for a customer in this organization.
   * Queries customer_profiles (org-scoped). Normalizes phone (E.164) and email (lowercase).
   */
  async checkAvailability(
    organizationId: string,
    phone?: string,
    email?: string,
    excludeCustomerId?: string,
  ): Promise<AvailabilityResponseDto> {
    if (!phone && !email) {
      throw new BadRequestException('At least one of phone or email is required');
    }

    const normalizedPhone = phone ? normalizePhoneToE164(phone) : undefined;
    const normalizedEmail = email ? normalizeEmail(email) : undefined;

    this.logger.log(
      `Checking availability: phone=${normalizedPhone ?? 'N/A'}, email=${normalizedEmail ?? 'N/A'}, org=${organizationId}`,
    );

    const result: AvailabilityResponseDto = {
      phoneExists: false,
      emailExists: false,
    };

    if (normalizedPhone) {
      const existingByPhone = await this.customerRepository.findOneByPhone(
        organizationId,
        normalizedPhone,
      );
      if (existingByPhone && existingByPhone.id !== excludeCustomerId) {
        result.phoneExists = true;
        result.phoneError = 'This phone number is already registered';
      }
    }

    if (normalizedEmail) {
      const existingByEmail = await this.customerRepository.findByEmail(
        organizationId,
        normalizedEmail,
      );
      if (existingByEmail && existingByEmail.id !== excludeCustomerId) {
        result.emailExists = true;
        result.emailError = 'This email is already registered';
      }
    }

    return result;
  }

  /**
   * Assign or unassign a customer to a user (field worker).
   * Pass assigneeId as a valid user UUID to assign, or null to unassign.
   *
   * Validations when assigning:
   * - Assignee user must exist
   * - Assignee must have an active employee profile in the same organization
   */
  async assignCustomer(
    id: string,
    organizationId: string,
    assigneeId: string | null,
    updatedBy?: string,
  ): Promise<CustomerProfileEntity> {
    this.logger.log(`Assigning customer ${id} to user ${assigneeId ?? 'null (unassign)'}`);

    await this.findById(id, organizationId);

    if (assigneeId !== null) {
      // Validate assignee user exists
      const assigneeUser = await this.userRepository.findById(assigneeId);
      if (!assigneeUser) {
        throw new NotFoundException(`User with ID '${assigneeId}' not found`);
      }

      // Validate assignee has an employee profile in the same organization (cross-org guard)
      const employeeProfile = await this.employeeProfileRepository.findByUserAndOrganization(
        assigneeId,
        organizationId,
      );
      if (!employeeProfile) {
        throw new BadRequestException(`User '${assigneeId}' does not belong to this organization`);
      }

      // Validate assignee is active
      if (employeeProfile.status !== UserStatus.ACTIVE) {
        throw new BadRequestException(`Cannot assign to inactive user '${assigneeId}'`);
      }
    }

    const updated = await this.customerRepository.update(id, {
      // Must use null explicitly so TypeORM sets the column to NULL (undefined = skip field)
      assigneeId: assigneeId === null ? null : assigneeId,
      updatedBy,
    } as Partial<CustomerProfileEntity>);

    if (!updated) {
      throw new NotFoundException(`Customer with ID '${id}' not found`);
    }

    this.logger.log(`Customer ${id} assigned to ${assigneeId ?? 'null'} successfully`);
    return updated;
  }

  // ==================== PRIVATE HELPERS ====================

  /** Guard against duplicate phone/email within an org's customer_profiles */
  private async guardOrgDuplicates(
    organizationId: string,
    phone: string,
    email?: string,
  ): Promise<void> {
    const existingByPhone = await this.customerRepository.findOneByPhone(organizationId, phone);
    if (existingByPhone) {
      throw new ConflictException(
        `A customer with phone '${phone}' already exists in this organization`,
      );
    }

    if (email) {
      const existingByEmail = await this.customerRepository.findByEmail(organizationId, email);
      if (existingByEmail) {
        throw new ConflictException(
          `A customer with email '${email}' already exists in this organization`,
        );
      }
    }
  }

  /** Find existing user by phone or create a new one. Handles email uniqueness in users table. */
  private async findOrCreateUser(
    phone: string,
    email: string | undefined,
    dto: CreateCustomerDto,
  ): Promise<{ id: string; firstName: string; lastName?: string }> {
    const existing = await this.userRepository.findByPhone(phone);
    if (existing) {
      this.logger.log(`Found existing user: ${existing.id}`);
      return existing;
    }

    // Determine if we can attach email to the new user entry
    let userEmail: string | undefined;
    if (email) {
      const emailTaken = await this.userRepository.findByEmail(email);
      if (emailTaken) {
        this.logger.warn(
          `Email '${email}' already taken in users table by user ${emailTaken.id}. Creating user with phone only.`,
        );
      } else {
        userEmail = email;
      }
    }

    const user = await this.userRepository.create({
      phone,
      email: userEmail,
      firstName: dto.firstName || '',
      lastName: dto.lastName,
      profileCompleted: false,
      status: UserStatus.ACTIVE,
    });

    this.logger.log(`User created: ${user.id}`);
    return user;
  }

  /**
   * Returns distinct customer groups for an organization.
   * Used by the GET /customers/groups endpoint.
   */
  async getDistinctGroups(
    organizationId: string,
  ): Promise<{ groupCode: string; groupName: string }[]> {
    return this.customerRepository.findDistinctGroups(organizationId);
  }

  /** Generate and assign a human-readable customer code (non-fatal on failure) */
  private async assignCustomerCode(
    customer: CustomerProfileEntity,
    organizationId: string,
  ): Promise<void> {
    try {
      const org = await this.organizationRepository.findOneById(organizationId);
      if (!org) return;

      const customerCode = await generateEntityCode(
        this.customerRepository.repository,
        'customerCode',
        'CUST',
        org.code,
        'customer_code',
      );
      await this.customerRepository.update(customer.id, { customerCode });
      customer.customerCode = customerCode;
    } catch (err: unknown) {
      this.logger.warn(`Failed to generate customer code for ${customer.id}: ${String(err)}`);
    }
  }

  /**
   * Resolves group assignment for a customer.
   * - If both groupCode and groupName are null/undefined: no group change
   * - If groupCode is provided: validates it exists in the org, then assigns
   * - If only groupName is provided (no groupCode): generates a new group code
   * - If both are explicitly null: removes the customer from any group
   */
  private async resolveGroupAssignment(
    customer: CustomerProfileEntity,
    organizationId: string,
    groupCode?: string | null,
    groupName?: string | null,
  ): Promise<void> {
    // Explicit null/empty means remove from group
    if (groupCode === null && groupName === null) {
      await this.customerRepository.update(customer.id, {
        groupCode: null,
        groupName: null,
      } as unknown as Partial<CustomerProfileEntity>);
      customer.groupCode = undefined;
      customer.groupName = undefined;
      return;
    }

    // Neither field provided — nothing to do
    if (groupCode === undefined && groupName === undefined) return;

    if (groupCode) {
      // Joining an existing group: validate it exists
      const exists = await this.customerRepository.groupCodeExists(organizationId, groupCode);
      if (!exists) {
        throw new BadRequestException(
          `Group code '${groupCode}' does not exist in this organization`,
        );
      }
      await this.customerRepository.update(customer.id, {
        groupCode,
        groupName: groupName ?? undefined,
      });
      customer.groupCode = groupCode;
      customer.groupName = groupName ?? undefined;
    } else if (groupName) {
      // Creating a new group: generate a code
      const newGroupCode = await this.customerRepository.generateGroupCode(organizationId);
      await this.customerRepository.update(customer.id, {
        groupCode: newGroupCode,
        groupName,
      });
      customer.groupCode = newGroupCode;
      customer.groupName = groupName;
    }
  }
}
