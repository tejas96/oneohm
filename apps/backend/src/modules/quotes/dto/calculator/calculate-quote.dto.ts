import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ProjectType,
  PhaseType,
  DcrPreference,
  StructureType,
  PanelTechnology,
  SystemType,
} from '@oneohm-epc/shared/types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

import { PaymentMilestoneDto } from '../versions/payment-milestone.dto';

/**
 * Panel override - user can specify exact panel product and quantity
 */
export class PanelOverrideDto {
  @ApiProperty({
    description: 'Product ID of the panel',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty({
    description: 'Number of panels',
    example: 6,
    minimum: 1,
  })
  @IsNumber()
  @IsPositive()
  @Min(1)
  quantity!: number;
}

/**
 * Inverter override - user can specify exact inverter products and quantities
 */
export class InverterOverrideDto {
  @ApiProperty({
    description: 'Product ID of the inverter',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty({
    description: 'Number of inverters of this type',
    example: 2,
    minimum: 1,
  })
  @IsNumber()
  @IsPositive()
  @Min(1)
  quantity!: number;
}

/**
 * DTO for calculating a quote
 * This is the main input from the sales person
 */
export class CalculateQuoteDto {
  @ApiProperty({
    description: 'Customer ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  customerId!: string;

  @ApiPropertyOptional({
    description: 'Property ID for the installation site',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsOptional()
  propertyId?: string;

  @ApiProperty({
    enum: ProjectType,
    description: 'Type of project',
    example: ProjectType.RESIDENTIAL,
  })
  @IsEnum(ProjectType)
  @IsNotEmpty()
  projectType!: ProjectType;

  @ApiProperty({
    description: 'Required system size in kW',
    example: 5,
    minimum: 1,
    maximum: 1000,
  })
  @IsNumber()
  @IsPositive()
  @Min(1)
  @Max(1000)
  systemSizeKw!: number;

  @ApiProperty({
    enum: PhaseType,
    description: 'Electrical phase type',
    example: PhaseType.SINGLE_PHASE,
  })
  @IsEnum(PhaseType)
  @IsNotEmpty()
  phaseType!: PhaseType;

  @ApiProperty({
    description: 'Whether government subsidy should be applied',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  subsidyApplicable!: boolean;

  @ApiPropertyOptional({
    description:
      'Specific subsidy configuration IDs to apply. If omitted, all active subsidies for the project type are used.',
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  selectedSubsidyIds?: string[];

  @ApiProperty({
    enum: DcrPreference,
    description: 'Customer preference for DCR vs Non-DCR panels',
    example: DcrPreference.AUTO_SPLIT,
    default: DcrPreference.AUTO_SPLIT,
  })
  @IsEnum(DcrPreference)
  @IsOptional()
  dcrPreference?: DcrPreference = DcrPreference.AUTO_SPLIT;

  @ApiPropertyOptional({
    description: 'Preferred solar panel brand (optional)',
    example: 'Adani',
  })
  @IsString()
  @IsOptional()
  preferredPanelBrand?: string;

  @ApiPropertyOptional({
    enum: PanelTechnology,
    description:
      'Preferred panel technology (PERC or TOPCON). If not specified, highest wattage panel is selected.',
    example: PanelTechnology.TOPCON,
  })
  @IsEnum(PanelTechnology)
  @IsOptional()
  preferredPanelTechnology?: PanelTechnology;

  @ApiPropertyOptional({
    description:
      'Preferred panel wattage (e.g., 570 for 560-580Wp range). Used to select specific panel variant.',
    example: 570,
  })
  @IsNumber()
  @IsOptional()
  @Min(100)
  @Max(1000)
  preferredPanelWattage?: number;

  @ApiPropertyOptional({
    description: 'Preferred inverter brand (optional)',
    example: 'Sungrow',
  })
  @IsString()
  @IsOptional()
  preferredInverterBrand?: string;

  @ApiPropertyOptional({
    description:
      'Preferred inverter capacity in kW. When set, only inverters with this exact capacity are considered.',
    example: 20,
    minimum: 1,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  preferredInverterCapacityKw?: number;

  @ApiProperty({
    enum: StructureType,
    description: 'Type of mounting structure',
    example: StructureType.ALUMINUM_RAIL,
  })
  @IsEnum(StructureType)
  @IsNotEmpty()
  structureType!: StructureType;

  @ApiPropertyOptional({
    description: 'Installation floor number (0 for ground floor)',
    example: 0,
    default: 0,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(50)
  floorNumber?: number = 0;

  @ApiPropertyOptional({
    description: 'Distance from warehouse in kilometers',
    example: 30,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(500)
  distanceKm?: number;

  // ==================== OVERRIDE FIELDS ====================
  // These allow users to customize the auto-calculated configuration

  @ApiPropertyOptional({
    type: [PanelOverrideDto],
    description: `
      Override auto-calculated panel selection.
      Use this when user wants specific panels or quantities.
      Note: All panels in override must be from the same brand (no brand mixing allowed).
      Example: User wants 7 panels instead of auto-calculated 6.
    `,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PanelOverrideDto)
  @IsOptional()
  panelOverrides?: PanelOverrideDto[];

  @ApiPropertyOptional({
    type: [InverterOverrideDto],
    description: `
      Override auto-calculated inverter selection.
      Use this when user wants specific inverter combination.
      Example: For 10KW system, user wants 2x 5KW instead of 1x 10KW.
      Total inverter capacity should be >= system size.
    `,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InverterOverrideDto)
  @IsOptional()
  inverterOverrides?: InverterOverrideDto[];

  // ==================== MANUAL QUANTITY FIELDS ====================
  // These allow users to specify target quantities without selecting specific products.
  // Backend will find optimal product combinations to match the requested quantity
  // while meeting/exceeding the required system capacity.
  // NOTE: Cannot be used together with panelOverrides/inverterOverrides.

  @ApiPropertyOptional({
    description: `
      Target inverter count for manual adjustment.
      Backend finds optimal inverter combination with exactly this many units
      that meets or exceeds the system size.
      Cannot be used together with inverterOverrides.
      Example: For 50kW, user wants 3 inverters instead of auto-calculated 2.
    `,
    example: 3,
    minimum: 1,
    maximum: 20,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(20)
  manualInverterCount?: number;

  @ApiPropertyOptional({
    description: `
      Target DCR panel count for manual adjustment.
      Backend finds suitable DCR panel wattage so that count * wattage >= required DCR capacity.
      Cannot be used together with panelOverrides.
      Only valid when dcrPreference is DCR_ONLY or AUTO_SPLIT.
      Example: User wants 20 DCR panels instead of auto-calculated 18.
    `,
    example: 20,
    minimum: 1,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  manualDcrPanelCount?: number;

  @ApiPropertyOptional({
    description: `
      Target Non-DCR panel count for manual adjustment.
      Backend finds suitable Non-DCR panel wattage so that count * wattage >= required Non-DCR capacity.
      Cannot be used together with panelOverrides.
      Only valid when dcrPreference is NON_DCR_ONLY or AUTO_SPLIT.
      Example: User wants 15 Non-DCR panels instead of auto-calculated 12.
    `,
    example: 15,
    minimum: 1,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  manualNonDcrPanelCount?: number;
}

/**
 * DTO for creating a quote from calculated result
 */
export class CreateQuoteFromCalculationDto extends CalculateQuoteDto {
  @ApiPropertyOptional({
    enum: Object.values(SystemType),
    enumName: 'SystemType',
    description: 'System type (defaults to ON_GRID)',
    example: SystemType.ON_GRID,
  })
  @IsEnum(SystemType)
  @IsOptional()
  systemType?: SystemType;

  @ApiPropertyOptional({
    description:
      'Existing quote ID. When provided, creates a new version of the existing quote instead of a new quote.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsOptional()
  quoteId?: string;

  @ApiPropertyOptional({
    description: 'Discount amount in INR',
    example: 5000,
    minimum: 0,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  discountAmount?: number;

  @ApiPropertyOptional({
    description: 'Internal notes for the quote',
    example: 'Customer requested faster installation',
  })
  @IsString()
  @IsOptional()
  internalNotes?: string;

  @ApiPropertyOptional({
    description: 'Notes visible to customer',
    example: 'Quote valid for 30 days',
  })
  @IsString()
  @IsOptional()
  customerNotes?: string;

  @ApiPropertyOptional({
    description: 'Sales person ID (defaults to current user)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsOptional()
  salesPersonId?: string;

  @ApiPropertyOptional({
    description: 'Reseller ID if quote is through reseller',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsOptional()
  resellerId?: string;

  @ApiPropertyOptional({
    type: [PaymentMilestoneDto],
    description: 'Custom payment milestones (auto-generated from config if not provided)',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentMilestoneDto)
  @IsOptional()
  paymentMilestones?: PaymentMilestoneDto[];
}
