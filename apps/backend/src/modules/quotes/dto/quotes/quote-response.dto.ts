import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  type CalculatorInputs,
  type PaymentMilestone,
  type PricingBreakdown,
  ProjectType,
  QuoteStatus,
  SystemType,
} from '@oneohm-epc/shared/types';
import { Expose, Transform } from 'class-transformer';

import { QuoteVersionResponseDto } from './quote-version-response.dto';
import { toNum } from '../../../../common/utils';

const cv = (obj: Record<string, unknown>) => {
  const versions = obj.versions as Array<Record<string, unknown>> | undefined;
  return versions?.find((v) => v.isCurrent);
};

const pb = (obj: Record<string, unknown>) =>
  cv(obj)?.pricingBreakdown as Record<string, unknown> | undefined;

/**
 * Quote Response DTO
 * Serialized response for quote entities.
 * Reads system/pricing data from the current version so the frontend
 * receives the same flat shape it always did.
 * Also includes enriched fields for the detail view: versions,
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
    obj.customer ? `${obj.customer.firstName} ${obj.customer.lastName || ''}`.trim() : undefined,
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
  @Transform(({ obj }) => toNum(pb(obj)?.basePrice))
  basePrice?: number;

  @ApiPropertyOptional({ example: 60000.0 })
  @Expose()
  @Transform(({ obj }) => toNum(pb(obj)?.totalGst))
  gstAmount?: number;

  @ApiPropertyOptional({ example: 560000.0 })
  @Expose()
  @Transform(({ obj }) => toNum(pb(obj)?.totalPrice))
  totalPrice?: number;

  @ApiPropertyOptional({ example: 10000.0 })
  @Expose()
  @Transform(({ obj }) => toNum(pb(obj)?.discountAmount))
  discountAmount?: number;

  @ApiPropertyOptional({ example: 550000.0 })
  @Expose()
  @Transform(({ obj }) => toNum(cv(obj)?.finalPrice))
  finalPrice?: number;

  @ApiPropertyOptional({ example: true })
  @Expose()
  @Transform(({ obj }) => pb(obj)?.isSubsidyApplicable)
  isSubsidyApplicable?: boolean;

  @ApiPropertyOptional({ example: 30000.0 })
  @Expose()
  @Transform(({ obj }) => toNum(pb(obj)?.subsidyAmount))
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

  @ApiPropertyOptional({
    description: 'All versions',
    type: [QuoteVersionResponseDto],
  })
  @Expose()
  @Transform(({ obj }) => {
    if (!obj.versions) return undefined;
    const sorted = [...obj.versions].sort(
      (a: { versionNumber?: number }, b: { versionNumber?: number }) =>
        (b.versionNumber ?? 0) - (a.versionNumber ?? 0),
    );
    return sorted.map((v: Record<string, unknown>) => ({
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
      calculatorInputs: v.calculatorInputs,
      projectCompletionWeeks: v.projectCompletionWeeks,
      changeSummary: v.changeSummary,
      isCurrent: v.isCurrent,
      createdBy: v.createdBy,
      createdAt: v.createdAt,
    }));
  })
  versions?: QuoteVersionResponseDto[];
}
