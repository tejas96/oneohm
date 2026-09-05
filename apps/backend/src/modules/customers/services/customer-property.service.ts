import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { COMPANY } from '@tejas96/shared/constants';
import {
  ChangeRequestStatus,
  CustomerStatus,
  LeadTemperature,
  LoanStatus,
  ProjectStatus,
  type PropertyDocument,
  PropertyStatus,
  QuoteStatus,
  SiteStatus,
} from '@tejas96/shared/types';
import { DataSource, IsNull, Not, type EntityManager } from 'typeorm';

import { LeadClosureService } from './lead-closure.service';
import { systemSizeKwOf } from '../../../common/utils';
import { generateEntityCode } from '../../../common/utils/code-generator.util';
import { DiscomService } from '../../discoms/services/discom.service';
import { DocumentEntity } from '../../documents/entities/document.entity';
import { LoanApplicationRepository } from '../../loan-finance/repositories/loan-application.repository';
import {
  CONSUMER_EVENTS,
  PropertyCreatedEvent,
} from '../../notifications/events/consumer-notification.events';
import { QuoteRepository } from '../../quotes/repositories/quote.repository';
import { StorageService } from '../../storage/services/storage.service';
import { CreateCustomerPropertyDto } from '../dto/create-customer-property.dto';
import type { PropertyDocumentDto } from '../dto/property-document.dto';
import { PropertyQueryDto } from '../dto/property-query.dto';
import { UpdateCustomerPropertyDto } from '../dto/update-customer-property.dto';
import { CustomerPropertyEntity } from '../entities/customer-property.entity';
import { CustomerProfileRepository } from '../repositories/customer-profile.repository';
import { CustomerPropertyRepository } from '../repositories/customer-property.repository';
import {
  mergeChangeRequestsForUpdate,
  normalizeChangeRequestsForStorage,
} from '../utils/change-request.util';
import { assertUtilityDetailsComplete, hasUtilityFieldUpdate } from '../utils/utility-details.util';

const TERMINAL_LOAN_STATUSES: LoanStatus[] = [
  LoanStatus.APPROVED,
  LoanStatus.REJECTED,
  LoanStatus.CANCELLED,
];

/**
 * Extended type for properties with quote info
 */
type PropertyWithQuoteInfo = CustomerPropertyEntity & {
  projectId?: string;
  /**
   * The linked project's status as it stands today.
   *
   * A site's own `status` freezes at CONVERTED the moment its project is
   * created, so it cannot say whether that project finished, stalled or was
   * called off. Lists read this instead once a site has a project.
   */
  projectStatus?: ProjectStatus;
  hasActiveLoan?: boolean;
  latestQuoteId?: string;
  latestQuoteNumber?: string;
  latestQuoteStatus?: QuoteStatus;
  latestQuoteDate?: Date;
  latestQuoteFinalPrice?: number;
  latestQuoteSystemSizeKw?: number;
  /**
   * What the site's project is worth NOW, present only once it has one.
   *
   * `latestQuoteFinalPrice` above is the quote's own value, frozen at signing.
   * That is the right thing to show against a QUOTE and the wrong thing to show
   * against a converted site: billing the customer for material added on site
   * moves the project's contract while the quote stays where it was, and every
   * screen reading only the quote figure then reports a number the project's
   * own Money tab contradicts.
   */
  contractValue?: number;
  quotedValue?: number;
  changeOrderValue?: number;
  nextFollowupAt?: Date;
  needsFollowup?: boolean;
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
    private readonly discomService: DiscomService,
    private readonly quoteRepository: QuoteRepository,
    private readonly loanApplicationRepository: LoanApplicationRepository,
    private readonly storageService: StorageService,
    private readonly eventEmitter: EventEmitter2,
    private readonly dataSource: DataSource,
    private readonly leadClosureService: LeadClosureService,
  ) {}

  /**
   * Close this site as lost.
   *
   * Per-property by design: one customer can have three sites and losing one
   * must not remove the other two from the pipeline. Cancels this property's
   * pending followups so a dead lead stops nagging.
   */
  async markLost(id: string, reason: string, userId: string): Promise<CustomerPropertyEntity> {
    const property = await this.propertyRepository.findById(id);
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    if (property.status === PropertyStatus.LOST) {
      throw new BadRequestException('Property is already marked lost');
    }
    if (property.status === PropertyStatus.CONVERTED) {
      throw new BadRequestException('Cannot mark a converted property as lost');
    }

    await this.leadClosureService.markPropertyLost(id, property.customerId, reason, userId);

    const updated = await this.propertyRepository.findById(id);
    if (!updated) {
      throw new NotFoundException('Property not found');
    }
    return updated;
  }

  /**
   * Create a new customer property
   */
  async create(
    createDto: CreateCustomerPropertyDto,
    createdBy?: string,
  ): Promise<CustomerPropertyEntity> {
    this.logger.log(`Creating property for customer: ${createDto.customerId}`);

    // Verify customer exists
    const customer = await this.customerRepository.findById(createDto.customerId);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    if (customer.status === CustomerStatus.INACTIVE) {
      throw new BadRequestException('Cannot perform this action: customer is inactive');
    }

    // Check for consumer number conflicts (if provided)
    if (createDto.consumerNumber) {
      const existingByConsumerNumber = await this.propertyRepository.findByConsumerNumber(
        createDto.consumerNumber,
      );
      if (existingByConsumerNumber) {
        throw new ConflictException(
          `Property with consumer number '${createDto.consumerNumber}' already exists`,
        );
      }
    }

    // Validate discom exists and is active
    await this.discomService.assertActiveDiscom(createDto.discomId);

    // Check if this is the first property for the customer - make it primary
    const existingProperties = await this.propertyRepository.countByCustomer(createDto.customerId);
    const isPrimary = createDto.isPrimary ?? existingProperties === 0;

    // Normalize documents to ensure required fields have defaults
    const { documents, changeRequests, ...restCreateDto } = createDto;

    const property = await this.propertyRepository.create({
      ...restCreateDto,
      documents: this.normalizeDocuments(documents),
      changeRequests: normalizeChangeRequestsForStorage(changeRequests, createdBy ?? ''),
      isPrimary,
      status: createDto.status || PropertyStatus.ACTIVE,
      createdBy,
    });

    assertUtilityDetailsComplete(property);

    // If this property is primary, unset other properties
    if (isPrimary && existingProperties > 0) {
      await this.propertyRepository.setPrimary(property.id, createDto.customerId);
    }

    // Generate human-readable code (e.g. PROP-ONEOHM_EPC-2026-0001)
    try {
      const propertyCode = await generateEntityCode(
        this.propertyRepository.repository,
        'propertyCode',
        'PROP',
        COMPANY.code,
        'property_code',
      );
      await this.propertyRepository.repository.update(property.id, { propertyCode });
      property.propertyCode = propertyCode;
    } catch (err) {
      this.logger.warn(`Failed to generate property code for ${property.id}: ${String(err)}`);
    }

    this.logger.log(`✅ Property created: ${property.id}`);

    if (existingProperties === 0 && createdBy) {
      try {
        await this.leadClosureService.closeCustomerLeadEnquiry(createDto.customerId, createdBy);
      } catch (err) {
        this.logger.warn(
          `Failed to close customer-level followups for ${createDto.customerId}: ${String(err)}`,
        );
      }
    }

    const createdProperty =
      (await this.propertyRepository.findByIdAndOrganization(property.id)) ?? property;

    // Notify consumer about new property (fire-and-forget)
    this.eventEmitter.emit(
      CONSUMER_EVENTS.PROPERTY_CREATED,
      new PropertyCreatedEvent(
        createdProperty.id,
        createDto.customerId,
        createdProperty.propertyName,
      ),
    );

    return createdProperty;
  }

  /**
   * Find property by ID
   *
   * Enriches with the shared follow-up predicate (via the same batch lookup
   * `findAll`/`findByCustomer` use, single-element array) so `needsFollowup`
   * is always present on the single-property response and never silently
   * dropped by the DTO's @Exclude()-by-default.
   */
  async findById(id: string): Promise<PropertyWithQuoteInfo> {
    const property = await this.propertyRepository.findByIdAndOrganization(id);

    if (!property) {
      throw new NotFoundException(`Property with ID '${id}' not found`);
    }

    const followupStateMap = await this.propertyRepository.findFollowupStateByPropertyIds([
      property.id,
    ]);
    const followupState = followupStateMap.get(property.id);

    return {
      ...property,
      nextFollowupAt: followupState?.nextAt ?? undefined,
      needsFollowup: followupState?.needsFollowup ?? false,
    };
  }

  /**
   * Find all properties with filters, sorting, and pagination
   * Enriches results with latest quote info per property
   *
   * @param query - Query parameters (filters, sorting, pagination)
   * @returns Properties enriched with quote info and total count
   */
  async findAll(
    query: PropertyQueryDto,
  ): Promise<{ data: PropertyWithQuoteInfo[]; total: number }> {
    const [properties, total] = await this.propertyRepository.findWithFilters(query);

    // Early return if no properties (skip quote lookup)
    if (properties.length === 0) {
      return { data: [], total };
    }

    // Batch-load latest quote per property (single query, avoids N+1)
    const propertyIds = properties.map((p) => p.id);
    const quoteMap = await this.quoteRepository.findLatestByPropertyIds(propertyIds);
    const projectMap = await this.propertyRepository.findProjectsByPropertyIds(propertyIds);
    const contractMap = await this.propertyRepository.findContractValuesByPropertyIds(propertyIds);
    const activeLoanPropertyIds =
      await this.loanApplicationRepository.findPropertyIdsWithActiveLoans(propertyIds);
    const followupStateMap =
      await this.propertyRepository.findFollowupStateByPropertyIds(propertyIds);

    const enriched: PropertyWithQuoteInfo[] = properties.map((property) => {
      const quoteInfo = quoteMap.get(property.id);
      const contract = contractMap.get(property.id);
      return {
        ...property,
        projectId: projectMap.get(property.id)?.id,
        projectStatus: projectMap.get(property.id)?.status,
        hasActiveLoan: activeLoanPropertyIds.has(property.id),
        contractValue: contract?.contractValue,
        quotedValue: contract?.quotedValue,
        changeOrderValue: contract?.changeOrderValue,
        latestQuoteId: quoteInfo?.id,
        latestQuoteNumber: quoteInfo?.quoteNumber,
        latestQuoteStatus: quoteInfo?.status,
        latestQuoteDate: quoteInfo?.quoteDate,
        latestQuoteFinalPrice: quoteInfo?.finalPrice,
        latestQuoteSystemSizeKw: systemSizeKwOf({
          totalWattageWp: quoteInfo?.totalWattageWp,
        }),
        nextFollowupAt: followupStateMap.get(property.id)?.nextAt ?? undefined,
        needsFollowup: followupStateMap.get(property.id)?.needsFollowup ?? false,
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
  async findByCustomer(customerId: string): Promise<PropertyWithQuoteInfo[]> {
    // Verify customer exists
    const customer = await this.customerRepository.findById(customerId);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Query 1: Get properties
    const properties = await this.propertyRepository.findByCustomer(customerId);

    // Early return if no properties (skip quote lookup)
    if (properties.length === 0) {
      return [];
    }

    // Query 2: Get latest quotes for all properties (single batch query)
    const propertyIds = properties.map((p) => p.id);
    const quoteMap = await this.quoteRepository.findLatestByPropertyIds(propertyIds);
    const contractMap = await this.propertyRepository.findContractValuesByPropertyIds(propertyIds);
    // The customer's own site list showed a flat "Converted" on every site that
    // had ever become a project, including finished and cancelled ones, because
    // this path never loaded the project at all. `findAll` already did.
    const projectMap = await this.propertyRepository.findProjectsByPropertyIds(propertyIds);
    const followupStateMap =
      await this.propertyRepository.findFollowupStateByPropertyIds(propertyIds);

    // Enrich properties with quote data
    return properties.map((property) => {
      const quoteInfo = quoteMap.get(property.id);
      const contract = contractMap.get(property.id);
      return {
        ...property,
        projectId: projectMap.get(property.id)?.id,
        projectStatus: projectMap.get(property.id)?.status,
        contractValue: contract?.contractValue,
        quotedValue: contract?.quotedValue,
        changeOrderValue: contract?.changeOrderValue,
        latestQuoteId: quoteInfo?.id,
        latestQuoteNumber: quoteInfo?.quoteNumber,
        latestQuoteStatus: quoteInfo?.status,
        latestQuoteDate: quoteInfo?.quoteDate,
        latestQuoteFinalPrice: quoteInfo?.finalPrice,
        latestQuoteSystemSizeKw: systemSizeKwOf({
          totalWattageWp: quoteInfo?.totalWattageWp,
        }),
        nextFollowupAt: followupStateMap.get(property.id)?.nextAt ?? undefined,
        needsFollowup: followupStateMap.get(property.id)?.needsFollowup ?? false,
      };
    });
  }

  /**
   * Find all active properties for the logged-in customer user.
   * Eagerly loads project, quotes, and versions in a single query.
   * Enforces status != 'inactive' and deletedAt IS NULL.
   */
  async findMyProperties(userId: string): Promise<CustomerPropertyEntity[]> {
    const customerProfile = await this.customerRepository.findByUserAndOrganization(userId);
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
    temperature: LeadTemperature,
    page = 1,
    limit = 20,
  ): Promise<{ data: CustomerPropertyEntity[]; total: number }> {
    const [data, total] = await this.propertyRepository.findByTemperature(temperature, page, limit);
    return { data, total };
  }

  /**
   * Update property
   */
  async update(
    id: string,
    updateDto: UpdateCustomerPropertyDto,
    updatedBy?: string,
  ): Promise<CustomerPropertyEntity> {
    this.logger.log(`Updating property: ${id}`);

    // Verify property exists
    const property = await this.findById(id);

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
        updateDto.consumerNumber,
      );
      if (existingByConsumerNumber && existingByConsumerNumber.id !== id) {
        throw new ConflictException(
          `Property with consumer number '${updateDto.consumerNumber}' already exists`,
        );
      }
    }

    // Validate discom if being changed
    if (updateDto.discomId !== undefined && updateDto.discomId !== property.discomId) {
      await this.discomService.assertActiveDiscom(updateDto.discomId);
    }

    // Handle primary flag change FIRST (before main update)
    if (updateDto.isPrimary === true && !property.isPrimary) {
      await this.propertyRepository.setPrimary(id, property.customerId, updatedBy);
    }

    // Prepare update data (exclude isPrimary since handled above, normalize documents)

    const { isPrimary: unusedIsPrimary, documents, changeRequests, ...restDto } = updateDto;

    const updatePayload: Record<string, unknown> = {
      ...restDto,
      documents: this.normalizeDocuments(documents),
      updatedBy,
    };

    if (changeRequests !== undefined) {
      updatePayload.changeRequests = mergeChangeRequestsForUpdate(
        property.changeRequests ?? [],
        changeRequests,
        updatedBy ?? '',
      );
    }

    const updated = await this.propertyRepository.update(id, updatePayload);

    if (!updated) {
      throw new NotFoundException(`Property with ID '${id}' not found`);
    }

    if (hasUtilityFieldUpdate(updateDto)) {
      assertUtilityDetailsComplete(updated);
    }

    this.logger.log(`Property updated successfully: ${id}`);
    return updated;
  }

  /**
   * Update property lead temperature
   */
  async updateTemperature(
    id: string,
    temperature: LeadTemperature,
    updatedBy?: string,
  ): Promise<CustomerPropertyEntity> {
    this.logger.log(`Updating property ${id} temperature to: ${temperature}`);

    await this.findById(id);

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
  async setPrimary(id: string, updatedBy?: string): Promise<CustomerPropertyEntity> {
    this.logger.log(`Setting property ${id} as primary`);

    const property = await this.findById(id);

    if (property.isPrimary) {
      throw new BadRequestException('Property is already the primary property');
    }

    // setPrimary now includes updatedBy, avoiding double update
    await this.propertyRepository.setPrimary(id, property.customerId, updatedBy);

    // Fetch and return the updated property
    const updated = await this.findById(id);

    this.logger.log(`Property set as primary: ${id}`);
    return updated;
  }

  /**
   * Permanently delete property when it has no quotes, project, or active loan.
   */
  async delete(id: string, _deletedBy?: string): Promise<void> {
    this.logger.log(`Permanently deleting property: ${id}`);

    const property = await this.findById(id);
    const fileUrls = await this.collectPropertyFileUrls(property);

    await this.dataSource.transaction(async (manager) => {
      const locked = await manager.findOne(CustomerPropertyEntity, {
        where: { id, deletedAt: IsNull() },
        lock: { mode: 'pessimistic_write' },
      });
      if (!locked) {
        throw new NotFoundException(`Property with ID '${id}' not found`);
      }

      await this.assertDeletable(id, manager);

      await manager.delete(DocumentEntity, { propertyId: id });
      const deleted = await this.propertyRepository.hardDelete(id, manager);
      if (!deleted) {
        throw new NotFoundException(`Property with ID '${id}' not found`);
      }
    });

    await this.cleanupStorageFiles(fileUrls);

    this.logger.log(`Property permanently deleted: ${id}`);
  }

  private async assertDeletable(propertyId: string, manager: EntityManager): Promise<void> {
    const projectMap = await this.propertyRepository.findProjectsByPropertyIds(
      [propertyId],
      manager,
    );
    if (projectMap.has(propertyId)) {
      throw new ConflictException('Cannot delete: property has been converted to a project');
    }

    const quoteMap = await this.quoteRepository.findLatestByPropertyIds([propertyId], manager);
    if (quoteMap.has(propertyId)) {
      throw new ConflictException('Cannot delete: property has quotations');
    }

    const loan = await this.loanApplicationRepository.findByProperty(propertyId, manager);
    if (loan && !TERMINAL_LOAN_STATUSES.includes(loan.status)) {
      throw new ConflictException(
        'Cannot delete: property has an active loan application in progress',
      );
    }

    const property = await manager.findOne(CustomerPropertyEntity, {
      where: { id: propertyId },
      select: ['id', 'changeRequests'],
    });
    if (property?.changeRequests?.some((cr) => cr.status === ChangeRequestStatus.PENDING)) {
      throw new ConflictException('Cannot delete: property has pending change requests');
    }
  }

  private async collectPropertyFileUrls(property: CustomerPropertyEntity): Promise<string[]> {
    const urls = new Set<string>();

    for (const doc of property.documents ?? []) {
      if (doc.url) urls.add(doc.url);
    }

    const documents = await this.dataSource.getRepository(DocumentEntity).find({
      where: { propertyId: property.id },
      select: ['fileUrl'],
    });
    for (const doc of documents) {
      urls.add(doc.fileUrl);
    }

    return [...urls];
  }

  private async cleanupStorageFiles(fileUrls: string[]): Promise<void> {
    for (const url of fileUrls) {
      const fileKey = this.storageService.extractFileKeyFromUrl(url);
      if (!fileKey) continue;

      try {
        await this.storageService.deleteFile(fileKey);
        this.logger.log(`Deleted file from storage: ${fileKey}`);
      } catch (error) {
        this.logger.warn(`Failed to delete file from storage: ${fileKey}`, error);
      }
    }
  }

  /**
   * Get temperature statistics (optimized single query)
   */
  async getTemperatureStatistics(): Promise<Record<string, number>> {
    const stats = await this.propertyRepository.getTemperatureStats();

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
    document: PropertyDocumentDto,
    userId: string,
  ): Promise<CustomerPropertyEntity> {
    this.logger.log(`Adding document to property ${propertyId}`);

    const property = await this.findById(propertyId);
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
    documentUrl: string,
    userId: string,
  ): Promise<CustomerPropertyEntity> {
    this.logger.log(`Removing document from property ${propertyId}`);

    const property = await this.findById(propertyId);
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

  // ==================== SITE VISIT / SURVEY WORKFLOW ====================

  /**
   * Complete a site visit for a property.
   * Validates that the property is in a valid state before marking visit as done.
   */
  async completeVisit(propertyId: string, userId: string): Promise<CustomerPropertyEntity> {
    const property = await this.propertyRepository.findByIdAndOrganization(propertyId);
    if (!property) {
      throw new NotFoundException(`Property ${propertyId} not found`);
    }

    if (property.siteVisitDone) {
      throw new BadRequestException('Site visit is already completed');
    }

    if (property.siteStatus === SiteStatus.CANCELLED) {
      throw new BadRequestException('Cannot complete visit for a cancelled site activity');
    }

    const updates: Partial<CustomerPropertyEntity> = {
      siteVisitDone: true,
      siteVisitCompletedAt: new Date(),
      siteStatus: SiteStatus.IN_PROGRESS,
      updatedBy: userId,
    };

    const updated = await this.propertyRepository.update(propertyId, updates);
    if (!updated) {
      throw new NotFoundException(`Property ${propertyId} not found after update`);
    }

    this.logger.log(`Site visit completed for property ${propertyId} by user ${userId}`);
    return updated;
  }

  /**
   * Complete a site survey for a property.
   *
   * Closes an open site visit as a side effect. That used to be a refusal:
   * the survey threw whenever `siteVisitDone` was false. With one person doing
   * both jobs the guard was invisible. With two — which the separate
   * `siteVisitAssignee` and `siteSurveyAssignee` columns have always allowed —
   * it strands a surveyor on a roof, survey finished, unable to save, because
   * a colleague forgot to tap a button last week.
   *
   * The survey is the stronger evidence of the two. You cannot measure a roof
   * you did not stand on, so a completed survey proves the visit happened more
   * convincingly than the visit's own checkbox does.
   */
  async completeSurvey(propertyId: string, userId: string): Promise<CustomerPropertyEntity> {
    const property = await this.propertyRepository.findByIdAndOrganization(propertyId);
    if (!property) {
      throw new NotFoundException(`Property ${propertyId} not found`);
    }

    if (property.surveyDone) {
      throw new BadRequestException('Site survey is already completed');
    }

    if (property.siteStatus === SiteStatus.CANCELLED) {
      throw new BadRequestException('Cannot complete survey for a cancelled site activity');
    }

    const survey = property.surveyData;
    if (!survey?.roofType || !survey?.roofCondition) {
      throw new BadRequestException(
        'Roof type and roof condition are required in survey details before completing the survey',
      );
    }

    // Both timestamps and both assignees stay separate, so the office loses no
    // detail by the two closing together — it can still read who attended and
    // who measured, and when. Only the refusal is gone.
    const closesAnOpenVisit = !property.siteVisitDone;
    const now = new Date();

    const updates: Partial<CustomerPropertyEntity> = {
      surveyDone: true,
      siteSurveyCompletedAt: now,
      siteStatus: SiteStatus.COMPLETED,
      updatedBy: userId,
      ...(closesAnOpenVisit
        ? {
            siteVisitDone: true,
            siteVisitCompletedAt: now,
            // Whoever was already down for the visit keeps the credit. Only an
            // unassigned visit is attributed to the surveyor standing there.
            siteVisitAssignee: property.siteVisitAssignee ?? userId,
          }
        : {}),
    };

    const updated = await this.propertyRepository.update(propertyId, updates);
    if (!updated) {
      throw new NotFoundException(`Property ${propertyId} not found after update`);
    }

    this.logger.log(
      closesAnOpenVisit
        ? `Site survey completed for property ${propertyId} by user ${userId}, closing its open site visit`
        : `Site survey completed for property ${propertyId} by user ${userId}`,
    );
    return updated;
  }

  /**
   * Cancel the site activity for a property.
   */
  async cancelSiteActivity(propertyId: string, userId: string): Promise<CustomerPropertyEntity> {
    const property = await this.propertyRepository.findByIdAndOrganization(propertyId);
    if (!property) {
      throw new NotFoundException(`Property ${propertyId} not found`);
    }

    if (property.siteStatus === SiteStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed site activity');
    }

    if (property.siteStatus === SiteStatus.CANCELLED) {
      throw new BadRequestException('Site activity is already cancelled');
    }

    const updates: Partial<CustomerPropertyEntity> = {
      siteStatus: SiteStatus.CANCELLED,
      updatedBy: userId,
    };

    const updated = await this.propertyRepository.update(propertyId, updates);
    if (!updated) {
      throw new NotFoundException(`Property ${propertyId} not found after update`);
    }

    this.logger.log(`Site activity cancelled for property ${propertyId} by user ${userId}`);
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
