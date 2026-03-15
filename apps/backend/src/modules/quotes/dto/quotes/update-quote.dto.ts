import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  CalculatorInputs,
  PricingBreakdown,
  ProjectType,
  SystemType,
} from '@oneohm-epc/shared/types';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
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

import { QuoteLineItemDto } from '../line-items/quote-line-item.dto';
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
    example: 5.5,
    description: 'System size in kW',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  systemSizeKw?: number;

  @ApiPropertyOptional({
    example: 5500,
    description: 'Total wattage in Wp',
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

  // ==================== Calculator Inputs ====================
  @ApiPropertyOptional({
    description: 'All calculator input parameters for this quote version',
  })
  @IsOptional()
  @IsObject()
  calculatorInputs?: CalculatorInputs;

  // ==================== Pricing Breakdown ====================
  @ApiPropertyOptional({
    description: 'Pre-calculated pricing breakdown',
  })
  @IsOptional()
  @IsObject()
  pricingBreakdown?: PricingBreakdown;

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
    type: [QuoteLineItemDto],
    description: 'Updated line items',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuoteLineItemDto)
  @IsOptional()
  lineItems?: QuoteLineItemDto[];

  @ApiPropertyOptional({
    example: 'Updated system size and added battery backup',
    description: 'Summary of changes for this version',
  })
  @IsString()
  @IsOptional()
  changeSummary?: string;
}
