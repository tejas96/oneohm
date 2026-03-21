import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentMilestone,
  type PaymentMilestoneConfig,
  type PricingBreakdown,
  ProjectType,
  QuoteStatus,
} from '@oneohm-epc/shared/types';
import { DataSource } from 'typeorm';

import {
  QuoteConfigurationRepository,
  SubsidyConfigurationRepository,
} from '../../master-data/repositories';
import { OrganizationRepository } from '../../organizations/repositories/organization.repository';
import { CreateQuoteDto, QuoteQueryDto, UpdateQuoteDto, UpdateQuoteStatusDto } from '../dto';
import { QuoteVersionEntity } from '../entities/quote-version.entity';
import { QuoteEntity } from '../entities/quote.entity';
import { QuoteRepository, QuoteVersionRepository } from '../repositories';

const CENTS_ROUNDING_FACTOR = 100;

/**
 * Quote Service
 * Business logic for quote management
 */
@Injectable()
export class QuoteService {
  constructor(
    private readonly quoteRepository: QuoteRepository,
    private readonly quoteVersionRepository: QuoteVersionRepository,
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
      .andWhere('c.organization_id = :organizationId', { organizationId })
      .andWhere('c.deleted_at IS NULL')
      .getCount();

    if (!customerExists) {
      throw new NotFoundException(`Customer with ID ${createDto.customerId} not found`);
    }

    const quoteConfig = await this.quoteConfigRepo.getOrCreateDefault(organizationId);

    if (!createDto.pricingBreakdown) {
      throw new BadRequestException('pricingBreakdown is required');
    }

    const pricingBreakdown = createDto.pricingBreakdown;
    const finalPrice = createDto.finalPrice ?? pricingBreakdown.totalPrice;

    const isSubsidyApplicable = createDto.calculatorInputs?.subsidyApplicable ?? false;
    const subsidyAmount =
      pricingBreakdown.subsidyAmount ??
      (isSubsidyApplicable
        ? await this.calculateSubsidy(organizationId, createDto.systemSizeKw, createDto.projectType)
        : 0);

    const effectivePrice = createDto.effectivePrice ?? Math.max(0, finalPrice - subsidyAmount);

    const paymentMilestones =
      createDto.paymentMilestones ||
      this.generatePaymentMilestones(pricingBreakdown.totalPrice, quoteConfig.paymentMilestones);

    const quoteId = await this.dataSource.transaction(async (manager) => {
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
          currentVersion: 1,
          status: QuoteStatus.DRAFT,
          internalNotes: createDto.internalNotes,
          customerNotes: createDto.customerNotes,
          createdBy,
        }),
      );

      await versionRepo.save(
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
          paymentMilestones,
          projectCompletionWeeks:
            createDto.projectCompletionWeeks || quoteConfig.defaultCompletionWeeks,
          isCurrent: true,
          createdBy,
        }),
      );

      return quote.id;
    });

    return this.quoteRepository.findById(quoteId, organizationId);
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

    if (
      quoteConfig.maxVersions != null &&
      quoteConfig.maxVersions > 0 &&
      newVersionNumber > quoteConfig.maxVersions
    ) {
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

    let pricingBreakdown: PricingBreakdown;
    let finalPrice: number;

    if (updateDto.pricingBreakdown) {
      pricingBreakdown = updateDto.pricingBreakdown;
      finalPrice = updateDto.finalPrice ?? pricingBreakdown.totalPrice;
    } else {
      pricingBreakdown = currentVersion.pricingBreakdown;
      finalPrice = currentVersion.finalPrice;
    }

    const isSubsidyApplicable =
      updateDto.calculatorInputs?.subsidyApplicable ??
      currentVersion.pricingBreakdown?.isSubsidyApplicable ??
      false;

    const subsidy = isSubsidyApplicable
      ? (updateDto.pricingBreakdown?.subsidyAmount ??
        (await this.calculateSubsidy(organizationId, systemSizeKw, projectType)))
      : 0;

    if (!updateDto.pricingBreakdown) {
      pricingBreakdown = {
        ...pricingBreakdown,
        subsidyAmount: subsidy,
        isSubsidyApplicable,
      };
    }

    const effectivePrice = updateDto.effectivePrice ?? Math.max(0, finalPrice - subsidy);

    await this.dataSource.transaction(async (manager) => {
      const quoteRepo = manager.getRepository(QuoteEntity);
      const versionRepo = manager.getRepository(QuoteVersionEntity);

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
      await versionRepo.save(
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
          paymentMilestones:
            updateDto.paymentMilestones ||
            (updateDto.pricingBreakdown && currentVersion?.paymentMilestones
              ? this.recalculateMilestoneAmounts(currentVersion.paymentMilestones, finalPrice)
              : currentVersion?.paymentMilestones) ||
            this.generatePaymentMilestones(finalPrice, quoteConfig.paymentMilestones),
          projectCompletionWeeks:
            updateDto.projectCompletionWeeks ||
            currentVersion?.projectCompletionWeeks ||
            quoteConfig.defaultCompletionWeeks,
          changeSummary: updateDto.changeSummary,
          isCurrent: true,
          createdBy: updatedBy,
        }),
      );
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
