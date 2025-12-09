import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for GST configuration
 */
export class GstConfigDto {
  @ApiProperty({ example: 12, description: 'First GST rate percentage' })
  @IsNumber()
  @Min(0)
  rate1!: number;

  @ApiProperty({ example: 70, description: 'Percentage of quote subject to rate1' })
  @IsNumber()
  @Min(0)
  rate1Percentage!: number;

  @ApiProperty({ example: 18, description: 'Second GST rate percentage' })
  @IsNumber()
  @Min(0)
  rate2!: number;

  @ApiProperty({ example: 30, description: 'Percentage of quote subject to rate2' })
  @IsNumber()
  @Min(0)
  rate2Percentage!: number;
}

/**
 * DTO for wattage rounding configuration
 */
export class WattageRoundingConfigDto {
  @ApiProperty({ example: 10, description: 'Round wattage to nearest value' })
  @IsInt()
  @Min(1)
  roundTo!: number;

  @ApiProperty({ example: 5, description: 'Round up threshold (>=)' })
  @IsInt()
  @Min(0)
  roundUpThreshold!: number;
}

/**
 * DTO for payment milestone
 */
export class PaymentMilestoneDto {
  @ApiProperty({ example: 'advance', description: 'Stage identifier' })
  @IsString()
  @IsNotEmpty()
  stage!: string;

  @ApiProperty({ example: 'Advance Payment', description: 'Display name' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 40, description: 'Payment percentage' })
  @IsNumber()
  @Min(0)
  percentage!: number;

  @ApiProperty({ example: 1, description: 'Display order' })
  @IsInt()
  @Min(1)
  order!: number;
}

/**
 * DTO for creating a new quote configuration
 */
export class CreateQuoteConfigurationDto {
  @ApiPropertyOptional({ example: 30, description: 'Default quote validity in days' })
  @IsInt()
  @IsOptional()
  @Min(1)
  defaultValidityDays?: number;

  @ApiPropertyOptional({ example: 3, description: 'Maximum allowed versions per quote' })
  @IsInt()
  @IsOptional()
  @Min(1)
  maxVersions?: number;

  @ApiPropertyOptional({ example: 4, description: 'Default project completion weeks' })
  @IsInt()
  @IsOptional()
  @Min(1)
  defaultCompletionWeeks?: number;

  @ApiPropertyOptional({
    type: GstConfigDto,
    description: 'GST split configuration',
    example: { rate1: 12, rate1Percentage: 70, rate2: 18, rate2Percentage: 30 },
  })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => GstConfigDto)
  gstConfig?: GstConfigDto;

  @ApiPropertyOptional({
    type: WattageRoundingConfigDto,
    description: 'Wattage rounding configuration',
    example: { roundTo: 10, roundUpThreshold: 5 },
  })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => WattageRoundingConfigDto)
  wattageRounding?: WattageRoundingConfigDto;

  @ApiPropertyOptional({
    type: [PaymentMilestoneDto],
    description: 'Payment milestones',
    example: [
      { stage: 'advance', name: 'Advance', percentage: 40, order: 1 },
      { stage: 'material_delivery', name: 'Material Delivery', percentage: 30, order: 2 },
    ],
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PaymentMilestoneDto)
  paymentMilestones?: PaymentMilestoneDto[];

  @ApiPropertyOptional({ example: true, description: 'Show inventory stock in quote UI' })
  @IsBoolean()
  @IsOptional()
  showInventoryStock?: boolean;

  @ApiPropertyOptional({ example: 15, description: 'Minimum profit margin percentage' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  minProfitMarginPercent?: number;

  @ApiPropertyOptional({ example: 'Default configuration for residential quotes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

