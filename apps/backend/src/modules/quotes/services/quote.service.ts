import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type GstConfig,
  PaymentMilestone,
  PaymentMilestoneStage,
  type PaymentMilestoneConfig,
  type PricingBreakdown,
  ProjectType,
  QuoteStatus,
} from '@oneohm-epc/shared-types';
import { DataSource } from 'typeorm';

import {
  QuoteConfigurationRepository,
  SubsidyConfigurationRepository,
} from '../../master-data/repositories';
import { OrganizationRepository } from '../../organizations/repositories/organization.repository';
import { CreateQuoteDto, QuoteQueryDto, UpdateQuoteDto, UpdateQuoteStatusDto } from '../dto';
import { QuoteLineItemEntity } from '../entities/quote-line-item.entity';
import { QuoteVersionEntity } from '../entities/quote-version.entity';
import { QuoteEntity } from '../entities/quote.entity';
import { QuoteLineItemRepository, QuoteRepository, QuoteVersionRepository } from '../repositories';

/**
 * Quote Service
 * Business logic for quote management
 */
@Injectable()
export class QuoteService {
  constructor(
    private readonly quoteRepository: QuoteRepository,
    private readonly quoteVersionRepository: QuoteVersionRepository,
    private readonly lineItemRepository: QuoteLineItemRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly quoteConfigRepo: QuoteConfigurationRepository,
    private readonly subsidyConfigRepo: SubsidyConfigurationRepository,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a new quote with initial version
   */
  async create(
    organizationId: string,
    createDto: CreateQuoteDto,
    createdBy: string,
  ): Promise<QuoteEntity> {
    const org = await this.organizationRepository.findOneById(organizationId);

    if (!org) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    const customerExists = await this.dataSource
      .getRepository('customer_profiles')
      .createQueryBuilder('c')
      .where('c.id = :id', { id: createDto.customerId })
      .andWhere('c.deleted_at IS NULL')
      .getCount();

    if (!customerExists) {
      throw new NotFoundException(`Customer with ID ${createDto.customerId} not found`);
    }

    const quoteConfig = await this.quoteConfigRepo.getOrCreateDefault(organizationId);

    const discount = createDto.discountAmount || 0;

    // Use pre-calculated pricing if provided, otherwise recalculate from line items
    let pricingBreakdown: PricingBreakdown;
    let finalPrice: number;

    if (createDto.pricingBreakdown) {
      pricingBreakdown = createDto.pricingBreakdown;
      finalPrice = createDto.finalPrice ?? pricingBreakdown.totalPrice - discount;
    } else {
      const calculated = this.calculatePricing(createDto.lineItems, discount, quoteConfig.gstConfig);
      pricingBreakdown = calculated.pricingBreakdown;
      finalPrice = calculated.finalPrice;
    }

    // Subsidy
    const isSubsidyApplicable = createDto.calculatorInputs?.subsidyApplicable ?? false;
    const subsidyAmount =
      pricingBreakdown.subsidyAmount ??
      (isSubsidyApplicable
        ? await this.calculateSubsidy(organizationId, createDto.systemSizeKw, createDto.projectType)
        : 0);

    // Update breakdown with subsidy info if not already set
    if (!createDto.pricingBreakdown) {
      pricingBreakdown.subsidyAmount = subsidyAmount;
      pricingBreakdown.isSubsidyApplicable = isSubsidyApplicable;
      pricingBreakdown.discountAmount = discount;
    }

    const effectivePrice = createDto.effectivePrice ?? finalPrice - subsidyAmount;

    const paymentMilestones =
      createDto.paymentMilestones ||
      this.generatePaymentMilestones(finalPrice, quoteConfig.paymentMilestones);

    const quoteId = await this.dataSource.transaction(async (manager) => {
      const quoteRepo = manager.getRepository(QuoteEntity);
      const versionRepo = manager.getRepository(QuoteVersionEntity);
      const lineItemRepo = manager.getRepository(QuoteLineItemEntity);

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
          currentVersion: 1,
          status: QuoteStatus.DRAFT,
          internalNotes: createDto.internalNotes,
          customerNotes: createDto.customerNotes,
          createdBy,
        }),
      );

      const version = await versionRepo.save(
        versionRepo.create({
          quoteId: quote.id,
          versionNumber: 1,
          systemType: createDto.systemType,
          systemSizeKw: createDto.systemSizeKw,
          totalWattageWp: createDto.totalWattageWp,
          projectType: createDto.projectType,
          finalPrice,
          effectivePrice,
          calculatorInputs: createDto.calculatorInputs,
          pricingBreakdown,
          configSnapshot: createDto.configSnapshot,
          paymentMilestones,
          projectCompletionWeeks: createDto.projectCompletionWeeks || quoteConfig.defaultCompletionWeeks,
          isCurrent: true,
          createdBy,
        }),
      );

      const lineItemsData = createDto.lineItems.map((item, index) =>
        lineItemRepo.create({
          quoteVersionId: version.id,
          productId: item.productId,
          itemCategory: item.itemCategory,
          itemName: item.itemName,
          itemDescription: item.itemDescription,
          specifications: item.specifications,
          quantity: item.quantity,
          unitOfMeasure: item.unitOfMeasure,
          unitPrice: item.unitPrice,
          lineTotal: Math.round(item.quantity * item.unitPrice * 100) / 100,
          taxRate: item.taxRate,
          taxAmount: item.taxRate
            ? Math.round(((item.quantity * item.unitPrice * item.taxRate) / 100) * 100) / 100
            : 0,
          displayOrder: item.displayOrder !== undefined ? item.displayOrder : index,
        }),
      );

      await lineItemRepo.save(lineItemsData);

      return quote.id;
    });

    return this.quoteRepository.findById(quoteId, organizationId);
  }

  /**
   * Get payment milestones for a given org (fetches config from DB).
   */
  async getPaymentMilestones(organizationId: string, finalPrice: number): Promise<PaymentMilestone[]> {
    const quoteConfig = await this.quoteConfigRepo.getOrCreateDefault(organizationId);
    return this.generatePaymentMilestones(finalPrice, quoteConfig.paymentMilestones);
  }

  /**
   * Find all quotes with filters, sorting, and pagination
   */
  async findAll(
    organizationId: string,
    query: QuoteQueryDto,
  ): Promise<{ data: QuoteEntity[]; total: number }>;
  async findAll(
    organizationId: string,
    page: number,
    limit: number,
    filters?: {
      status?: QuoteStatus;
      customerId?: string;
      propertyId?: string;
      salesPersonId?: string;
      resellerId?: string;
      fromDate?: string;
      toDate?: string;
      search?: string;
    },
  ): Promise<{ data: QuoteEntity[]; total: number }>;
  async findAll(
    organizationId: string,
    pageOrQuery: number | QuoteQueryDto = 1,
    limit = 20,
    filters?: {
      status?: QuoteStatus;
      customerId?: string;
      propertyId?: string;
      salesPersonId?: string;
      resellerId?: string;
      fromDate?: string;
      toDate?: string;
      search?: string;
    },
  ): Promise<{ data: QuoteEntity[]; total: number }> {
    if (typeof pageOrQuery === 'object') {
      const [data, total] = await this.quoteRepository.findWithFilters(organizationId, pageOrQuery);
      return { data, total };
    }

    const legacyQuery = new QuoteQueryDto();
    legacyQuery.page = pageOrQuery;
    legacyQuery.limit = limit;
    if (filters?.status) legacyQuery.status = filters.status;
    if (filters?.customerId) legacyQuery.customerId = filters.customerId;
    if (filters?.propertyId) legacyQuery.propertyId = filters.propertyId;
    if (filters?.salesPersonId) legacyQuery.salesPersonId = filters.salesPersonId;
    if (filters?.resellerId) legacyQuery.resellerId = filters.resellerId;
    if (filters?.fromDate) legacyQuery.fromDate = filters.fromDate;
    if (filters?.toDate) legacyQuery.toDate = filters.toDate;
    if (filters?.search) legacyQuery.search = filters.search;

    const [data, total] = await this.quoteRepository.findWithFilters(organizationId, legacyQuery);
    return { data, total };
  }

  /**
   * Find quote by ID
   */
  async findById(id: string, organizationId: string): Promise<QuoteEntity> {
    return this.quoteRepository.findById(id, organizationId);
  }

  /**
   * Update quote (creates new version)
   */
  async update(
    id: string,
    organizationId: string,
    updateDto: UpdateQuoteDto,
    updatedBy: string,
  ): Promise<QuoteEntity> {
    const quote = await this.quoteRepository.findById(id, organizationId);

    if ([QuoteStatus.ACCEPTED, QuoteStatus.REJECTED].includes(quote.status)) {
      throw new BadRequestException('Cannot update accepted or rejected quotes');
    }

    const quoteConfig = await this.quoteConfigRepo.getOrCreateDefault(organizationId);

    const newVersionNumber = quote.currentVersion + 1;

    if (quoteConfig.maxVersions != null && quoteConfig.maxVersions > 0 && newVersionNumber > quoteConfig.maxVersions) {
      throw new BadRequestException(
        `Maximum number of versions (${quoteConfig.maxVersions}) reached for this quote`,
      );
    }

    const currentVersion = await this.quoteVersionRepository.getCurrentVersion(quote.id);

    if (!currentVersion) {
      throw new NotFoundException('Current quote version not found');
    }

    // Resolve values: DTO overrides > current version fallbacks
    const systemType = updateDto.systemType || currentVersion.systemType;
    const systemSizeKw = updateDto.systemSizeKw || currentVersion.systemSizeKw;
    const totalWattageWp = updateDto.totalWattageWp || currentVersion.totalWattageWp;
    const projectType = updateDto.projectType || currentVersion.projectType;

    // Calculate pricing
    let pricingBreakdown: PricingBreakdown;
    let finalPrice: number;

    if (updateDto.pricingBreakdown) {
      pricingBreakdown = updateDto.pricingBreakdown;
      finalPrice = pricingBreakdown.totalPrice - (pricingBreakdown.discountAmount ?? 0);
    } else if (updateDto.lineItems) {
      const discountAmount = currentVersion.pricingBreakdown?.discountAmount ?? 0;
      const calculated = this.calculatePricing(updateDto.lineItems, discountAmount, quoteConfig.gstConfig);
      pricingBreakdown = calculated.pricingBreakdown;
      finalPrice = calculated.finalPrice;
    } else {
      pricingBreakdown = currentVersion.pricingBreakdown;
      finalPrice = currentVersion.finalPrice;
    }

    // Subsidy: respect DTO-provided value first, then fall back to DB calculation
    const isSubsidyApplicable =
      updateDto.calculatorInputs?.subsidyApplicable ??
      currentVersion.pricingBreakdown?.isSubsidyApplicable ??
      false;

    const subsidy = isSubsidyApplicable
      ? (updateDto.pricingBreakdown?.subsidyAmount ??
        (await this.calculateSubsidy(organizationId, systemSizeKw, projectType)))
      : 0;

    // Update breakdown subsidy fields if recalculated
    if (!updateDto.pricingBreakdown) {
      pricingBreakdown = {
        ...pricingBreakdown,
        subsidyAmount: subsidy,
        isSubsidyApplicable,
      };
    }

    const effectivePrice = finalPrice - subsidy;

    await this.dataSource.transaction(async (manager) => {
      const quoteRepo = manager.getRepository(QuoteEntity);
      const versionRepo = manager.getRepository(QuoteVersionEntity);
      const lineItemRepo = manager.getRepository(QuoteLineItemEntity);

      // Only update identity/lifecycle fields on the quotes table
      await quoteRepo.update(
        { id, organizationId },
        {
          salesPersonId: updateDto.salesPersonId,
          resellerId: updateDto.resellerId,
          validUntil: updateDto.validUntil ? new Date(updateDto.validUntil) : undefined,
          internalNotes: updateDto.internalNotes,
          customerNotes: updateDto.customerNotes,
          currentVersion: newVersionNumber,
          updatedBy,
        },
      );

      // Mark old versions as not current
      await versionRepo.update({ quoteId: quote.id, isCurrent: true }, { isCurrent: false });

      // Create new version with all calculation data
      const newVersion = await versionRepo.save(
        versionRepo.create({
          quoteId: quote.id,
          versionNumber: newVersionNumber,
          systemType,
          systemSizeKw,
          totalWattageWp,
          projectType,
          finalPrice,
          effectivePrice,
          calculatorInputs: updateDto.calculatorInputs || currentVersion.calculatorInputs,
          pricingBreakdown,
          configSnapshot: currentVersion.configSnapshot,
          paymentMilestones:
            updateDto.paymentMilestones ||
            currentVersion?.paymentMilestones ||
            this.generatePaymentMilestones(finalPrice, quoteConfig.paymentMilestones),
          projectCompletionWeeks:
            updateDto.projectCompletionWeeks || currentVersion?.projectCompletionWeeks || quoteConfig.defaultCompletionWeeks,
          changeSummary: updateDto.changeSummary,
          isCurrent: true,
          createdBy: updatedBy,
        }),
      );

      // Create line items for new version
      if (updateDto.lineItems) {
        const lineItemsData = updateDto.lineItems.map((item, index) =>
          lineItemRepo.create({
            quoteVersionId: newVersion.id,
            productId: item.productId,
            itemCategory: item.itemCategory,
            itemName: item.itemName,
            itemDescription: item.itemDescription,
            specifications: item.specifications,
            quantity: item.quantity,
            unitOfMeasure: item.unitOfMeasure,
            unitPrice: item.unitPrice,
            lineTotal: Math.round(item.quantity * item.unitPrice * 100) / 100,
            taxRate: item.taxRate,
            taxAmount: item.taxRate
              ? Math.round(((item.quantity * item.unitPrice * item.taxRate) / 100) * 100) / 100
              : 0,
            displayOrder: item.displayOrder !== undefined ? item.displayOrder : index,
          }),
        );
        await lineItemRepo.save(lineItemsData);
      } else if (currentVersion) {
        const oldLineItems = await lineItemRepo.find({
          where: { quoteVersionId: currentVersion.id },
        });
        const newLineItemsData = oldLineItems.map((item) =>
          lineItemRepo.create({
            quoteVersionId: newVersion.id,
            productId: item.productId,
            itemCategory: item.itemCategory,
            itemName: item.itemName,
            itemDescription: item.itemDescription,
            specifications: item.specifications,
            quantity: item.quantity,
            unitOfMeasure: item.unitOfMeasure,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
            taxRate: item.taxRate,
            taxAmount: item.taxAmount,
            displayOrder: item.displayOrder,
          }),
        );
        await lineItemRepo.save(newLineItemsData);
      }
    });

    return this.quoteRepository.findById(id, organizationId);
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

    return this.quoteRepository.update(id, organizationId, updateData);
  }

  /**
   * Find a specific version of a quote, with line items.
   * Validates quote ownership by organizationId to prevent IDOR.
   */
  async findVersionById(
    quoteId: string,
    versionId: string,
    organizationId: string,
  ): Promise<import('../entities/quote-version.entity').QuoteVersionEntity> {
    // First verify the quote belongs to this organization
    await this.quoteRepository.findById(quoteId, organizationId);

    const version = await this.quoteVersionRepository.findByIdAndQuoteId(versionId, quoteId);

    if (!version) {
      throw new NotFoundException(`Version with ID ${versionId} not found for quote ${quoteId}`);
    }

    return version;
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
   */
  private generatePaymentMilestones(
    finalPrice: number,
    milestoneConfigs: PaymentMilestoneConfig[],
  ): PaymentMilestone[] {
    return milestoneConfigs.map((config) => ({
      stage: config.stage as PaymentMilestoneStage,
      name: config.name,
      percentage: config.percentage,
      amount: Math.round(finalPrice * (config.percentage / 100) * 100) / 100,
      order: config.order,
    }));
  }

  /**
   * Calculate subsidy using tiered rates from DB (matches QuoteCalculatorService logic).
   */
  private async calculateSubsidy(
    organizationId: string,
    systemSizeKw: number,
    projectType: ProjectType,
  ): Promise<number> {
    const subsidyConfig = await this.subsidyConfigRepo.findActiveByProjectType(
      organizationId,
      projectType,
    );

    if (!subsidyConfig) return 0;

    let totalAmount = 0;
    let remainingKw = Math.min(systemSizeKw, Number(subsidyConfig.maxSubsidyKw));
    const sortedTiers = [...(subsidyConfig.tiers || [])].sort((a, b) => a.fromKw - b.fromKw);

    for (const tier of sortedTiers) {
      if (remainingKw <= 0) break;
      const tierMaxKw = (tier.toKw !== null ? tier.toKw : Infinity) - tier.fromKw;
      const kwInTier = Math.min(remainingKw, tierMaxKw);
      if (kwInTier > 0) {
        totalAmount += kwInTier * tier.ratePerKw;
        remainingKw -= kwInTier;
      }
    }

    const maxAmount = Number(subsidyConfig.maxSubsidyAmount) || Infinity;
    return Math.min(totalAmount, maxAmount);
  }

  /**
   * Calculate pricing from line items using org-level GST config.
   */
  private calculatePricing(
    lineItems: Array<{ quantity: number; unitPrice: number }>,
    discountAmount: number,
    gstConfig: GstConfig,
  ): { pricingBreakdown: PricingBreakdown; finalPrice: number } {
    const basePrice = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    const portion1 = (basePrice * gstConfig.rate1Percentage) / 100;
    const portion2 = (basePrice * gstConfig.rate2Percentage) / 100;

    const gst12On70Percent = (portion1 * gstConfig.rate1) / 100;
    const gst18On30Percent = (portion2 * gstConfig.rate2) / 100;
    const totalGst = gst12On70Percent + gst18On30Percent;

    const totalPrice = basePrice + totalGst;
    const finalPrice = totalPrice - discountAmount;

    return {
      pricingBreakdown: {
        basePrice: Math.round(basePrice * 100) / 100,
        gst12On70Percent: Math.round(gst12On70Percent * 100) / 100,
        gst18On30Percent: Math.round(gst18On30Percent * 100) / 100,
        totalGst: Math.round(totalGst * 100) / 100,
        totalPrice: Math.round(totalPrice * 100) / 100,
        discountAmount: Math.round(discountAmount * 100) / 100,
        subsidyAmount: 0,
        isSubsidyApplicable: false,
      },
      finalPrice: Math.round(finalPrice * 100) / 100,
    };
  }
}
