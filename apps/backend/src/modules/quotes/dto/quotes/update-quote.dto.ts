import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectType, QuoteSnapshot, SystemType } from '@tejas96/shared/types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

import { PaymentMilestoneDto } from '../versions/payment-milestone.dto';

/**
 * DTO for updating a quote
 * Creates a new version automatically
 */
export class UpdateQuoteDto {
  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Sales person ID',
  })
  @IsUUID()
  @IsOptional()
  salesPersonId?: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Reseller ID',
  })
  @IsUUID()
  @IsOptional()
  resellerId?: string;

  @ApiPropertyOptional({
    example: '2025-02-15',
    description: 'Valid until date',
  })
  @IsDateString()
  @IsOptional()
  validUntil?: string;

  @ApiPropertyOptional({
    enum: Object.values(SystemType),
    enumName: 'SystemType',
    example: SystemType.ON_GRID,
  })
  @IsEnum(SystemType)
  @IsOptional()
  systemType?: SystemType;

  @ApiPropertyOptional({
    example: 5500,
    description: 'Total panel wattage in Wp',
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  totalWattageWp?: number;

  @ApiPropertyOptional({
    enum: Object.values(ProjectType),
    enumName: 'ProjectType',
    example: ProjectType.RESIDENTIAL,
  })
  @IsEnum(ProjectType)
  @IsOptional()
  projectType?: ProjectType;

  // ==================== Quote Snapshot ====================
  @ApiPropertyOptional({
    description: 'Complete quote snapshot (inputs + calculation + pricing)',
  })
  @IsOptional()
  @IsObject()
  quoteSnapshot?: QuoteSnapshot;

  // ==================== Pricing ====================
  @ApiPropertyOptional({
    description: 'Pre-calculated final price (post-discount, post-GST).',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  finalPrice?: number;

  @ApiPropertyOptional({
    description: 'Pre-calculated effective price (finalPrice minus subsidy, floored at 0)',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  effectivePrice?: number;

  @ApiPropertyOptional({
    example: 'Updated pricing based on customer feedback',
    description: 'Internal notes',
  })
  @IsString()
  @IsOptional()
  internalNotes?: string;

  @ApiPropertyOptional({
    example: 'Revised quote with updated specifications',
    description: 'Customer notes',
  })
  @IsString()
  @IsOptional()
  customerNotes?: string;

  @ApiPropertyOptional({
    example: 4,
    description: 'Project completion weeks',
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  projectCompletionWeeks?: number;

  @ApiPropertyOptional({
    type: [PaymentMilestoneDto],
    description: 'Payment milestones',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentMilestoneDto)
  @IsOptional()
  paymentMilestones?: PaymentMilestoneDto[];

  @ApiPropertyOptional({
    example: 'Updated system size and added battery backup',
    description: 'Summary of changes for this version',
  })
  @IsString()
  @IsOptional()
  changeSummary?: string;
}
