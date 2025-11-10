import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectType, QuoteStatus, SystemType } from '@oneohm-epc/shared-types';
import { Expose } from 'class-transformer';

/**
 * Quote Response DTO
 * Serialized response for quote entities
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

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  salesPersonId?: string;

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

  @ApiProperty({
    enum: Object.values(SystemType),
    enumName: 'SystemType',
    example: SystemType.ON_GRID,
  })
  @Expose()
  systemType!: SystemType;

  @ApiProperty({ example: 5.5 })
  @Expose()
  systemSizeKw!: number;

  @ApiProperty({ example: 5500 })
  @Expose()
  totalWattageWp!: number;

  @ApiProperty({
    enum: Object.values(ProjectType),
    enumName: 'ProjectType',
    example: ProjectType.RESIDENTIAL,
  })
  @Expose()
  projectType!: ProjectType;

  @ApiPropertyOptional({ example: 500000.0 })
  @Expose()
  basePrice?: number;

  @ApiPropertyOptional({ example: 60000.0 })
  @Expose()
  gstAmount?: number;

  @ApiPropertyOptional({ example: 560000.0 })
  @Expose()
  totalPrice?: number;

  @ApiPropertyOptional({ example: 10000.0 })
  @Expose()
  discountAmount?: number;

  @ApiPropertyOptional({ example: 550000.0 })
  @Expose()
  finalPrice?: number;

  @ApiPropertyOptional({ example: true })
  @Expose()
  isSubsidyApplicable?: boolean;

  @ApiPropertyOptional({ example: 30000.0 })
  @Expose()
  subsidyAmount?: number;

  @ApiPropertyOptional({ example: 520000.0 })
  @Expose()
  effectivePrice?: number;

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

  @ApiProperty({ example: '2025-01-15T10:00:00Z' })
  @Expose()
  createdAt!: string;

  @ApiProperty({ example: '2025-01-15T10:00:00Z' })
  @Expose()
  updatedAt!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  createdBy!: string;
}
