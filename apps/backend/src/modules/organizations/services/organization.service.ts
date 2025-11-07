import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { OrganizationStatus } from '@oneohm-epc/shared-types';

import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { UpdateOrganizationDto } from '../dto/update-organization.dto';
import { OrganizationEntity } from '../entities/organization.entity';
import { OrganizationRepository } from '../repositories/organization.repository';

/**
 * Organization Service
 * Business logic for organization management
 */
@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(private readonly organizationRepository: OrganizationRepository) {}

  /**
   * Create a new organization
   * @param createDto - Organization creation data
   * @param createdBy - User ID who is creating the organization
   * @returns Created organization
   */
  async create(createDto: CreateOrganizationDto, createdBy?: string): Promise<OrganizationEntity> {
    this.logger.log(`Creating organization with code: ${createDto.code}`);

    // TODO: Add business validation rules
    // - Check if user has permission to create organizations
    // - Validate organization code against business rules
    // - Check subscription limits

    // Check if organization code already exists
    const existingOrg = await this.organizationRepository.findOneByCode(createDto.code);
    if (existingOrg) {
      throw new ConflictException(`Organization with code '${createDto.code}' already exists`);
    }

    const organization = await this.organizationRepository.create({
      ...createDto,
      createdBy,
      updatedBy: createdBy,
    } as CreateOrganizationDto);

    this.logger.log(`Organization created successfully: ${organization.id}`);

    // TODO: Trigger events/notifications
    // - Send welcome email
    // - Create default settings
    // - Initialize organization resources

    return organization;
  }

  /**
   * Find organization by ID
   * @param id - Organization UUID
   * @returns Organization entity
   * @throws NotFoundException if organization not found
   */
  async findById(id: string): Promise<OrganizationEntity> {
    const organization = await this.organizationRepository.findOneById(id);

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    return organization;
  }

  /**
   * Find organization by code
   * @param code - Organization code
   * @returns Organization entity
   * @throws NotFoundException if organization not found
   */
  async findByCode(code: string): Promise<OrganizationEntity> {
    const organization = await this.organizationRepository.findOneByCode(code);

    if (!organization) {
      throw new NotFoundException(`Organization with code '${code}' not found`);
    }

    return organization;
  }

  /**
   * Find all organizations with pagination and filters
   * @param params - Query parameters
   * @returns Paginated list of organizations
   */
  async findAll(params: {
    limit?: number;
    offset?: number;
    status?: OrganizationStatus;
  }): Promise<{ items: OrganizationEntity[]; total: number; page: number; limit: number }> {
    const { limit = 10, offset = 0, status } = params;

    // TODO: Add business logic
    // - Filter by user permissions
    // - Add search/sort capabilities
    // - Apply organization-level filters

    const { items, total } = await this.organizationRepository.findAll({
      limit,
      offset,
      status,
    });

    return {
      items,
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
    };
  }

  /**
   * Update organization by ID
   * @param id - Organization UUID
   * @param updateDto - Update data
   * @param updatedBy - User ID who is updating
   * @returns Updated organization
   */
  async update(
    id: string,
    updateDto: UpdateOrganizationDto,
    updatedBy?: string,
  ): Promise<OrganizationEntity> {
    this.logger.log(`Updating organization: ${id}`);

    // TODO: Add business validation rules
    // - Check if user has permission to update this organization
    // - Validate changes against business rules
    // - Check if status change is allowed

    // If code is being updated, check for conflicts
    if (updateDto.code) {
      const existingOrg = await this.organizationRepository.findOneByCode(updateDto.code);
      if (existingOrg && existingOrg.id !== id) {
        throw new ConflictException(`Organization with code '${updateDto.code}' already exists`);
      }
    }

    const organization = await this.organizationRepository.update(id, {
      ...updateDto,
      updatedBy,
    } as UpdateOrganizationDto);

    this.logger.log(`Organization updated successfully: ${id}`);

    // TODO: Trigger events/notifications
    // - Notify organization members of changes
    // - Update related resources if needed

    return organization;
  }

  /**
   * Soft delete organization by ID
   * @param id - Organization UUID
   * @param deletedBy - User ID who is deleting
   */
  async delete(id: string, _deletedBy?: string): Promise<void> {
    this.logger.log(`Deleting organization: ${id}`);

    // TODO: Add business validation rules
    // - Check if user has permission to delete this organization
    // - Check if organization has active projects/users
    // - Prevent deletion if there are dependencies

    const organization = await this.findById(id);

    // Prevent deletion of active organizations without confirmation
    if (organization.status === OrganizationStatus.ACTIVE) {
      throw new BadRequestException(
        'Cannot delete an active organization. Please deactivate it first.',
      );
    }

    await this.organizationRepository.delete(id);

    this.logger.log(`Organization deleted successfully: ${id}`);

    // TODO: Trigger cleanup/notifications
    // - Archive related data
    // - Notify stakeholders
    // - Clean up resources
  }

  /**
   * Activate organization
   * @param id - Organization UUID
   * @param updatedBy - User ID performing the action
   * @returns Updated organization
   */
  async activate(id: string, updatedBy?: string): Promise<OrganizationEntity> {
    this.logger.log(`Activating organization: ${id}`);

    // TODO: Add business rules for activation
    // - Check subscription status
    // - Verify payment information
    // - Check compliance requirements

    return this.update(id, { status: OrganizationStatus.ACTIVE }, updatedBy);
  }

  /**
   * Deactivate organization
   * @param id - Organization UUID
   * @param updatedBy - User ID performing the action
   * @returns Updated organization
   */
  async deactivate(id: string, updatedBy?: string): Promise<OrganizationEntity> {
    this.logger.log(`Deactivating organization: ${id}`);

    // TODO: Add business rules for deactivation
    // - Complete ongoing projects
    // - Notify users
    // - Handle data archival

    return this.update(id, { status: OrganizationStatus.INACTIVE }, updatedBy);
  }

  /**
   * Suspend organization
   * @param id - Organization UUID
   * @param updatedBy - User ID performing the action
   * @returns Updated organization
   */
  async suspend(id: string, updatedBy?: string): Promise<OrganizationEntity> {
    this.logger.log(`Suspending organization: ${id}`);

    // TODO: Add business rules for suspension
    // - Check payment issues
    // - Enforce compliance
    // - Block access to resources

    return this.update(id, { status: OrganizationStatus.SUSPENDED }, updatedBy);
  }
}
