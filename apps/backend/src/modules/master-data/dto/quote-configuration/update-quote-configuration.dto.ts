import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

import {
  GstConfigDto,
  PaymentMilestoneDto,
  ProfitMarginTierDto,
} from './create-quote-configuration.dto';

/**
 * DTO for updating a quote configuration
 */
export class UpdateQuoteConfigurationDto {
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

  @ApiPropertyOptional({ type: GstConfigDto })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => GstConfigDto)
  gstConfig?: GstConfigDto;

  @ApiPropertyOptional({ type: [PaymentMilestoneDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PaymentMilestoneDto)
  paymentMilestones?: PaymentMilestoneDto[];

  @ApiPropertyOptional({ type: [ProfitMarginTierDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ProfitMarginTierDto)
  profitMarginTiers?: ProfitMarginTierDto[];

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  showInventoryStock?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'Updated notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
