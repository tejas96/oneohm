import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  type CalculatorInputs,
  type PaymentMilestone,
  type PricingBreakdown,
  ProjectType,
  type QuoteConfigSnapshot,
  QuoteStatus,
  SystemType,
} from '@oneohm-epc/shared-types';
import { Expose, Transform } from 'class-transformer';

import { QuoteLineItemResponseDto } from './quote-line-item-response.dto';
import { QuoteVersionResponseDto } from './quote-version-response.dto';
import { toNum } from '../../../../common/utils';

const cv = (obj: any) => obj.versions?.find((v: any) => v.isCurrent);

/**
 * Quote Response DTO
 * Serialized response for quote entities.
 * Reads system/pricing data from the current version so the frontend
 * receives the same flat shape it always did.
 * Also includes enriched fields for the detail view: versions, lineItems,
 * customer contact info, property address, pricing breakdown, and milestones.
 */
export class QuoteResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  organizationId!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  customerId!: string;

  @ApiPropertyOptional({ example: 'Rajesh Sharma' })
  @Expose()
  @Transform(({ obj }) =>
    obj.customer
      ? `${obj.customer.firstName} ${obj.customer.lastName || ''}`.trim()
      : undefined,
  )
  customerName?: string;

  @ApiPropertyOptional({ example: '+91 98765 43210' })
  @Expose()
  @Transform(({ obj }) => obj.customer?.phone ?? undefined)
  customerPhone?: string;

  @ApiPropertyOptional({ example: 'rajesh@email.com' })
  @Expose()
  @Transform(({ obj }) => obj.customer?.email ?? undefined)
  customerEmail?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  propertyId?: string;

  @ApiPropertyOptional({ example: 'Main Residence' })
  @Expose()
  @Transform(({ obj }) => obj.property?.propertyName ?? undefined)
  propertyName?: string;

  @ApiPropertyOptional({ example: '456 Green Valley, Kothrud, Pune' })
  @Expose()
  @Transform(({ obj }) => obj.property?.address ?? undefined)
  propertyAddress?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  salesPersonId?: string;

  @ApiPropertyOptional({ example: 'Amit Kumar' })
  @Expose()
  @Transform(({ obj }) =>
    obj.salesPerson
      ? `${obj.salesPerson.firstName} ${obj.salesPerson.lastName || ''}`.trim()
      : undefined,
  )
  salesPersonName?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  resellerId?: string;

  @ApiProperty({ example: 'QT-ONEOHM-2025-0001' })
  @Expose()
  quoteNumber!: string;

  @ApiProperty({ example: '2025-01-15' })
  @Expose()
  quoteDate!: string;

  @ApiProperty({ example: '2025-02-15' })
  @Expose()
  validUntil!: string;

  @ApiProperty({ example: 1 })
  @Expose()
  currentVersion!: number;

  // ==================== Current Version Flat Fields ====================

  @ApiProperty({
    enum: Object.values(SystemType),
    enumName: 'SystemType',
    example: SystemType.ON_GRID,
  })
  @Expose()
  @Transform(({ obj }) => cv(obj)?.systemType)
  systemType!: SystemType;

  @ApiProperty({ example: 5.5 })
  @Expose()
  @Transform(({ obj }) => toNum(cv(obj)?.systemSizeKw))
  systemSizeKw!: number;

  @ApiProperty({ example: 5500 })
  @Expose()
  @Transform(({ obj }) => toNum(cv(obj)?.totalWattageWp))
  totalWattageWp!: number;

  @ApiProperty({
    enum: Object.values(ProjectType),
    enumName: 'ProjectType',
    example: ProjectType.RESIDENTIAL,
  })
  @Expose()
  @Transform(({ obj }) => cv(obj)?.projectType)
  projectType!: ProjectType;

  @ApiPropertyOptional({ example: 500000.0 })
  @Expose()
  @Transform(({ obj }) => toNum(cv(obj)?.pricingBreakdown?.basePrice))
  basePrice?: number;

  @ApiPropertyOptional({ example: 60000.0 })
  @Expose()
  @Transform(({ obj }) => toNum(cv(obj)?.pricingBreakdown?.totalGst))
  gstAmount?: number;

  @ApiPropertyOptional({ example: 560000.0 })
  @Expose()
  @Transform(({ obj }) => toNum(cv(obj)?.pricingBreakdown?.totalPrice))
  totalPrice?: number;

  @ApiPropertyOptional({ example: 10000.0 })
  @Expose()
  @Transform(({ obj }) => toNum(cv(obj)?.pricingBreakdown?.discountAmount))
  discountAmount?: number;

  @ApiPropertyOptional({ example: 550000.0 })
  @Expose()
  @Transform(({ obj }) => toNum(cv(obj)?.finalPrice))
  finalPrice?: number;

  @ApiPropertyOptional({ example: true })
  @Expose()
  @Transform(({ obj }) => cv(obj)?.pricingBreakdown?.isSubsidyApplicable)
  isSubsidyApplicable?: boolean;

  @ApiPropertyOptional({ example: 30000.0 })
  @Expose()
  @Transform(({ obj }) => toNum(cv(obj)?.pricingBreakdown?.subsidyAmount))
  subsidyAmount?: number;

  @ApiPropertyOptional({ example: 520000.0 })
  @Expose()
  @Transform(({ obj }) => toNum(cv(obj)?.effectivePrice))
  effectivePrice?: number;

  @ApiPropertyOptional({ description: 'Calculator input parameters for this quote' })
  @Expose()
  @Transform(({ obj }) => cv(obj)?.calculatorInputs)
  calculatorInputs?: CalculatorInputs;

  // ==================== Status & Lifecycle ====================

  @ApiProperty({
    enum: Object.values(QuoteStatus),
    enumName: 'QuoteStatus',
    example: QuoteStatus.DRAFT,
  })
  @Expose()
  status!: QuoteStatus;

  @ApiPropertyOptional({ example: '2025-01-20T10:30:00Z' })
  @Expose()
  acceptedAt?: string;

  @ApiPropertyOptional({ example: 'Price too high' })
  @Expose()
  rejectionReason?: string;

  @ApiPropertyOptional({ example: 'High priority customer' })
  @Expose()
  internalNotes?: string;

  @ApiPropertyOptional({ example: 'Installation before summer' })
  @Expose()
  customerNotes?: string;

  // ==================== Audit ====================

  @ApiProperty({ example: '2025-01-15T10:00:00Z' })
  @Expose()
  createdAt!: string;

  @ApiProperty({ example: '2025-01-15T10:00:00Z' })
  @Expose()
  updatedAt!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  createdBy!: string;

  // ==================== Enriched Detail Fields ====================

  @ApiPropertyOptional({ description: 'Full pricing breakdown from current version' })
  @Expose()
  @Transform(({ obj }) => cv(obj)?.pricingBreakdown ?? undefined)
  pricingBreakdown?: PricingBreakdown;

  @ApiPropertyOptional({ description: 'Payment milestones from current version' })
  @Expose()
  @Transform(({ obj }) => cv(obj)?.paymentMilestones ?? undefined)
  paymentMilestones?: PaymentMilestone[];

  @ApiPropertyOptional({ description: 'Project completion weeks from current version' })
  @Expose()
  @Transform(({ obj }) => cv(obj)?.projectCompletionWeeks ?? undefined)
  projectCompletionWeeks?: number;

  @ApiPropertyOptional({ description: 'Configuration snapshot from current version' })
  @Expose()
  @Transform(({ obj }) => cv(obj)?.configSnapshot ?? undefined)
  configSnapshot?: QuoteConfigSnapshot;

  @ApiPropertyOptional({
    description: 'All versions (version metadata only, current version includes line items)',
    type: [QuoteVersionResponseDto],
  })
  @Expose()
  @Transform(({ obj }) => {
    if (!obj.versions) return undefined;
    const sorted = [...obj.versions].sort(
      (a: any, b: any) => b.versionNumber - a.versionNumber,
    );
    return sorted.map((v: any) => ({
      id: v.id,
      quoteId: v.quoteId,
      versionNumber: v.versionNumber,
      systemType: v.systemType,
      systemSizeKw: v.systemSizeKw != null ? Number(v.systemSizeKw) : undefined,
      totalWattageWp: v.totalWattageWp != null ? Number(v.totalWattageWp) : undefined,
      projectType: v.projectType,
      finalPrice: v.finalPrice != null ? Number(v.finalPrice) : undefined,
      effectivePrice: v.effectivePrice != null ? Number(v.effectivePrice) : undefined,
      pricingBreakdown: v.pricingBreakdown,
      paymentMilestones: v.paymentMilestones,
      projectCompletionWeeks: v.projectCompletionWeeks,
      changeSummary: v.changeSummary,
      isCurrent: v.isCurrent,
      configSnapshot: v.configSnapshot,
      createdBy: v.createdBy,
      createdAt: v.createdAt,
      lineItems: v.isCurrent && v.lineItems
        ? v.lineItems
            .sort((a: any, b: any) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
            .map((li: any) => ({
              id: li.id,
              quoteVersionId: li.quoteVersionId,
              productId: li.productId,
              itemCategory: li.itemCategory,
              itemName: li.itemName,
              itemDescription: li.itemDescription,
              specifications: li.specifications,
              quantity: li.quantity,
              unitOfMeasure: li.unitOfMeasure,
              unitPrice: li.unitPrice != null ? Number(li.unitPrice) : undefined,
              lineTotal: li.lineTotal != null ? Number(li.lineTotal) : undefined,
              taxRate: li.taxRate != null ? Number(li.taxRate) : undefined,
              taxAmount: li.taxAmount != null ? Number(li.taxAmount) : undefined,
              displayOrder: li.displayOrder,
            }))
        : undefined,
    }));
  })
  versions?: QuoteVersionResponseDto[];

  @ApiPropertyOptional({
    description: 'Line items from the current version',
    type: [QuoteLineItemResponseDto],
  })
  @Expose()
  @Transform(({ obj }) => {
    const current = cv(obj);
    if (!current?.lineItems) return undefined;
    return current.lineItems
      .sort((a: any, b: any) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
      .map((li: any) => ({
        id: li.id,
        quoteVersionId: li.quoteVersionId,
        productId: li.productId,
        itemCategory: li.itemCategory,
        itemName: li.itemName,
        itemDescription: li.itemDescription,
        specifications: li.specifications,
        quantity: li.quantity,
        unitOfMeasure: li.unitOfMeasure,
        unitPrice: li.unitPrice != null ? Number(li.unitPrice) : undefined,
        lineTotal: li.lineTotal != null ? Number(li.lineTotal) : undefined,
        taxRate: li.taxRate != null ? Number(li.taxRate) : undefined,
        taxAmount: li.taxAmount != null ? Number(li.taxAmount) : undefined,
        displayOrder: li.displayOrder,
      }));
  })
  lineItems?: QuoteLineItemResponseDto[];
}
