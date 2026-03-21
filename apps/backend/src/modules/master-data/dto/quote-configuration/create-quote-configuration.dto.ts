import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
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
  ValidateIf,
  ValidateNested,
} from 'class-validator';

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

export class ProfitMarginTierDto {
  @ApiProperty({ example: 0, description: 'Minimum system size (kW, inclusive)' })
  @IsNumber()
  @Min(0)
  minSystemSizeKw!: number;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Maximum system size (kW, inclusive); null means no upper limit',
    example: 10,
  })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsNumber()
  @Min(0)
  maxSystemSizeKw?: number | null;

  @ApiProperty({ example: 12, description: 'Profit margin percentage' })
  @IsNumber()
  @Min(0)
  marginPercent!: number;
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
    example: { rate1: 5, rate1Percentage: 70, rate2: 18, rate2Percentage: 30 },
  })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => GstConfigDto)
  gstConfig?: GstConfigDto;

  @ApiPropertyOptional({
    type: [PaymentMilestoneDto],
    description: 'Payment milestones',
    example: [
      { stage: 'advance', name: 'Advance', percentage: 10, order: 1 },
      { stage: 'installation_complete', name: 'Installation Complete', percentage: 85, order: 2 },
      { stage: 'commissioning', name: 'Commissioning', percentage: 5, order: 3 },
    ],
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PaymentMilestoneDto)
  paymentMilestones?: PaymentMilestoneDto[];

  @ApiPropertyOptional({
    type: [ProfitMarginTierDto],
    description: 'Profit margin tiers by system size (kW)',
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ProfitMarginTierDto)
  profitMarginTiers?: ProfitMarginTierDto[];

  @ApiPropertyOptional({ example: true, description: 'Show inventory stock in quote UI' })
  @IsBoolean()
  @IsOptional()
  showInventoryStock?: boolean;

  @ApiPropertyOptional({ example: 'Default configuration for residential quotes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
