import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  LeadTemperature,
  LoanStatus,
  type PropertyDocument,
  PropertyStatus,
  QuoteStatus,
} from '@oneohm-epc/shared-types';

import { LoanApplicationRepository } from '../../loan-finance/repositories/loan-application.repository';
import { QuoteRepository } from '../../quotes/repositories/quote.repository';
import { CreateCustomerPropertyDto } from '../dto/create-customer-property.dto';
import type { PropertyDocumentDto } from '../dto/property-document.dto';
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

    // Calculate next follow-up date based on temperature
    const nextFollowUpDate = this.calculateNextFollowUpDate(
      createDto.leadTemperature || LeadTemperature.WARM,
    );

    // Normalize documents to ensure required fields have defaults
    const { documents, ...restCreateDto } = createDto;

    const property = await this.propertyRepository.create({
      ...restCreateDto,
      documents: this.normalizeDocuments(documents),
      organizationId,
      isPrimary,
      nextFollowUpDate: createDto.nextFollowUpDate
        ? new Date(createDto.nextFollowUpDate)
        : nextFollowUpDate,
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
   * Find properties by lead temperature
   */
  async findByTemperature(
    organizationId: string,
    temperature: LeadTemperature,
  ): Promise<CustomerPropertyEntity[]> {
    return this.propertyRepository.findByTemperature(organizationId, temperature);
  }

  /**
   * Find pending follow-ups
   */
  async findPendingFollowUps(
    organizationId: string,
    beforeDate?: Date,
  ): Promise<CustomerPropertyEntity[]> {
    return this.propertyRepository.findPendingFollowUps(organizationId, beforeDate);
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

    // If temperature changes, recalculate next follow-up date (unless explicitly provided)
    let nextFollowUpDate = updateDto.nextFollowUpDate
      ? new Date(updateDto.nextFollowUpDate)
      : undefined;

    if (updateDto.leadTemperature && updateDto.leadTemperature !== property.leadTemperature) {
      if (!updateDto.nextFollowUpDate) {
        nextFollowUpDate = this.calculateNextFollowUpDate(updateDto.leadTemperature);
      }
    }

    const updated = await this.propertyRepository.update(id, {
      ...restDto,
      documents: this.normalizeDocuments(documents),
      nextFollowUpDate,
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
    followUpNotes?: string,
    updatedBy?: string,
  ): Promise<CustomerPropertyEntity> {
    this.logger.log(`Updating property ${id} temperature to: ${temperature}`);

    await this.findById(id, organizationId);

    const nextFollowUpDate = this.calculateNextFollowUpDate(temperature);

    const updated = await this.propertyRepository.update(id, {
      leadTemperature: temperature,
      nextFollowUpDate,
      lastContactDate: new Date(),
      followUpNotes,
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

  /**
   * Calculate next follow-up date based on temperature
   */
  private calculateNextFollowUpDate(temperature: LeadTemperature): Date {
    const daysToAdd = {
      [LeadTemperature.HOT]: 3,
      [LeadTemperature.WARM]: 10,
      [LeadTemperature.COLD]: 15,
    };

    const date = new Date();
    date.setDate(date.getDate() + daysToAdd[temperature]);
    return date;
  }
}
