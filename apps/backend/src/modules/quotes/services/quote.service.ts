import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentMilestone,
  PaymentMilestoneStage,
  ProjectType,
  QuoteStatus,
} from '@oneohm-epc/shared-types';

import { OrganizationRepository } from '../../organizations/repositories/organization.repository';
import { CreateQuoteDto, UpdateQuoteDto, UpdateQuoteStatusDto } from '../dto';
import { QuoteEntity } from '../entities/quote.entity';
import { QuoteLineItemRepository, QuoteRepository, QuoteVersionRepository } from '../repositories';

/**
 * Quote Service
 * Business logic for quote management
 */
@Injectable()
export class QuoteService {
  // Configurable GST rates (can be moved to org settings later)
  private readonly GST_RATE_1 = 12; // 12%
  private readonly GST_RATE_1_PERCENTAGE = 70; // on 70% of base
  private readonly GST_RATE_2 = 18; // 18%
  private readonly GST_RATE_2_PERCENTAGE = 30; // on 30% of base

  // Subsidy configuration (can be moved to database later)
  private readonly SUBSIDY_PER_KW_RESIDENTIAL = 30000; // ₹30,000 per kW
  private readonly MAX_SUBSIDY_RESIDENTIAL = 78000; // Max ₹78,000 for residential

  constructor(
    private readonly quoteRepository: QuoteRepository,
    private readonly quoteVersionRepository: QuoteVersionRepository,
    private readonly lineItemRepository: QuoteLineItemRepository,
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  /**
   * Create a new quote with initial version
   */
  async create(
    organizationId: string,
    createDto: CreateQuoteDto,
    createdBy: string,
  ): Promise<QuoteEntity> {
    // Get organization for quote number generation
    const org = await this.organizationRepository.findOneById(organizationId);

    if (!org) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    // Generate quote number
    const quoteNumber = await this.quoteRepository.generateQuoteNumber(org.code);

    // Calculate pricing
    const pricing = this.calculatePricing(createDto.lineItems, createDto.discountAmount || 0);

    // Calculate subsidy if applicable
    const subsidy = createDto.isSubsidyApplicable
      ? this.calculateSubsidy(createDto.systemSizeKw, createDto.projectType)
      : 0;

    // Calculate effective price
    const effectivePrice = pricing.finalPrice - subsidy;

    // Create quote
    const quote = await this.quoteRepository.create({
      organizationId,
      customerId: createDto.customerId,
      propertyId: createDto.propertyId,
      salesPersonId: createDto.salesPersonId,
      resellerId: createDto.resellerId,
      quoteNumber,
      quoteDate: createDto.quoteDate ? new Date(createDto.quoteDate) : new Date(),
      validUntil: new Date(createDto.validUntil),
      currentVersion: 1,
      systemType: createDto.systemType,
      systemSizeKw: createDto.systemSizeKw,
      totalWattageWp: createDto.totalWattageWp,
      projectType: createDto.projectType,
      basePrice: pricing.basePrice,
      gstAmount: pricing.gstAmount,
      totalPrice: pricing.totalPrice,
      discountAmount: createDto.discountAmount || 0,
      finalPrice: pricing.finalPrice,
      isSubsidyApplicable: createDto.isSubsidyApplicable || false,
      subsidyAmount: subsidy,
      effectivePrice,
      status: QuoteStatus.DRAFT,
      internalNotes: createDto.internalNotes,
      customerNotes: createDto.customerNotes,
      createdBy,
    });

    // Generate payment milestones if not provided
    // Use loan milestones (10%/85%/5%) if wantsLoan is true, otherwise use default (30/30/30/10)
    const paymentMilestones =
      createDto.paymentMilestones ||
      this.getPaymentMilestones(pricing.finalPrice, createDto.wantsLoan ?? false);

    // Create initial version
    await this.quoteVersionRepository.create({
      quoteId: quote.id,
      versionNumber: 1,
      systemType: createDto.systemType,
      systemSizeKw: createDto.systemSizeKw,
      totalWattageWp: createDto.totalWattageWp,
      basePrice: pricing.basePrice,
      gst12On70Percent: pricing.gst12On70Percent,
      gst18On30Percent: pricing.gst18On30Percent,
      totalGst: pricing.gstAmount,
      totalPrice: pricing.totalPrice,
      discountAmount: createDto.discountAmount || 0,
      finalPrice: pricing.finalPrice,
      subsidyAmount: subsidy,
      effectivePrice,
      paymentMilestones,
      projectCompletionWeeks: createDto.projectCompletionWeeks || 4,
      isCurrent: true,
      createdBy,
    });

    // Create line items for the version
    const version = await this.quoteVersionRepository.getCurrentVersion(quote.id);
    if (version) {
      const lineItemsData = createDto.lineItems.map((item, index) => ({
        quoteVersionId: version.id,
        productId: item.productId,
        itemCategory: item.itemCategory,
        itemName: item.itemName,
        itemDescription: item.itemDescription,
        specifications: item.specifications,
        quantity: item.quantity,
        unitOfMeasure: item.unitOfMeasure,
        unitPrice: item.unitPrice,
        lineTotal: item.quantity * item.unitPrice,
        taxRate: item.taxRate,
        taxAmount: item.taxRate ? (item.quantity * item.unitPrice * item.taxRate) / 100 : 0,
        displayOrder: item.displayOrder !== undefined ? item.displayOrder : index,
      }));

      await this.lineItemRepository.createMany(lineItemsData);
    }

    return this.quoteRepository.findById(quote.id, organizationId);
  }

  /**
   * Calculate pricing with GST
   */
  private calculatePricing(
    lineItems: Array<{ quantity: number; unitPrice: number }>,
    discountAmount: number,
  ): {
    basePrice: number;
    gst12On70Percent: number;
    gst18On30Percent: number;
    gstAmount: number;
    totalPrice: number;
    finalPrice: number;
  } {
    // Calculate base price from line items
    const basePrice = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    // Calculate GST (12% on 70%, 18% on 30%)
    const amount70Percent = (basePrice * this.GST_RATE_1_PERCENTAGE) / 100;
    const amount30Percent = (basePrice * this.GST_RATE_2_PERCENTAGE) / 100;

    const gst12On70Percent = (amount70Percent * this.GST_RATE_1) / 100;
    const gst18On30Percent = (amount30Percent * this.GST_RATE_2) / 100;
    const gstAmount = gst12On70Percent + gst18On30Percent;

    const totalPrice = basePrice + gstAmount;
    const finalPrice = totalPrice - discountAmount;

    return {
      basePrice: Math.round(basePrice * 100) / 100,
      gst12On70Percent: Math.round(gst12On70Percent * 100) / 100,
      gst18On30Percent: Math.round(gst18On30Percent * 100) / 100,
      gstAmount: Math.round(gstAmount * 100) / 100,
      totalPrice: Math.round(totalPrice * 100) / 100,
      finalPrice: Math.round(finalPrice * 100) / 100,
    };
  }

  /**
   * Calculate subsidy based on system size
   */
  private calculateSubsidy(systemSizeKw: number, projectType: ProjectType): number {
    // Only residential projects get subsidy
    if (projectType !== ProjectType.RESIDENTIAL) {
      return 0;
    }

    // Calculate subsidy: ₹30,000 per kW up to 3kW, then ₹18,000 per kW
    let subsidy = 0;
    if (systemSizeKw <= 3) {
      subsidy = systemSizeKw * this.SUBSIDY_PER_KW_RESIDENTIAL;
    } else {
      subsidy = 3 * this.SUBSIDY_PER_KW_RESIDENTIAL + (systemSizeKw - 3) * 18000;
    }

    // Apply max limit
    return Math.min(subsidy, this.MAX_SUBSIDY_RESIDENTIAL);
  }

  /**
   * Generate default payment milestones (10%/85%/5% split)
   */
  private generateDefaultPaymentMilestones(finalPrice: number): PaymentMilestone[] {
    return [
      {
        stage: PaymentMilestoneStage.ADVANCE,
        name: 'Advance Payment',
        percentage: 10,
        amount: Math.round(finalPrice * 0.1 * 100) / 100,
        description: 'To be paid upon order confirmation',
        order: 1,
      },
      {
        stage: PaymentMilestoneStage.INSTALLATION_COMPLETE,
        name: 'Installation Complete',
        percentage: 85,
        amount: Math.round(finalPrice * 0.85 * 100) / 100,
        description: 'To be paid upon installation completion',
        order: 2,
      },
      {
        stage: PaymentMilestoneStage.COMMISSIONING,
        name: 'Commissioning & Net Metering',
        percentage: 5,
        amount: Math.round(finalPrice * 0.05 * 100) / 100,
        description: 'To be paid after commissioning and net metering',
        order: 3,
      },
    ];
  }

  /**
   * Get payment milestones (10%/85%/5% split for all projects)
   */
  getPaymentMilestones(finalPrice: number, _wantsLoan?: boolean): PaymentMilestone[] {
    return this.generateDefaultPaymentMilestones(finalPrice);
  }

  /**
   * Find all quotes with filters
   */
  async findAll(
    organizationId: string,
    page: number,
    limit: number,
    filters?: {
      status?: QuoteStatus;
      customerId?: string;
      salesPersonId?: string;
      resellerId?: string;
      fromDate?: string;
      toDate?: string;
      search?: string;
    },
  ): Promise<{ quotes: QuoteEntity[]; total: number }> {
    return this.quoteRepository.findAll(organizationId, page, limit, filters);
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

    // Don't allow updates to accepted/rejected quotes
    if ([QuoteStatus.ACCEPTED, QuoteStatus.REJECTED].includes(quote.status)) {
      throw new BadRequestException('Cannot update accepted or rejected quotes');
    }

    // Create new version
    const newVersionNumber = quote.currentVersion + 1;

    // Get current version for reference
    const currentVersion = await this.quoteVersionRepository.getCurrentVersion(quote.id);

    if (!currentVersion) {
      throw new NotFoundException('Current quote version not found');
    }

    // Calculate new pricing if line items changed
    const pricing = updateDto.lineItems
      ? this.calculatePricing(
          updateDto.lineItems,
          updateDto.discountAmount !== undefined ? updateDto.discountAmount : quote.discountAmount,
        )
      : {
          // Use existing pricing
          basePrice: currentVersion.basePrice,
          gst12On70Percent: currentVersion.gst12On70Percent || 0,
          gst18On30Percent: currentVersion.gst18On30Percent || 0,
          gstAmount: currentVersion.totalGst || 0,
          totalPrice: currentVersion.totalPrice,
          finalPrice: currentVersion.finalPrice,
        };

    // Calculate subsidy
    const systemSizeKw = updateDto.systemSizeKw || quote.systemSizeKw;
    const projectType = updateDto.projectType || quote.projectType;
    const isSubsidyApplicable =
      updateDto.isSubsidyApplicable !== undefined
        ? updateDto.isSubsidyApplicable
        : quote.isSubsidyApplicable;

    const subsidy = isSubsidyApplicable ? this.calculateSubsidy(systemSizeKw, projectType) : 0;

    const effectivePrice = pricing.finalPrice - subsidy;

    // Update quote main record
    await this.quoteRepository.update(id, organizationId, {
      salesPersonId: updateDto.salesPersonId,
      resellerId: updateDto.resellerId,
      validUntil: updateDto.validUntil ? new Date(updateDto.validUntil) : undefined,
      systemType: updateDto.systemType,
      systemSizeKw: updateDto.systemSizeKw,
      totalWattageWp: updateDto.totalWattageWp,
      projectType: updateDto.projectType,
      basePrice: pricing.basePrice,
      gstAmount: pricing.gstAmount,
      totalPrice: pricing.totalPrice,
      discountAmount: updateDto.discountAmount,
      finalPrice: pricing.finalPrice,
      isSubsidyApplicable,
      subsidyAmount: subsidy,
      effectivePrice,
      internalNotes: updateDto.internalNotes,
      customerNotes: updateDto.customerNotes,
      currentVersion: newVersionNumber,
      updatedBy,
    });

    // Mark old versions as not current
    if (currentVersion) {
      await this.quoteVersionRepository.setCurrentVersion(quote.id, newVersionNumber);
    }

    // Create new version
    const newVersion = await this.quoteVersionRepository.create({
      quoteId: quote.id,
      versionNumber: newVersionNumber,
      systemType: updateDto.systemType || quote.systemType,
      systemSizeKw: updateDto.systemSizeKw || quote.systemSizeKw,
      totalWattageWp: updateDto.totalWattageWp || quote.totalWattageWp,
      basePrice: pricing.basePrice,
      gst12On70Percent: pricing.gst12On70Percent,
      gst18On30Percent: pricing.gst18On30Percent,
      totalGst: pricing.gstAmount,
      totalPrice: pricing.totalPrice,
      discountAmount:
        updateDto.discountAmount !== undefined ? updateDto.discountAmount : quote.discountAmount,
      finalPrice: pricing.finalPrice,
      subsidyAmount: subsidy,
      effectivePrice,
      paymentMilestones:
        updateDto.paymentMilestones ||
        currentVersion?.paymentMilestones ||
        this.generateDefaultPaymentMilestones(pricing.finalPrice),
      projectCompletionWeeks:
        updateDto.projectCompletionWeeks || currentVersion?.projectCompletionWeeks || 4,
      changeSummary: updateDto.changeSummary,
      isCurrent: true,
      createdBy: updatedBy,
    });

    // Create line items for new version
    if (updateDto.lineItems) {
      const lineItemsData = updateDto.lineItems.map((item, index) => ({
        quoteVersionId: newVersion.id,
        productId: item.productId,
        itemCategory: item.itemCategory,
        itemName: item.itemName,
        itemDescription: item.itemDescription,
        specifications: item.specifications,
        quantity: item.quantity,
        unitOfMeasure: item.unitOfMeasure,
        unitPrice: item.unitPrice,
        lineTotal: item.quantity * item.unitPrice,
        taxRate: item.taxRate,
        taxAmount: item.taxRate ? (item.quantity * item.unitPrice * item.taxRate) / 100 : 0,
        displayOrder: item.displayOrder !== undefined ? item.displayOrder : index,
      }));

      await this.lineItemRepository.createMany(lineItemsData);
    } else if (currentVersion) {
      // Copy line items from current version
      const oldLineItems = await this.lineItemRepository.findByVersionId(currentVersion.id);
      const newLineItemsData = oldLineItems.map((item) => ({
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
      }));

      await this.lineItemRepository.createMany(newLineItemsData);
    }

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

    // Validate status transitions
    this.validateStatusTransition(quote.status, statusDto.status);

    // Additional validations
    if (statusDto.status === QuoteStatus.REJECTED && !statusDto.rejectionReason) {
      throw new BadRequestException('Rejection reason is required when rejecting a quote');
    }

    if (statusDto.status === QuoteStatus.ACCEPTED && !statusDto.customerSignature) {
      throw new BadRequestException('Customer signature is required when accepting a quote');
    }

    // Update quote
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
   * Delete quote
   */
  async delete(id: string, organizationId: string): Promise<void> {
    const quote = await this.quoteRepository.findById(id, organizationId);

    // Don't allow deletion of accepted quotes
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
}
