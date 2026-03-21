import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  type CalculatorInputs,
  type PaymentMilestone,
  type PricingBreakdown,
  ProjectType,
  SystemType,
} from '@oneohm-epc/shared/types';
import { Expose, Transform } from 'class-transformer';

import { toNum } from '../../../../common/utils';

/**
 * Quote Version Response DTO
 * Serialized response for an individual quote version with its line items.
 */
export class QuoteVersionResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  quoteId!: string;

  @ApiProperty({ example: 1 })
  @Expose()
  versionNumber!: number;

  @ApiProperty({ enum: Object.values(SystemType), example: SystemType.ON_GRID })
  @Expose()
  systemType!: SystemType;

  @ApiProperty({ example: 5.5 })
  @Expose()
  @Transform(({ value }) => toNum(value))
  systemSizeKw!: number;

  @ApiProperty({ example: 5500 })
  @Expose()
  totalWattageWp!: number;

  @ApiProperty({ enum: Object.values(ProjectType), example: ProjectType.RESIDENTIAL })
  @Expose()
  projectType!: ProjectType;

  @ApiProperty({ example: 500000.0 })
  @Expose()
  @Transform(({ value }) => toNum(value))
  finalPrice!: number;

  @ApiPropertyOptional({ example: 470000.0 })
  @Expose()
  @Transform(({ value }) => toNum(value))
  effectivePrice?: number;

  @ApiPropertyOptional({ description: 'Full pricing breakdown' })
  @Expose()
  @Transform(({ key, obj }) => (obj as Record<string, unknown>)[key])
  pricingBreakdown?: PricingBreakdown;

  @ApiPropertyOptional({ description: 'Payment milestones' })
  @Expose()
  @Transform(({ key, obj }) => (obj as Record<string, unknown>)[key])
  paymentMilestones?: PaymentMilestone[];

  @ApiPropertyOptional({ description: 'Calculator inputs used to generate this version' })
  @Expose()
  @Transform(({ key, obj }) => (obj as Record<string, unknown>)[key])
  calculatorInputs?: CalculatorInputs;

  @ApiProperty({ example: 4 })
  @Expose()
  projectCompletionWeeks!: number;

  @ApiPropertyOptional({ example: 'Updated panel configuration' })
  @Expose()
  changeSummary?: string;

  @ApiProperty({ example: true })
  @Expose()
  isCurrent!: boolean;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  createdBy!: string;

  @ApiProperty({ example: '2025-01-15T10:00:00Z' })
  @Expose()
  createdAt!: string;
}
