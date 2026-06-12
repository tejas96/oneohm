import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CustomerStatus,
  type CalculatorInputs,
  IntegrationStatus,
  PaymentMilestone,
  type PaymentMilestoneConfig,
  type PricingBreakdown,
  DocumentEntityType,
  MessageType,
  ProjectType,
  type QuoteCalculationOutput,
  type QuoteSnapshot,
  QuoteStatus,
} from '@oneohm-epc/shared/types';
import { DataSource } from 'typeorm';

import { DocumentService } from '../../documents/services';
import { IntegrationService } from '../../integrations/services';
import {
  QuoteConfigurationRepository,
  SubsidyConfigurationRepository,
} from '../../master-data/repositories';
import {
  CONSUMER_EVENTS,
  QuotationCreatedEvent,
} from '../../notifications/events/consumer-notification.events';
import { OrganizationRepository } from '../../organizations/repositories/organization.repository';
import {
  CreateQuoteDto,
  QuoteQueryDto,
  ShareQuoteWhatsappDto,
  UpdateQuoteDto,
  UpdateQuoteStatusDto,
} from '../dto';
import { QuoteVersionEntity } from '../entities/quote-version.entity';
import { QuoteEntity } from '../entities/quote.entity';
import { QuoteRepository } from '../repositories';

const CENTS_ROUNDING_FACTOR = 100;

/**
 * Quote Service
 * Business logic for quote management
 */
@Injectable()
export class QuoteService {
  constructor(
    private readonly quoteRepository: QuoteRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly quoteConfigRepo: QuoteConfigurationRepository,
    private readonly subsidyConfigRepo: SubsidyConfigurationRepository,
    private readonly documentService: DocumentService,
    private readonly integrationService: IntegrationService,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a new quote with initial version
   */
  async create(
    organizationId: string,
    createDto: CreateQuoteDto,
    createdBy: string,
  ): Promise<QuoteEntity & { versionId: string }> {
    if (!createDto.propertyId) {
      throw new BadRequestException('Property ID is required to create a quote');
    }

    const org = await this.organizationRepository.findOneById(organizationId);

    if (!org) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    if (createDto.propertyId) {
      const accepted = await this.quoteRepository.findAcceptedByPropertyId(
        createDto.propertyId,
        organizationId,
      );
      if (accepted) {
        throw new BadRequestException(
          `Property already has an accepted quote (${accepted.quoteNumber}). No new quotes can be created.`,
        );
      }
    }

    const customer = await this.dataSource
      .getRepository('customer_profiles')
      .createQueryBuilder('c')
      .select(['c.id AS id', 'c.status AS status'])
      .where('c.id = :id', { id: createDto.customerId })
      .andWhere('c.organization_id = :organizationId', { organizationId })
      .andWhere('c.deleted_at IS NULL')
      .getRawOne<{ id: string; status: CustomerStatus }>();

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${createDto.customerId} not found`);
    }
    if (customer.status === CustomerStatus.INACTIVE) {
      throw new BadRequestException('Cannot perform this action: customer is inactive');
    }

    const quoteConfig = await this.quoteConfigRepo.getOrCreateDefault(organizationId);

    if (!createDto.quoteSnapshot?.pricing) {
      throw new BadRequestException('quoteSnapshot with pricing is required');
    }
    this.assertDiscountWithinMargin(createDto.quoteSnapshot);

    const snapshot = createDto.quoteSnapshot;
    const pricingBreakdown = snapshot.pricing;
    const finalPrice = createDto.finalPrice ?? pricingBreakdown.totalPrice;

    const isSubsidyApplicable = snapshot.inputs?.subsidyApplicable ?? false;
    const subsidyAmount =
      pricingBreakdown.subsidyAmount ??
      (isSubsidyApplicable
        ? await this.calculateSubsidy(organizationId, createDto.systemSizeKw, createDto.projectType)
        : 0);

    const effectivePrice = createDto.effectivePrice ?? Math.max(0, finalPrice - subsidyAmount);

    const paymentMilestones =
      createDto.paymentMilestones ||
      this.generatePaymentMilestones(pricingBreakdown.totalPrice, quoteConfig.paymentMilestones);

    const result = await this.dataSource.transaction(async (manager) => {
      const quoteRepo = manager.getRepository(QuoteEntity);
      const versionRepo = manager.getRepository(QuoteVersionEntity);

      const quoteNumber = await this.quoteRepository.generateQuoteNumber(org.code, manager);

      const quote = await quoteRepo.save(
        quoteRepo.create({
          organizationId,
          customerId: createDto.customerId,
          propertyId: createDto.propertyId,
          salesPersonId: createDto.salesPersonId,
          resellerId: createDto.resellerId,
          quoteNumber,
          quoteDate: createDto.quoteDate ? new Date(createDto.quoteDate) : new Date(),
          validUntil: new Date(createDto.validUntil),
          status: QuoteStatus.DRAFT,
          internalNotes: createDto.internalNotes,
          customerNotes: createDto.customerNotes,
          createdBy,
        }),
      );

      const savedVersion = await versionRepo.save(
        versionRepo.create({
          quoteId: quote.id,
          versionNumber: 1,
          systemType: createDto.systemType,
          systemSizeKw: createDto.systemSizeKw,
          totalWattageWp: createDto.totalWattageWp,
          projectType: createDto.projectType,
          finalPrice,
          effectivePrice,
          quoteSnapshot: snapshot,
          paymentMilestones,
          projectCompletionWeeks:
            createDto.projectCompletionWeeks || quoteConfig.defaultCompletionWeeks,
          createdBy,
        }),
      );

      return { quoteId: quote.id, versionId: savedVersion.id };
    });

    const quote = await this.quoteRepository.findById(result.quoteId, organizationId);
    return Object.assign(quote, { versionId: result.versionId });
  }

  /**
   * Get payment milestones for a given org (fetches config from DB).
   * @param grossTotal - Total price before discount and subsidy
   */
  async getPaymentMilestones(
    organizationId: string,
    grossTotal: number,
  ): Promise<PaymentMilestone[]> {
    const quoteConfig = await this.quoteConfigRepo.getOrCreateDefault(organizationId);
    return this.generatePaymentMilestones(grossTotal, quoteConfig.paymentMilestones);
  }

  /**
   * Find all quotes with filters, sorting, and pagination
   */
  async findAll(
    organizationId: string,
    query: QuoteQueryDto,
  ): Promise<{ data: QuoteEntity[]; total: number }> {
    const [data, total] = await this.quoteRepository.findWithFilters(organizationId, query);
    return { data, total };
  }

  /**
   * Find quote by ID
   */
  async findById(id: string, organizationId: string): Promise<QuoteEntity> {
    return this.quoteRepository.findById(id, organizationId);
  }

  async shareOnWhatsapp(
    id: string,
    organizationId: string,
    dto: ShareQuoteWhatsappDto,
    updatedBy: string,
  ) {
    const quote = await this.quoteRepository.findById(id, organizationId);
    const recipient = dto.to || quote.customer?.phone;

    if (!recipient) {
      throw new BadRequestException('Recipient phone number is required');
    }

    const document = dto.documentId
      ? await this.documentService.findById(dto.documentId, organizationId)
      : await this.findLatestQuotePdf(id, organizationId);

    const documentUrl = dto.documentUrl || document?.fileUrl;
    if (!documentUrl) {
      throw new BadRequestException('A public quote PDF URL is required');
    }

    const filename = dto.filename || document?.fileName || `${quote.quoteNumber}.pdf`;
    const validUntil = quote.validUntil
      ? new Date(quote.validUntil).toLocaleDateString('en-IN')
      : '';
    const customerName = [quote.customer?.firstName, quote.customer?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    const result = await this.integrationService.sendTemplateMessage(organizationId, {
      to: recipient,
      type: MessageType.TEMPLATE,
      templateName: 'quotation_pdf',
      templateLanguage: 'en',
      templateParameters: {
        header: {
          type: 'document',
          link: documentUrl,
          filename,
        },
        body: {
          customer_name: customerName || 'Customer',
          quot_no: quote.quoteNumber,
          valid_date: validUntil,
        },
      },
      metadata: {
        quoteId: id,
        quoteNumber: quote.quoteNumber,
        documentId: document?.id,
      },
    });

    if (quote.status === QuoteStatus.DRAFT && result.status !== IntegrationStatus.FAILED) {
      await this.quoteRepository.update(id, organizationId, {
        status: QuoteStatus.SENT,
        updatedBy,
      });

      // Notify consumer that quotation is ready (guard propertyId)
      if (quote.propertyId && quote.customerId) {
        this.eventEmitter.emit(
          CONSUMER_EVENTS.QUOTATION_CREATED,
          new QuotationCreatedEvent(
            organizationId,
            id,
            quote.propertyId,
            quote.customerId,
            quote.quoteNumber,
          ),
        );
      }
    }

    return result;
  }

  private async findLatestQuotePdf(id: string, organizationId: string) {
    const documents = await this.documentService.findByEntity(
      DocumentEntityType.QUOTE,
      id,
      organizationId,
    );

    return documents.find((document) => document.mimeType === 'application/pdf') || documents[0];
  }

  async findAllByPropertyId(propertyId: string, organizationId: string): Promise<QuoteEntity[]> {
    return this.quoteRepository.findAllByPropertyId(propertyId, organizationId);
  }

  /**
   * Update quote (creates new version)
   */
  async update(
    id: string,
    organizationId: string,
    updateDto: UpdateQuoteDto,
    updatedBy: string,
  ): Promise<QuoteEntity & { versionId: string }> {
    const quote = await this.quoteRepository.findById(id, organizationId);

    if ([QuoteStatus.ACCEPTED, QuoteStatus.REJECTED].includes(quote.status)) {
      throw new BadRequestException('Cannot update accepted or rejected quotes');
    }

    const quoteConfig = await this.quoteConfigRepo.getOrCreateDefault(organizationId);

    const latestVersionNumber = Math.max(...(quote.versions?.map((v) => v.versionNumber) ?? [0]));
    const newVersionNumber = latestVersionNumber + 1;

    if (
      quoteConfig.maxVersions != null &&
      quoteConfig.maxVersions > 0 &&
      newVersionNumber > quoteConfig.maxVersions
    ) {
      throw new BadRequestException(
        `Maximum number of versions (${quoteConfig.maxVersions}) reached for this quote`,
      );
    }

    const latestVersion =
      [...(quote.versions ?? [])].sort((a, b) => {
        const createdDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (createdDiff !== 0) return createdDiff;
        return b.versionNumber - a.versionNumber;
      })[0] ?? null;

    if (!latestVersion) {
      throw new NotFoundException('Latest quote version not found');
    }

    // Resolve values: DTO overrides > latest version fallbacks
    const systemType = updateDto.systemType || latestVersion.systemType;
    const systemSizeKw = updateDto.systemSizeKw || latestVersion.systemSizeKw;
    const totalWattageWp = updateDto.totalWattageWp || latestVersion.totalWattageWp;
    const projectType = (updateDto.projectType || latestVersion.projectType) as ProjectType;

    let pricingBreakdown: PricingBreakdown;
    let finalPrice: number;

    if (updateDto.quoteSnapshot?.pricing) {
      pricingBreakdown = updateDto.quoteSnapshot.pricing;
      finalPrice = updateDto.finalPrice ?? pricingBreakdown.totalPrice;
    } else {
      pricingBreakdown = latestVersion.quoteSnapshot?.pricing ?? ({} as PricingBreakdown);
      finalPrice = latestVersion.finalPrice;
    }

    const isSubsidyApplicable =
      updateDto.quoteSnapshot?.inputs?.subsidyApplicable ??
      latestVersion.quoteSnapshot?.pricing?.isSubsidyApplicable ??
      false;

    const subsidy = isSubsidyApplicable
      ? (updateDto.quoteSnapshot?.pricing?.subsidyAmount ??
        (await this.calculateSubsidy(organizationId, systemSizeKw, projectType)))
      : 0;

    if (!updateDto.quoteSnapshot?.pricing) {
      pricingBreakdown = {
        ...pricingBreakdown,
        subsidyAmount: subsidy,
        isSubsidyApplicable,
      };
    }

    const effectivePrice = updateDto.effectivePrice ?? Math.max(0, finalPrice - subsidy);

    const newSnapshot: QuoteSnapshot = {
      inputs:
        updateDto.quoteSnapshot?.inputs ??
        latestVersion.quoteSnapshot?.inputs ??
        ({} as CalculatorInputs),
      calculation:
        updateDto.quoteSnapshot?.calculation ??
        latestVersion.quoteSnapshot?.calculation ??
        ({} as QuoteCalculationOutput),
      pricing: pricingBreakdown,
      discountAmount: pricingBreakdown.discountAmount ?? 0,
    };

    const versionId = await this.dataSource.transaction(async (manager) => {
      const quoteRepo = manager.getRepository(QuoteEntity);
      const versionRepo = manager.getRepository(QuoteVersionEntity);

      await quoteRepo.update(
        { id, organizationId },
        {
          salesPersonId: updateDto.salesPersonId,
          resellerId: updateDto.resellerId,
          validUntil: updateDto.validUntil ? new Date(updateDto.validUntil) : undefined,
          internalNotes: updateDto.internalNotes,
          customerNotes: updateDto.customerNotes,
          updatedBy,
        },
      );

      const savedVersion = await versionRepo.save(
        versionRepo.create({
          quoteId: quote.id,
          versionNumber: newVersionNumber,
          systemType,
          systemSizeKw,
          totalWattageWp,
          projectType,
          finalPrice,
          effectivePrice,
          quoteSnapshot: newSnapshot,
          paymentMilestones:
            updateDto.paymentMilestones ||
            (updateDto.quoteSnapshot?.pricing && latestVersion.paymentMilestones
              ? this.recalculateMilestoneAmounts(latestVersion.paymentMilestones, finalPrice)
              : latestVersion.paymentMilestones) ||
            this.generatePaymentMilestones(finalPrice, quoteConfig.paymentMilestones),
          projectCompletionWeeks:
            updateDto.projectCompletionWeeks ||
            latestVersion.projectCompletionWeeks ||
            quoteConfig.defaultCompletionWeeks,
          changeSummary: updateDto.changeSummary,
          createdBy: updatedBy,
        }),
      );

      return savedVersion.id;
    });

    const updated = await this.quoteRepository.findById(id, organizationId);
    return Object.assign(updated, { versionId });
  }

  /**
   * Update quote status
   */
  async updateStatus(
    id: string,
    organizationId: string,
    statusDto: UpdateQuoteStatusDto,
    updatedBy: string,
  ): Promise<QuoteEntity> {
    const quote = await this.quoteRepository.findById(id, organizationId);

    if (quote.propertyId) {
      const accepted = await this.quoteRepository.findAcceptedByPropertyId(
        quote.propertyId,
        organizationId,
        quote.id,
      );
      if (accepted) {
        throw new BadRequestException(
          `Another quote for this property has already been accepted (${accepted.quoteNumber}). Status changes are locked.`,
        );
      }
    }

    this.validateStatusTransition(quote.status, statusDto.status);

    if (statusDto.status === QuoteStatus.REJECTED && !statusDto.rejectionReason) {
      throw new BadRequestException('Rejection reason is required when rejecting a quote');
    }

    if (statusDto.status === QuoteStatus.ACCEPTED && !statusDto.customerSignature) {
      throw new BadRequestException('Customer signature is required when accepting a quote');
    }

    const updateData: Partial<QuoteEntity> = {
      status: statusDto.status,
      updatedBy,
    };

    if (statusDto.status === QuoteStatus.ACCEPTED) {
      updateData.acceptedAt = new Date();
      updateData.acceptedByCustomerSignature = statusDto.customerSignature;
    }

    if (statusDto.status === QuoteStatus.REJECTED) {
      updateData.rejectionReason = statusDto.rejectionReason;
    }

    const result = await this.quoteRepository.update(id, organizationId, updateData);

    if (statusDto.status === QuoteStatus.SENT) {
      // Notify consumer that quotation is ready (guard propertyId)
      if (quote.propertyId && quote.customerId) {
        this.eventEmitter.emit(
          CONSUMER_EVENTS.QUOTATION_CREATED,
          new QuotationCreatedEvent(
            organizationId,
            id,
            quote.propertyId,
            quote.customerId,
            quote.quoteNumber,
          ),
        );
      }
    }

    return result;
  }

  /**
   * Delete quote
   */
  async delete(id: string, organizationId: string): Promise<void> {
    const quote = await this.quoteRepository.findById(id, organizationId);

    if (quote.status === QuoteStatus.ACCEPTED) {
      throw new ForbiddenException('Cannot delete accepted quotes');
    }

    return this.quoteRepository.delete(id, organizationId);
  }

  /**
   * Check if a property is locked (has an accepted quote).
   */
  async getPropertyLockStatus(
    propertyId: string,
    organizationId: string,
  ): Promise<{ locked: boolean; acceptedQuoteNumber?: string }> {
    const accepted = await this.quoteRepository.findAcceptedByPropertyId(
      propertyId,
      organizationId,
    );
    return {
      locked: !!accepted,
      acceptedQuoteNumber: accepted?.quoteNumber,
    };
  }

  /**
   * Mark expired quotes (for cron job)
   */
  async markExpiredQuotes(): Promise<number> {
    const expiredQuotes = await this.quoteRepository.findExpiredQuotes();

    if (expiredQuotes.length > 0) {
      const quoteIds = expiredQuotes.map((q) => q.id);
      await this.quoteRepository.bulkUpdateStatus(quoteIds, QuoteStatus.EXPIRED);
    }

    return expiredQuotes.length;
  }

  /**
   * Validate status transitions
   */
  private validateStatusTransition(currentStatus: QuoteStatus, newStatus: QuoteStatus): void {
    const validTransitions: Record<QuoteStatus, QuoteStatus[]> = {
      [QuoteStatus.DRAFT]: [QuoteStatus.SENT],
      [QuoteStatus.SENT]: [
        QuoteStatus.VIEWED,
        QuoteStatus.ACCEPTED,
        QuoteStatus.REJECTED,
        QuoteStatus.EXPIRED,
      ],
      [QuoteStatus.VIEWED]: [QuoteStatus.ACCEPTED, QuoteStatus.REJECTED, QuoteStatus.EXPIRED],
      [QuoteStatus.ACCEPTED]: [],
      [QuoteStatus.REJECTED]: [],
      [QuoteStatus.EXPIRED]: [],
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(`Cannot transition from ${currentStatus} to ${newStatus}`);
    }
  }

  /**
   * Generate payment milestones from org-level config.
   * @param grossTotal - Total price before discount and subsidy
   */
  private generatePaymentMilestones(
    grossTotal: number,
    milestoneConfigs: PaymentMilestoneConfig[],
  ): PaymentMilestone[] {
    return milestoneConfigs.map((config) => ({
      stage: config.stage,
      name: config.name,
      percentage: config.percentage,
      amount:
        Math.round(grossTotal * (config.percentage / 100) * CENTS_ROUNDING_FACTOR) /
        CENTS_ROUNDING_FACTOR,
      order: config.order,
    }));
  }

  /**
   * Recalculate milestone amounts from existing percentages with a new total.
   * Used when pricing changes on revision but milestones are not explicitly re-sent.
   */
  private recalculateMilestoneAmounts(
    existingMilestones: PaymentMilestone[],
    newTotal: number,
  ): PaymentMilestone[] {
    return existingMilestones.map((m) => ({
      ...m,
      amount:
        Math.round(newTotal * (m.percentage / 100) * CENTS_ROUNDING_FACTOR) / CENTS_ROUNDING_FACTOR,
    }));
  }

  private assertDiscountWithinMargin(snapshot: QuoteSnapshot): void {
    const discountAmount = Number(snapshot.discountAmount ?? snapshot.pricing?.discountAmount ?? 0);
    const calc = snapshot.calculation as { profitabilityAmount?: number } | undefined;
    const profitabilityAmount = Number(calc?.profitabilityAmount ?? 0);
    const maxAllowedDiscount = Math.max(0, profitabilityAmount * 0.5);

    if (discountAmount > maxAllowedDiscount) {
      throw new BadRequestException('Discount cannot exceed 50% of the margin');
    }
  }

  /**
   * Calculate subsidy using tiered rates from DB.
   * Uses dcrSizeKw (for DCR-requiring subsidies) instead of total systemSizeKw.
   */
  private async calculateSubsidy(
    organizationId: string,
    systemSizeKw: number,
    projectType: ProjectType,
  ): Promise<number> {
    const configs = await this.subsidyConfigRepo.findAllActiveByProjectType(
      organizationId,
      projectType,
    );

    if (configs.length === 0) return 0;

    let totalSubsidy = 0;

    for (const config of configs) {
      const eligibleKw = Math.min(systemSizeKw, Number(config.maxSubsidyKw));
      if (eligibleKw <= 0) continue;

      let amount = 0;
      let remainingKw = eligibleKw;
      const sortedTiers = [...(config.tiers || [])].sort((a, b) => a.fromKw - b.fromKw);

      for (const tier of sortedTiers) {
        if (remainingKw <= 0) break;
        const tierMaxKw = (tier.toKw !== null ? tier.toKw : Infinity) - tier.fromKw;
        const kwInTier = Math.min(remainingKw, tierMaxKw);
        if (kwInTier > 0) {
          amount += kwInTier * tier.ratePerKw;
          remainingKw -= kwInTier;
        }
      }

      const maxAmount = Number(config.maxSubsidyAmount) || Infinity;
      totalSubsidy += Math.min(amount, maxAmount);
    }

    return totalSubsidy;
  }
}
