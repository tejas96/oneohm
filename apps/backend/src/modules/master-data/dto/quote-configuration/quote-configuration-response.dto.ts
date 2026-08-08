import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GstConfig, PaymentMilestoneConfig, ProfitMarginTier } from '@tejas96/shared/types';
import { Expose, Transform, Type } from 'class-transformer';

/**
 * DTO for quote configuration response
 */
export class QuoteConfigurationResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Expose()
  id!: string;

  @ApiProperty({ example: 30 })
  @Expose()
  defaultValidityDays!: number;

  @ApiProperty({ example: 3 })
  @Expose()
  maxVersions!: number;

  @ApiProperty({ example: 4 })
  @Expose()
  defaultCompletionWeeks!: number;

  @ApiProperty({
    example: { rate1: 5, rate1Percentage: 70, rate2: 18, rate2Percentage: 30 },
  })
  @Expose()
  @Transform(({ key, obj }) => (obj as Record<string, unknown>)[key])
  gstConfig!: GstConfig;

  @ApiProperty({
    example: [
      { stage: 'advance', name: 'Advance', percentage: 10, order: 1 },
      { stage: 'installation_complete', name: 'Installation Complete', percentage: 85, order: 2 },
      { stage: 'commissioning', name: 'Commissioning', percentage: 5, order: 3 },
    ],
  })
  @Expose()
  @Transform(({ key, obj }) => (obj as Record<string, unknown>)[key])
  paymentMilestones!: PaymentMilestoneConfig[];

  @ApiProperty({
    example: [
      { minSystemSizeKw: 0, maxSystemSizeKw: 5, marginPercent: 10 },
      { minSystemSizeKw: 5, maxSystemSizeKw: null, marginPercent: 8 },
    ],
  })
  @Expose()
  @Transform(({ key, obj }) => (obj as Record<string, unknown>)[key])
  profitMarginTiers!: ProfitMarginTier[];

  @ApiProperty({ example: true })
  @Expose()
  showInventoryStock!: boolean;

  @ApiProperty({ example: true })
  @Expose()
  isActive!: boolean;

  @ApiPropertyOptional({ example: 'Default configuration' })
  @Expose()
  notes?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @Expose()
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @Expose()
  updatedAt!: Date;
}

/**
 * DTO for paginated quote configurations response
 */
export class QuoteConfigurationListResponseDto {
  @ApiProperty({ type: [QuoteConfigurationResponseDto] })
  @Expose()
  @Type(() => QuoteConfigurationResponseDto)
  data!: QuoteConfigurationResponseDto[];

  @ApiProperty({ example: 5 })
  @Expose()
  total!: number;

  @ApiProperty({ example: 1 })
  @Expose()
  page!: number;

  @ApiProperty({ example: 20 })
  @Expose()
  limit!: number;
}
