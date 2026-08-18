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

  /**
   * The schedule for a loan-financed property — a smaller advance, with the
   * lender releasing the bulk on installation (10/70/20 against 10/85/5).
   *
   * It has existed on the entity from the start and was never serialised, so
   * no client could obtain it. `QuoteService.create` does pick it correctly,
   * but only when the request omits `paymentMilestones` entirely — and the
   * payment-terms dialog always sends them. The net effect was that every
   * loan-financed quote silently saved the self-financed advance.
   *
   * Prefer `paymentMilestones` with a `propertyId` on the request: the server
   * resolves the right one and reports which in `isLoanSchedule`. This array is
   * exposed so the choice is inspectable rather than hidden.
   */
  @ApiProperty({
    example: [
      { stage: 'advance', name: 'Advance', percentage: 10, order: 1 },
      { stage: 'installation_complete', name: 'Installation Complete', percentage: 70, order: 2 },
      { stage: 'commissioning', name: 'Commissioning', percentage: 20, order: 3 },
    ],
  })
  @Expose()
  @Transform(({ key, obj }) => (obj as Record<string, unknown>)[key])
  paymentMilestonesLoan!: PaymentMilestoneConfig[];

  /**
   * Whether `paymentMilestones` above is the loan schedule.
   *
   * Only ever true when the request supplied a `propertyId` and that property
   * is financed. Without a `propertyId` the server cannot know, so this is
   * false and `paymentMilestones` is the self-financed default.
   */
  @ApiProperty({ example: false })
  @Expose()
  isLoanSchedule!: boolean;

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
