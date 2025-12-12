import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  GstConfig,
  WattageRoundingConfig,
  PaymentMilestoneConfig,
} from '@oneohm-epc/shared-types';
import { Expose, Type } from 'class-transformer';

/**
 * DTO for quote configuration response
 */
export class QuoteConfigurationResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Expose()
  id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  @Expose()
  organizationId!: string;

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
    example: { rate1: 12, rate1Percentage: 70, rate2: 18, rate2Percentage: 30 },
  })
  @Expose()
  gstConfig!: GstConfig;

  @ApiProperty({
    example: { roundTo: 10, roundUpThreshold: 5 },
  })
  @Expose()
  wattageRounding!: WattageRoundingConfig;

  @ApiProperty({
    example: [
      { stage: 'advance', name: 'Advance', percentage: 40, order: 1 },
      { stage: 'material_delivery', name: 'Material Delivery', percentage: 30, order: 2 },
      { stage: 'installation_complete', name: 'Installation Complete', percentage: 20, order: 3 },
      { stage: 'commissioning', name: 'Commissioning', percentage: 10, order: 4 },
    ],
  })
  @Expose()
  paymentMilestones!: PaymentMilestoneConfig[];

  @ApiProperty({ example: true })
  @Expose()
  showInventoryStock!: boolean;

  @ApiPropertyOptional({ example: 15 })
  @Expose()
  minProfitMarginPercent?: number;

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

