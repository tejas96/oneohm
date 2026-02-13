import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  FollowupPriority,
  FollowupStatus,
  LeadTemperature,
  LoanStatus,
  type PropertyDocument,
  type PropertyFollowup,
  PropertyStatus,
  QuoteStatus,
} from '@oneohm-epc/shared-types';

import { LoanApplicationRepository } from '../../loan-finance/repositories/loan-application.repository';
import { QuoteRepository } from '../../quotes/repositories/quote.repository';
import { CreateCustomerPropertyDto } from '../dto/create-customer-property.dto';
import type { PropertyDocumentDto } from '../dto/property-document.dto';
import type { PropertyFollowupDto } from '../dto/property-followup.dto';
import { UpdateCustomerPropertyDto } from '../dto/update-customer-property.dto';
import { CustomerPropertyEntity } from '../entities/customer-property.entity';
import { CustomerProfileRepository } from '../repositories/customer-profile.repository';
import { CustomerPropertyRepository } from '../repositories/customer-property.repository';

/**
 * Extended type for properties with quote info
 */
type PropertyWithQuoteInfo = CustomerPropertyEntity & {
  latestQuoteNumber?: string;
  latestQuoteStatus?: QuoteStatus;
  latestQuoteDate?: Date;
};

/**
 * Customer Property Service
 * Business logic for customer property (installation site) management
 */
@Injectable()
export class CustomerPropertyService {
  private readonly logger = new Logger(CustomerPropertyService.name);

  constructor(
    private readonly propertyRepository: CustomerPropertyRepository,
    private readonly customerRepository: CustomerProfileRepository,
    private readonly quoteRepository: QuoteRepository,
    private readonly loanApplicationRepository: LoanApplicationRepository,
  ) {}

  /**
   * Normalize documents from DTO to entity format
   * Applies default values for optional fields
   */
  private normalizeDocuments(documents?: PropertyDocumentDto[]): PropertyDocument[] | undefined {
    if (!documents) return undefined;
    return documents.map((doc) => ({
      url: doc.url,
      tag: doc.tag,
      fileName: doc.fileName,
      isLoanDoc: doc.isLoanDoc ?? false,
      isVerified: doc.isVerified ?? false,
      verifiedAt: doc.verifiedAt,
      verifiedBy: doc.verifiedBy,
    }));
  }

  /**
   * Create a new customer property
   */
  async create(
    organizationId: string,
    createDto: CreateCustomerPropertyDto,
    createdBy?: string,
  ): Promise<CustomerPropertyEntity> {
    this.logger.log(`Creating property for customer: ${createDto.customerId}`);

    // Verify customer exists and belongs to organization
    const customer = await this.customerRepository.findById(createDto.customerId);
    if (customer?.organizationId !== organizationId) {
      throw new NotFoundException(`Customer with ID '${createDto.customerId}' not found`);
    }

    // Check for consumer number conflicts (if provided)
    if (createDto.consumerNumber) {
      const existingByConsumerNumber = await this.propertyRepository.findByConsumerNumber(
        organizationId,
        createDto.consumerNumber,
      );
      if (existingByConsumerNumber) {
        throw new ConflictException(
          `Property with consumer number '${createDto.consumerNumber}' already exists`,
        );
      }
    }

    // Check if this is the first property for the customer - make it primary
    const existingProperties = await this.propertyRepository.countByCustomer(createDto.customerId);
    const isPrimary = createDto.isPrimary ?? existingProperties === 0;

    // Normalize documents to ensure required fields have defaults
    const { documents, followups, ...restCreateDto } = createDto;

    const property = await this.propertyRepository.create({
      ...restCreateDto,
      documents: this.normalizeDocuments(documents),
      followups: followups ? this.normalizeFollowups(followups) : [],
      organizationId,
      isPrimary,
      status: createDto.status || PropertyStatus.ACTIVE,
      createdBy,
    });

    // If this property is primary, unset other properties
    if (isPrimary && existingProperties > 0) {
      await this.propertyRepository.setPrimary(property.id, createDto.customerId);
    }

    this.logger.log(`✅ Property created: ${property.id}`);
    return property;
  }

  /**
   * Find property by ID
   */
  async findById(id: string, organizationId: string): Promise<CustomerPropertyEntity> {
    const property = await this.propertyRepository.findByIdAndOrganization(id, organizationId);

    if (!property) {
      throw new NotFoundException(`Property with ID '${id}' not found`);
    }

    return property;
  }

  /**
   * Find all properties for an organization
   */
  async findAll(
    organizationId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: CustomerPropertyEntity[]; total: number }> {
    const [data, total] = await this.propertyRepository.findByOrganization(
      organizationId,
      page,
      limit,
    );
    return { data, total };
  }

  /**
   * Find all properties for a customer WITH quote info
   *
   * Uses two queries:
   * 1. Get properties for customer
   * 2. Batch lookup latest quotes for all property IDs
   *
   * This avoids N+1 queries and is performant for customers with many properties.
   */
  async findByCustomer(
    customerId: string,
    organizationId: string,
  ): Promise<PropertyWithQuoteInfo[]> {
    // Verify customer belongs to organization
    const customer = await this.customerRepository.findById(customerId);
    if (customer?.organizationId !== organizationId) {
      throw new NotFoundException(`Customer with ID '${customerId}' not found`);
    }

    // Query 1: Get properties
    const properties = await this.propertyRepository.findByCustomer(customerId);

    // Early return if no properties (skip quote lookup)
    if (properties.length === 0) {
      return [];
    }

    // Query 2: Get latest quotes for all properties (single batch query)
    const propertyIds = properties.map((p) => p.id);
    const quoteMap = await this.quoteRepository.findLatestByPropertyIds(
      propertyIds,
      organizationId,
    );

    // Enrich properties with quote data
    return properties.map((property) => {
      const quoteInfo = quoteMap.get(property.id);
      return {
        ...property,
        latestQuoteNumber: quoteInfo?.quoteNumber,
        latestQuoteStatus: quoteInfo?.status,
        latestQuoteDate: quoteInfo?.quoteDate,
      };
    });
  }

  /**
   * Find properties by lead temperature (with pagination)
   */
  async findByTemperature(
    organizationId: string,
    temperature: LeadTemperature,
    page = 1,
    limit = 20,
  ): Promise<{ data: CustomerPropertyEntity[]; total: number }> {
    const [data, total] = await this.propertyRepository.findByTemperature(
      organizationId,
      temperature,
      page,
      limit,
    );
    return { data, total };
  }

  /**
   * Find properties with pending follow-ups
   */
  async findWithPendingFollowups(
    organizationId: string,
    beforeDate?: Date,
    assignedToUserId?: string,
  ): Promise<CustomerPropertyEntity[]> {
    return this.propertyRepository.findWithPendingFollowups(
      organizationId,
      beforeDate,
      assignedToUserId,
    );
  }

  /**
   * Update property
   */
  async update(
    id: string,
    organizationId: string,
    updateDto: UpdateCustomerPropertyDto,
    updatedBy?: string,
  ): Promise<CustomerPropertyEntity> {
    this.logger.log(`Updating property: ${id}`);

    // Verify property exists and belongs to organization
    const property = await this.findById(id, organizationId);

    // Validate loan status if trying to disable loan
    if (property.wantsLoan === true && updateDto.wantsLoan === false) {
      const loanApp = await this.loanApplicationRepository.findByProperty(id);
      if (loanApp) {
        const finalizedStatuses = [LoanStatus.APPROVED, LoanStatus.REJECTED];
        if (finalizedStatuses.includes(loanApp.status)) {
          throw new BadRequestException(
            `Cannot disable loan financing. This loan has been ${loanApp.status} by the bank and cannot be modified.`,
          );
        }
      }
    }

    // Check for consumer number conflicts (if being updated)
    if (updateDto.consumerNumber && updateDto.consumerNumber !== property.consumerNumber) {
      const existingByConsumerNumber = await this.propertyRepository.findByConsumerNumber(
        organizationId,
        updateDto.consumerNumber,
      );
      if (existingByConsumerNumber && existingByConsumerNumber.id !== id) {
        throw new ConflictException(
          `Property with consumer number '${updateDto.consumerNumber}' already exists`,
        );
      }
    }

    // Handle primary flag change FIRST (before main update)
    if (updateDto.isPrimary === true && !property.isPrimary) {
      await this.propertyRepository.setPrimary(id, property.customerId, updatedBy);
    }

    // Prepare update data (exclude isPrimary since handled above, normalize documents)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { isPrimary: unusedIsPrimary, documents, ...restDto } = updateDto;

    const updated = await this.propertyRepository.update(id, {
      ...restDto,
      documents: this.normalizeDocuments(documents),
      updatedBy,
    });

    if (!updated) {
      throw new NotFoundException(`Property with ID '${id}' not found`);
    }

    this.logger.log(`Property updated successfully: ${id}`);
    return updated;
  }

  /**
   * Update property lead temperature
   */
  async updateTemperature(
    id: string,
    organizationId: string,
    temperature: LeadTemperature,
    updatedBy?: string,
  ): Promise<CustomerPropertyEntity> {
    this.logger.log(`Updating property ${id} temperature to: ${temperature}`);

    await this.findById(id, organizationId);

    const updated = await this.propertyRepository.update(id, {
      leadTemperature: temperature,
      updatedBy,
    });

    if (!updated) {
      throw new NotFoundException(`Property with ID '${id}' not found`);
    }

    this.logger.log(`Property temperature updated: ${id} -> ${temperature}`);
    return updated;
  }

  /**
   * Set property as primary
   */
  async setPrimary(
    id: string,
    organizationId: string,
    updatedBy?: string,
  ): Promise<CustomerPropertyEntity> {
    this.logger.log(`Setting property ${id} as primary`);

    const property = await this.findById(id, organizationId);

    if (property.isPrimary) {
      throw new BadRequestException('Property is already the primary property');
    }

    // setPrimary now includes updatedBy, avoiding double update
    await this.propertyRepository.setPrimary(id, property.customerId, updatedBy);

    // Fetch and return the updated property
    const updated = await this.findById(id, organizationId);

    this.logger.log(`Property set as primary: ${id}`);
    return updated;
  }

  /**
   * Delete property (soft delete)
   */
  async delete(id: string, organizationId: string, deletedBy?: string): Promise<void> {
    this.logger.log(`Deleting property: ${id}`);

    await this.findById(id, organizationId);

    await this.propertyRepository.softDelete(id, deletedBy);

    this.logger.log(`Property deleted successfully: ${id}`);
  }

  /**
   * Get temperature statistics (optimized single query)
   */
  async getTemperatureStatistics(organizationId: string): Promise<Record<string, number>> {
    const stats = await this.propertyRepository.getTemperatureStats(organizationId);

    // Initialize all temperatures with 0
    const result: Record<string, number> = {
      [LeadTemperature.HOT]: 0,
      [LeadTemperature.WARM]: 0,
      [LeadTemperature.COLD]: 0,
    };

    // Fill in actual counts from the single grouped query
    for (const stat of stats) {
      result[stat.temperature] = stat.count;
    }

    return result;
  }

  // ==================== FOLLOWUP METHODS ====================

  /**
   * Normalize followups from DTO to interface format
   * Applies default values for optional fields
   */
  private normalizeFollowups(followups: PropertyFollowupDto[]): PropertyFollowup[] {
    const now = new Date().toISOString();
    return followups.map((f) => ({
      id: f.id ?? crypto.randomUUID(),
      type: f.type,
      subject: f.subject,
      scheduledAt: f.scheduledAt,
      assignedToUserId: f.assignedToUserId,
      status: f.status ?? FollowupStatus.PENDING,
      priority: f.priority ?? FollowupPriority.NORMAL,
      notes: f.notes,
      lastUpdatedAt: now,
    }));
  }

  /**
   * Add a followup to a property
   * Uses atomic JSONB append operation
   */
  async addFollowup(
    propertyId: string,
    organizationId: string,
    dto: PropertyFollowupDto,
    updatedBy: string,
  ): Promise<PropertyFollowup> {
    await this.findById(propertyId, organizationId);

    const now = new Date().toISOString();
    const followup: PropertyFollowup = {
      id: crypto.randomUUID(),
      type: dto.type,
      subject: dto.subject,
      scheduledAt: dto.scheduledAt,
      assignedToUserId: dto.assignedToUserId,
      status: dto.status ?? FollowupStatus.PENDING,
      priority: dto.priority ?? FollowupPriority.NORMAL,
      notes: dto.notes,
      lastUpdatedAt: now,
    };

    // Atomic JSONB append via repository method
    await this.propertyRepository.appendFollowup(propertyId, followup, updatedBy);

    this.logger.log(`Followup added to property ${propertyId}: ${followup.id}`);
    return followup;
  }

  /**
   * Update a followup in the array
   */
  async updateFollowup(
    propertyId: string,
    organizationId: string,
    followupId: string,
    dto: Partial<PropertyFollowupDto>,
    updatedBy: string,
  ): Promise<PropertyFollowup> {
    const property = await this.findById(propertyId, organizationId);

    const index = property.followups.findIndex((f) => f.id === followupId);
    if (index === -1) {
      throw new NotFoundException(`Followup with ID '${followupId}' not found`);
    }

    // Safe to use ! here - we already verified index !== -1 above
    const existing = property.followups[index]!;
    const updated: PropertyFollowup = {
      id: followupId, // Immutable
      type: dto.type ?? existing.type,
      subject: dto.subject ?? existing.subject,
      scheduledAt: dto.scheduledAt ?? existing.scheduledAt,
      assignedToUserId: dto.assignedToUserId ?? existing.assignedToUserId,
      status: dto.status ?? existing.status,
      priority: dto.priority ?? existing.priority,
      notes: dto.notes !== undefined ? dto.notes : existing.notes,
      lastUpdatedAt: new Date().toISOString(),
    };

    property.followups[index] = updated;
    await this.propertyRepository.update(propertyId, {
      followups: property.followups,
      updatedBy,
    });

    this.logger.log(`Followup updated: ${followupId}`);
    return updated;
  }

  /**
   * Delete a followup from the array
   */
  async deleteFollowup(
    propertyId: string,
    organizationId: string,
    followupId: string,
    updatedBy: string,
  ): Promise<void> {
    const property = await this.findById(propertyId, organizationId);

    const filtered = property.followups.filter((f) => f.id !== followupId);
    if (filtered.length === property.followups.length) {
      throw new NotFoundException(`Followup with ID '${followupId}' not found`);
    }

    await this.propertyRepository.update(propertyId, {
      followups: filtered,
      updatedBy,
    });

    this.logger.log(`Followup deleted: ${followupId}`);
  }
}
