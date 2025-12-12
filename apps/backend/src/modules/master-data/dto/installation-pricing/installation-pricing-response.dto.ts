import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectType, InstallationCostComponents } from '@oneohm-epc/shared-types';
import { Expose, Type } from 'class-transformer';

/**
 * DTO for installation pricing response
 */
export class InstallationPricingResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Expose()
  id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  @Expose()
  organizationId!: string;

  @ApiPropertyOptional({ example: 'Installation Charges 3KW' })
  @Expose()
  name?: string;

  @ApiPropertyOptional({ example: 'INST-3KW' })
  @Expose()
  code?: string;

  @ApiProperty({ example: 3 })
  @Expose()
  minSystemSizeKw!: number;

  @ApiProperty({ example: 3 })
  @Expose()
  maxSystemSizeKw!: number;

  @ApiProperty({ enum: ProjectType, example: ProjectType.RESIDENTIAL })
  @Expose()
  projectType!: ProjectType;

  @ApiProperty({
    example: {
      electrical_work: 4200,
      fixed_material: 8500,
      variable_floor: 4548,
      structure_cost: 13336,
      installation_labor: 4400,
      msedcl_charges: 1500,
      loading_unloading: 1500,
    },
  })
  @Expose()
  costComponents!: InstallationCostComponents;

  @ApiProperty({ example: 35 })
  @Expose()
  transportRatePerKm!: number;

  @ApiProperty({ example: 25 })
  @Expose()
  floorIncrementPercent!: number;

  @ApiProperty({ example: 18 })
  @Expose()
  gstRate!: number;

  @ApiProperty({ example: '2024-01-01' })
  @Expose()
  effectiveFrom!: Date;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @Expose()
  effectiveTo?: Date;

  @ApiProperty({ example: true })
  @Expose()
  isActive!: boolean;

  @ApiPropertyOptional({ example: 'Notes about this pricing tier' })
  @Expose()
  notes?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @Expose()
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @Expose()
  updatedAt!: Date;

  // ==================== Computed Fields ====================

  /**
   * Total of all fixed cost components (excludes variable_floor)
   */
  @ApiPropertyOptional({ example: 33436, description: 'Total fixed costs' })
  @Expose()
  totalFixedCosts?: number;
}

/**
 * DTO for paginated installation pricing response
 */
export class InstallationPricingListResponseDto {
  @ApiProperty({ type: [InstallationPricingResponseDto] })
  @Expose()
  @Type(() => InstallationPricingResponseDto)
  data!: InstallationPricingResponseDto[];

  @ApiProperty({ example: 100 })
  @Expose()
  total!: number;

  @ApiProperty({ example: 1 })
  @Expose()
  page!: number;

  @ApiProperty({ example: 20 })
  @Expose()
  limit!: number;
}

