import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CustomerStatus,
  LeadTemperature,
  LoanStatus,
  type PropertyDocument,
  PropertyStatus,
  QuoteStatus,
} from '@tejas96/shared/types';
import { Not, IsNull } from 'typeorm';

import { generateEntityCode } from '../../../common/utils/code-generator.util';
import { LoanApplicationRepository } from '../../loan-finance/repositories/loan-application.repository';
import {
  CONSUMER_EVENTS,
  PropertyCreatedEvent,
} from '../../notifications/events/consumer-notification.events';
import { OrganizationRepository } from '../../organizations/repositories/organization.repository';
import { QuoteRepository } from '../../quotes/repositories/quote.repository';
import { StorageService } from '../../storage/services/storage.service';
import { CreateCustomerPropertyDto } from '../dto/create-customer-property.dto';
import type { PropertyDocumentDto } from '../dto/property-document.dto';
import { PropertyQueryDto } from '../dto/property-query.dto';
import { UpdateCustomerPropertyDto } from '../dto/update-customer-property.dto';
import { CustomerPropertyEntity } from '../entities/customer-property.entity';
import { CustomerProfileRepository } from '../repositories/customer-profile.repository';
import { CustomerPropertyRepository } from '../repositories/customer-property.repository';

/**
 * Extended type for properties with quote info
 */
type PropertyWithQuoteInfo = CustomerPropertyEntity & {
  latestQuoteId?: string;
  latestQuoteNumber?: string;
  latestQuoteStatus?: QuoteStatus;
  latestQuoteDate?: Date;
  latestQuoteFinalPrice?: number;
  latestQuoteSystemSizeKw?: number;
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
    private readonly organizationRepository: OrganizationRepository,
    private readonly quoteRepository: QuoteRepository,
    private readonly loanApplicationRepository: LoanApplicationRepository,
    private readonly storageService: StorageService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

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
    if (customer.status === CustomerStatus.INACTIVE) {
      throw new BadRequestException('Cannot perform this action: customer is inactive');
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
    const { documents, ...restCreateDto } = createDto;

    const property = await this.propertyRepository.create({
      ...restCreateDto,
      documents: this.normalizeDocuments(documents),
      organizationId,
      isPrimary,
      status: createDto.status || PropertyStatus.ACTIVE,
      createdBy,
    });

    // If this property is primary, unset other properties
    if (isPrimary && existingProperties > 0) {
      await this.propertyRepository.setPrimary(property.id, createDto.customerId);
    }

    // Generate human-readable code (e.g. PROP-ONEOHM_EPC-2026-0001)
    try {
      const org = await this.organizationRepository.findOneById(organizationId);
      if (org) {
        const propertyCode = await generateEntityCode(
          this.propertyRepository.repository,
          'propertyCode',
          'PROP',
          org.code,
          'property_code',
        );
        await this.propertyRepository.repository.update(property.id, { propertyCode });
        property.propertyCode = propertyCode;
      }
    } catch (err) {
      this.logger.warn(`Failed to generate property code for ${property.id}: ${String(err)}`);
    }

    this.logger.log(`✅ Property created: ${property.id}`);

    // Notify consumer about new property (fire-and-forget)
    this.eventEmitter.emit(
      CONSUMER_EVENTS.PROPERTY_CREATED,
      new PropertyCreatedEvent(
        organizationId,
        property.id,
        createDto.customerId,
        property.propertyName,
      ),
    );

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
   * Find all properties for an organization with filters, sorting, and pagination
   * Enriches results with latest quote info per property
   *
   * @param organizationId - Organization context
   * @param query - Query parameters (filters, sorting, pagination)
   * @returns Properties enriched with quote info and total count
   */
  async findAll(
    organizationId: string,
    query: PropertyQueryDto,
  ): Promise<{ data: PropertyWithQuoteInfo[]; total: number }> {
    const [properties, total] = await this.propertyRepository.findWithFilters(
      organizationId,
      query,
    );

    // Early return if no properties (skip quote lookup)
    if (properties.length === 0) {
      return { data: [], total };
    }

    // Batch-load latest quote per property (single query, avoids N+1)
    const propertyIds = properties.map((p) => p.id);
    const quoteMap = await this.quoteRepository.findLatestByPropertyIds(
      propertyIds,
      organizationId,
    );

    const enriched: PropertyWithQuoteInfo[] = properties.map((property) => {
      const quoteInfo = quoteMap.get(property.id);
      return {
        ...property,
        latestQuoteId: quoteInfo?.id,
        latestQuoteNumber: quoteInfo?.quoteNumber,
        latestQuoteStatus: quoteInfo?.status,
        latestQuoteDate: quoteInfo?.quoteDate,
        latestQuoteFinalPrice: quoteInfo?.finalPrice,
        latestQuoteSystemSizeKw:
          quoteInfo?.totalWattageWp != null && quoteInfo.totalWattageWp > 0
            ? Number(quoteInfo.totalWattageWp) / 1000
            : quoteInfo?.systemSizeKw,
      };
    });

    return { data: enriched, total };
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
        latestQuoteId: quoteInfo?.id,
        latestQuoteNumber: quoteInfo?.quoteNumber,
        latestQuoteStatus: quoteInfo?.status,
        latestQuoteDate: quoteInfo?.quoteDate,
        latestQuoteFinalPrice: quoteInfo?.finalPrice,
        latestQuoteSystemSizeKw:
          quoteInfo?.totalWattageWp != null && quoteInfo.totalWattageWp > 0
            ? Number(quoteInfo.totalWattageWp) / 1000
            : quoteInfo?.systemSizeKw,
      };
    });
  }

  /**
   * Find all active properties for the logged-in customer user.
   * Eagerly loads project, quotes, and versions in a single query.
   * Enforces status != 'inactive' and deletedAt IS NULL.
   */
  async findMyProperties(
    userId: string,
    organizationId: string,
  ): Promise<CustomerPropertyEntity[]> {
    const customerProfile = await this.customerRepository.findByUserAndOrganization(
      userId,
      organizationId,
    );
    if (!customerProfile) {
      return [];
    }

    return this.propertyRepository.repository.find({
      where: {
        customerId: customerProfile.id,
        status: Not(PropertyStatus.INACTIVE),
        deletedAt: IsNull(),
      },
      relations: ['project', 'quotes', 'quotes.versions', 'customer'],
      order: {
        isPrimary: 'DESC',
        createdAt: 'DESC',
      },
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured to exclude from rest spread
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
  /**
   * Add a document to property
   */
  async addDocument(
    propertyId: string,
    organizationId: string,
    document: PropertyDocumentDto,
    userId: string,
  ): Promise<CustomerPropertyEntity> {
    this.logger.log(`Adding document to property ${propertyId}`);

    const property = await this.findById(propertyId, organizationId);
    const documents: PropertyDocument[] = [
      ...(property.documents || []),
      this.normalizeDocument(document),
    ];

    const updated = await this.propertyRepository.update(propertyId, {
      documents,
      updatedBy: userId,
    });

    if (!updated) {
      throw new NotFoundException(`Property with ID '${propertyId}' not found after update`);
    }

    return updated;
  }

  /**
   * Remove a document from property
   */
  async removeDocument(
    propertyId: string,
    organizationId: string,
    documentUrl: string,
    userId: string,
  ): Promise<CustomerPropertyEntity> {
    this.logger.log(`Removing document from property ${propertyId}`);

    const property = await this.findById(propertyId, organizationId);
    const documents = (property.documents || []).filter((d) => d.url !== documentUrl);

    const updated = await this.propertyRepository.update(propertyId, {
      documents,
      updatedBy: userId,
    });

    if (!updated) {
      throw new NotFoundException(`Property with ID '${propertyId}' not found after update`);
    }

    // S3 cleanup (non-blocking — DB update already succeeded)
    const fileKey = this.storageService.extractFileKeyFromUrl(documentUrl);
    if (fileKey) {
      try {
        await this.storageService.deleteFile(fileKey);
        this.logger.log(`Deleted file from storage: ${fileKey}`);
      } catch (error) {
        this.logger.warn(`Failed to delete file from storage: ${fileKey}`, error);
      }
    }

    return updated;
  }

  /**
   * Normalize a single document from DTO to entity format
   */
  private normalizeDocument(doc: PropertyDocumentDto): PropertyDocument {
    return {
      url: doc.url,
      tag: doc.tag,
      fileName: doc.fileName,
      isLoanDoc: doc.isLoanDoc ?? false,
      isVerified: doc.isVerified ?? false,
      verifiedAt: doc.verifiedAt,
      verifiedBy: doc.verifiedBy,
      fileSize: doc.fileSize,
      uploadedAt: doc.uploadedAt ?? new Date().toISOString(),
    };
  }

  /**
   * Normalize documents from DTO to entity format
   * Applies default values for optional fields
   */
  private normalizeDocuments(documents?: PropertyDocumentDto[]): PropertyDocument[] | undefined {
    if (!documents) return undefined;
    return documents.map((doc) => this.normalizeDocument(doc));
  }
}
