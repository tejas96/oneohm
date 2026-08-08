import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { COMPANY } from '@tejas96/shared/constants';
import {
  CustomerStatus,
  type CalculatorInputs,
  DocumentCategory,
  IntegrationProvider,
  type ITemplateMessage,
  PaymentMilestone,
  type PaymentMilestoneConfig,
  type PricingBreakdown,
  DocumentEntityType,
  MessageType,
  ProjectType,
  type QuoteCalculationOutput,
  type QuoteSnapshot,
  QuoteStatus,
} from '@tejas96/shared/types';
import { normalizePhoneToE164 } from '@tejas96/shared/utils';
import { DataSource } from 'typeorm';

import { LeadClosureService } from '../../customers/services/lead-closure.service';

import type { DocumentEntity } from '../../documents/entities/document.entity';
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
import { FileCategory } from '../../storage/dto';
import { StorageService } from '../../storage/services';
import {
  CreateQuoteDto,
  QuoteQueryDto,
  ShareQuoteWhatsappDto,
  ShareQuoteWhatsappResponseDto,
  UpdateQuoteDto,
  UpdateQuoteStatusDto,
} from '../dto';
import { QuoteVersionEntity } from '../entities/quote-version.entity';
import { QuoteEntity } from '../entities/quote.entity';
import { QuoteRepository } from '../repositories';
import type { UploadedPdfFile } from '../types/uploaded-pdf-file.interface';

const CENTS_ROUNDING_FACTOR = 100;

/**
 * Quote Service
 * Business logic for quote management
 */
@Injectable()
export class QuoteService {
  private readonly logger = new Logger(QuoteService.name);

  constructor(
    private readonly quoteRepository: QuoteRepository,
    private readonly quoteConfigRepo: QuoteConfigurationRepository,
    private readonly subsidyConfigRepo: SubsidyConfigurationRepository,
    private readonly documentService: DocumentService,
    private readonly integrationService: IntegrationService,
    private readonly storageService: StorageService,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
    private readonly leadClosureService: LeadClosureService,
  ) {}

  /**
   * Create a new quote with initial version
   */
  async create(
    createDto: CreateQuoteDto,
    createdBy: string,
  ): Promise<QuoteEntity & { versionId: string }> {
    if (!createDto.propertyId) {
      throw new BadRequestException('Property ID is required to create a quote');
    }

    if (createDto.propertyId) {
      const accepted = await this.quoteRepository.findAcceptedByPropertyId(createDto.propertyId);
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
      .andWhere('c.deleted_at IS NULL')
      .getRawOne<{ id: string; status: CustomerStatus }>();

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${createDto.customerId} not found`);
    }
    if (customer.status === CustomerStatus.INACTIVE) {
      throw new BadRequestException('Cannot perform this action: customer is inactive');
    }

    const quoteConfig = await this.quoteConfigRepo.getOrCreateDefault();

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
        ? await this.calculateSubsidy(createDto.systemSizeKw, createDto.projectType)
        : 0);

    const effectivePrice = createDto.effectivePrice ?? Math.max(0, finalPrice - subsidyAmount);

    const paymentMilestones =
      createDto.paymentMilestones ||
      this.generatePaymentMilestones(
        pricingBreakdown.totalPrice,
        await this.resolveMilestoneTemplate(createDto.propertyId, quoteConfig),
      );

    const result = await this.dataSource.transaction(async (manager) => {
      const quoteRepo = manager.getRepository(QuoteEntity);
      const versionRepo = manager.getRepository(QuoteVersionEntity);

      const quoteNumber = await this.quoteRepository.generateQuoteNumber(COMPANY.code, manager);

      const quote = await quoteRepo.save(
        quoteRepo.create({
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

    const quote = await this.quoteRepository.findById(result.quoteId);
    return Object.assign(quote, { versionId: result.versionId });
  }

  /**
   * Get payment milestones for a given org (fetches config from DB).
   * @param grossTotal - Total price before discount and subsidy
   */
  async getPaymentMilestones(grossTotal: number, propertyId?: string): Promise<PaymentMilestone[]> {
    const quoteConfig = await this.quoteConfigRepo.getOrCreateDefault();
    return this.generatePaymentMilestones(
      grossTotal,
      await this.resolveMilestoneTemplate(propertyId, quoteConfig),
    );
  }

  /**
   * Find all quotes with filters, sorting, and pagination
   */
  async findAll(query: QuoteQueryDto): Promise<{ data: QuoteEntity[]; total: number }> {
    const [data, total] = await this.quoteRepository.findWithFilters(query);
    return { data, total };
  }

  /**
   * Find quote by ID
   */
  async findById(id: string): Promise<QuoteEntity> {
    return this.quoteRepository.findById(id);
  }

  async shareOnWhatsapp(
    id: string,
    dto: ShareQuoteWhatsappDto,
    updatedBy: string,
    file?: UploadedPdfFile,
  ): Promise<ShareQuoteWhatsappResponseDto> {
    const quote = await this.quoteRepository.findById(id);

    if (quote.status === QuoteStatus.ACCEPTED || quote.status === QuoteStatus.REJECTED) {
      throw new BadRequestException(
        `Cannot send quote with status ${quote.status}. Accepted and rejected quotes cannot be shared.`,
      );
    }

    const rawRecipient = dto.to || quote.customer?.phone;
    if (!rawRecipient) {
      throw new BadRequestException('Recipient phone number is required');
    }

    const recipient = normalizePhoneToE164(rawRecipient);
    if (!recipient) {
      throw new BadRequestException('Recipient phone number is invalid');
    }

    const document = await this.resolveQuotePdfDocument(quote, updatedBy, dto.documentId, file);

    const message = this.buildQuoteShareMessage(quote, document, recipient);
    const result = await this.integrationService.sendTemplateMessage(
      message,
      IntegrationProvider.WHATSAPP_BUSINESS,
    );

    let quoteStatus = quote.status;

    if (quote.status === QuoteStatus.DRAFT) {
      await this.quoteRepository.update(id, {
        status: QuoteStatus.SENT,
        updatedBy,
      });
      quoteStatus = QuoteStatus.SENT;

      if (quote.propertyId && quote.customerId) {
        this.eventEmitter.emit(
          CONSUMER_EVENTS.QUOTATION_CREATED,
          new QuotationCreatedEvent(id, quote.propertyId, quote.customerId, quote.quoteNumber),
        );
      }
    }

    return {
      messageId: result.messageId,
      status: result.status,
      documentId: document.id,
      quoteStatus,
    };
  }

  private async resolveQuotePdfDocument(
    quote: QuoteEntity,
    userId: string,
    documentId: string | undefined,
    file: UploadedPdfFile | undefined,
  ): Promise<DocumentEntity> {
    const quoteId = quote.id;

    if (file) {
      if (file.mimetype !== 'application/pdf') {
        throw new BadRequestException('Only PDF files are allowed');
      }

      if (!file.buffer?.length) {
        throw new BadRequestException('PDF file is empty');
      }

      const fileName = file.originalname?.endsWith('.pdf')
        ? file.originalname
        : `${quote.quoteNumber}.pdf`;

      const upload = await this.storageService.uploadBuffer({
        buffer: file.buffer,
        fileName,
        contentType: 'application/pdf',
        category: FileCategory.QUOTE,
        entityId: quoteId,
        entityType: DocumentEntityType.QUOTE,
        propertyId: quote.propertyId,
        subCategory: 'quote_pdf',
      });

      return this.documentService.create(
        {
          propertyId: quote.propertyId,
          entityType: DocumentEntityType.QUOTE,
          entityId: quoteId,
          category: DocumentCategory.DOCUMENT,
          tag: 'quote_pdf',
          fileName: upload.fileName,
          fileUrl: upload.publicUrl,
          fileSizeBytes: file.buffer.length,
          mimeType: 'application/pdf',
          metadata: {
            quoteNumber: quote.quoteNumber,
            source: 'whatsapp_share',
            storageKey: upload.fileKey,
          },
        },
        userId,
      );
    }

    if (documentId) {
      const document = await this.documentService.findById(documentId);

      if (document.entityType !== DocumentEntityType.QUOTE || document.entityId !== quoteId) {
        throw new ForbiddenException('Document does not belong to this quote');
      }

      if (document.mimeType !== 'application/pdf') {
        throw new BadRequestException('Document must be a PDF');
      }

      return document;
    }

    throw new BadRequestException('PDF file is required');
  }

  private buildQuoteShareMessage(
    quote: QuoteEntity,
    document: DocumentEntity,
    recipient: string,
  ): ITemplateMessage {
    const validUntil = quote.validUntil
      ? new Date(quote.validUntil).toLocaleDateString('en-IN')
      : 'N/A';
    const customerName = [
      quote.customer?.firstName,
      quote.customer?.middleName,
      quote.customer?.lastName,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    const sanitizedCustomerName = customerName
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .trim()
      .replace(/\s+/g, '_');
    const filename = sanitizedCustomerName
      ? `${sanitizedCustomerName}-Quote.pdf`
      : document.fileName;

    return {
      to: recipient,
      type: MessageType.TEMPLATE,
      templateName: 'quotation_pdf',
      templateLanguage: 'en',
      templateParameters: {
        header: {
          type: 'document',
          link: document.fileUrl,
          filename,
        },
        body: {
          customer_name: customerName || 'Customer',
          quot_no: quote.quoteNumber,
          valid_date: validUntil,
        },
      },
      metadata: {
        entityType: 'quote',
        entityId: quote.id,
        quoteId: quote.id,
        quoteNumber: quote.quoteNumber,
        documentId: document.id,
      },
    };
  }

  async findAllByPropertyId(propertyId: string): Promise<QuoteEntity[]> {
    return this.quoteRepository.findAllByPropertyId(propertyId);
  }

  /**
   * Update quote (creates new version)
   */
  async update(
    id: string,
    updateDto: UpdateQuoteDto,
    updatedBy: string,
  ): Promise<QuoteEntity & { versionId: string }> {
    const quote = await this.quoteRepository.findById(id);

    if ([QuoteStatus.ACCEPTED, QuoteStatus.REJECTED].includes(quote.status)) {
      throw new BadRequestException('Cannot update accepted or rejected quotes');
    }

    const quoteConfig = await this.quoteConfigRepo.getOrCreateDefault();

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
        (await this.calculateSubsidy(systemSizeKw, projectType)))
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
        { id },
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

    const updated = await this.quoteRepository.findById(id);
    return Object.assign(updated, { versionId });
  }

  /**
   * Update quote status
   */
  async updateStatus(
    id: string,
    statusDto: UpdateQuoteStatusDto,
    updatedBy: string,
  ): Promise<QuoteEntity> {
    const quote = await this.quoteRepository.findById(id);

    if (quote.propertyId) {
      const accepted = await this.quoteRepository.findAcceptedByPropertyId(
        quote.propertyId,
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

    const result = await this.quoteRepository.update(id, updateData);

    if (statusDto.status === QuoteStatus.SENT) {
      // Notify consumer that quotation is ready (guard propertyId)
      if (quote.propertyId && quote.customerId) {
        this.eventEmitter.emit(
          CONSUMER_EVENTS.QUOTATION_CREATED,
          new QuotationCreatedEvent(id, quote.propertyId, quote.customerId, quote.quoteNumber),
        );
      }
    }

    // A won deal must stop nagging without anyone clicking twice. Best-effort:
    // the quote is already accepted by this point, so a failure here should not
    // read as "the acceptance did not save".
    if (statusDto.status === QuoteStatus.ACCEPTED && quote.propertyId && quote.customerId) {
      try {
        await this.leadClosureService.closeProperty(quote.propertyId, quote.customerId, updatedBy);
      } catch (error) {
        this.logger.error(
          `Quote ${id} accepted but its followups could not be closed: ${String(error)}`,
        );
      }
    }

    return result;
  }

  /**
   * Delete quote
   */
  async delete(id: string): Promise<void> {
    const quote = await this.quoteRepository.findById(id);

    if (quote.status === QuoteStatus.ACCEPTED) {
      throw new ForbiddenException('Cannot delete accepted quotes');
    }

    return this.quoteRepository.delete(id);
  }

  /**
   * Check if a property is locked (has an accepted quote).
   */
  async getPropertyLockStatus(
    propertyId: string,
  ): Promise<{ locked: boolean; acceptedQuoteNumber?: string }> {
    const accepted = await this.quoteRepository.findAcceptedByPropertyId(propertyId);
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
  /**
   * Which payment-terms template applies to this site.
   *
   * A loan-financed customer funds a smaller advance and the lender releases the
   * bulk on installation — 10/70/20 against the self-financed 10/85/5. This is
   * resolved at QUOTE time, not at project conversion, for two reasons: the
   * quote PDF is the document the customer signs, so branching later would have
   * the signed page say 10/85/5 while the project invoices 10/70/20; and the
   * milestone snapshot copies explicit rupee amounts rather than percentages, so
   * a later branch would produce rows whose percentage and amount disagree.
   *
   * A default, never an enforcement: sales can still negotiate any schedule in
   * the payment-terms dialog, and an explicit `createDto.paymentMilestones`
   * wins over this entirely.
   */
  private async resolveMilestoneTemplate(
    propertyId: string | undefined,
    quoteConfig: {
      paymentMilestones: PaymentMilestoneConfig[];
      paymentMilestonesLoan?: PaymentMilestoneConfig[];
    },
  ): Promise<PaymentMilestoneConfig[]> {
    if (!propertyId) return quoteConfig.paymentMilestones;

    const rows: Array<{ wants_loan: boolean }> = await this.dataSource.query(
      `SELECT wants_loan FROM customer_properties
        WHERE id = $1 AND deleted_at IS NULL`,
      [propertyId],
    );

    const wantsLoan = rows[0]?.wants_loan === true;
    return wantsLoan && quoteConfig.paymentMilestonesLoan?.length
      ? quoteConfig.paymentMilestonesLoan
      : quoteConfig.paymentMilestones;
  }

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
  private async calculateSubsidy(systemSizeKw: number, projectType: ProjectType): Promise<number> {
    const configs = await this.subsidyConfigRepo.findAllActiveByProjectType(projectType);

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
