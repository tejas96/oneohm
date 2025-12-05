import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PhaseType, PanelTechnology, StructureType } from '@oneohm-epc/shared-types';

/**
 * System configuration in the calculated quote
 */
export class SystemConfigDto {
  @ApiProperty({ description: 'Total system size in kW', example: 6 })
  totalSystemSizeKw!: number;

  @ApiProperty({ description: 'DCR panel system size in kW', example: 3 })
  dcrSizeKw!: number;

  @ApiProperty({ description: 'Non-DCR panel system size in kW', example: 3 })
  nonDcrSizeKw!: number;

  @ApiProperty({ enum: PhaseType, description: 'Electrical phase type' })
  phaseType!: PhaseType;
}

/**
 * Calculated panel details
 */
export class CalculatedPanelDto {
  @ApiProperty({ description: 'Product ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  productId!: string;

  @ApiProperty({ description: 'Panel name', example: 'Adani PERC DCR 540W' })
  name!: string;

  @ApiProperty({ description: 'Brand', example: 'Adani' })
  brand!: string;

  @ApiProperty({ description: 'Whether DCR panel', example: true })
  isDcr!: boolean;

  @ApiProperty({ enum: PanelTechnology, description: 'Panel technology' })
  technology!: PanelTechnology;

  @ApiProperty({ description: 'Wattage per panel in W', example: 540 })
  wattagePerPanel!: number;

  @ApiProperty({ description: 'Number of panels', example: 10 })
  quantity!: number;

  @ApiProperty({ description: 'Total wattage in W', example: 5400 })
  totalWattage!: number;

  @ApiProperty({ description: 'Price per watt in INR', example: 24 })
  pricePerWatt!: number;

  @ApiProperty({ description: 'Line total before tax in INR', example: 129600 })
  lineTotal!: number;

  @ApiProperty({ description: 'GST amount in INR', example: 15552 })
  gstAmount!: number;
}

/**
 * Single inverter in the combination
 */
export class InverterItemDto {
  @ApiProperty({ description: 'Product ID' })
  productId!: string;

  @ApiProperty({ description: 'Inverter name', example: 'Sungrow 5KW 1-Phase' })
  name!: string;

  @ApiProperty({ description: 'Brand', example: 'Sungrow' })
  brand!: string;

  @ApiProperty({ description: 'Capacity in kW', example: 5 })
  capacityKw!: number;

  @ApiProperty({ description: 'Quantity', example: 1 })
  quantity!: number;

  @ApiProperty({ description: 'Unit price in INR', example: 45000 })
  unitPrice!: number;

  @ApiProperty({ description: 'Line total in INR', example: 45000 })
  lineTotal!: number;

  @ApiProperty({ description: 'GST amount in INR', example: 8100 })
  gstAmount!: number;
}

/**
 * Calculated inverter configuration
 */
export class CalculatedInverterDto {
  @ApiProperty({
    type: [InverterItemDto],
    description: 'List of inverters (may be multiple for combination)',
  })
  inverters!: InverterItemDto[];

  @ApiProperty({ description: 'Total inverter capacity in kW', example: 60 })
  totalCapacityKw!: number;

  @ApiProperty({ description: 'Total cost before tax in INR', example: 250000 })
  totalCost!: number;

  @ApiProperty({ description: 'Total GST in INR', example: 45000 })
  totalGst!: number;
}

/**
 * Calculated structure details
 */
export class CalculatedStructureDto {
  @ApiProperty({ description: 'Product ID' })
  productId!: string;

  @ApiProperty({ description: 'Structure name', example: 'Aluminum Rail Mount' })
  name!: string;

  @ApiProperty({ enum: StructureType, description: 'Structure type' })
  structureType!: StructureType;

  @ApiProperty({ description: 'Quantity (usually per kW)', example: 5 })
  quantity!: number;

  @ApiProperty({ description: 'Unit price in INR', example: 3000 })
  unitPrice!: number;

  @ApiProperty({ description: 'Line total in INR', example: 15000 })
  lineTotal!: number;

  @ApiProperty({ description: 'GST amount in INR', example: 1800 })
  gstAmount!: number;
}

/**
 * Installation cost breakdown
 */
export class CalculatedInstallationDto {
  @ApiProperty({ description: 'Electrical work cost in INR', example: 15000 })
  electricalWork!: number;

  @ApiProperty({ description: 'Fixed material cost in INR', example: 8000 })
  fixedMaterial!: number;

  @ApiProperty({ description: 'Variable floor cost in INR', example: 0 })
  variableFloor!: number;

  @ApiProperty({ description: 'MSEDCL charges in INR', example: 5000 })
  msedclCharges!: number;

  @ApiProperty({ description: 'Supervision charges in INR', example: 3000 })
  supervision!: number;

  @ApiProperty({ description: 'Transport cost in INR', example: 2000 })
  transport!: number;

  @ApiProperty({ description: 'Total installation before tax in INR', example: 33000 })
  totalBeforeTax!: number;

  @ApiProperty({ description: 'GST on installation in INR', example: 3960 })
  gstAmount!: number;

  @ApiProperty({ description: 'Total with GST in INR', example: 36960 })
  totalWithGst!: number;
}

/**
 * Subsidy tier breakdown
 */
export class SubsidyBreakdownDto {
  @ApiProperty({ description: 'Starting kW', example: 0 })
  fromKw!: number;

  @ApiProperty({ description: 'Ending kW', example: 2 })
  toKw!: number;

  @ApiProperty({ description: 'kW in this tier', example: 2 })
  kw!: number;

  @ApiProperty({ description: 'Rate per kW in INR', example: 30000 })
  ratePerKw!: number;

  @ApiProperty({ description: 'Amount in INR', example: 60000 })
  amount!: number;
}

/**
 * Calculated subsidy details
 */
export class CalculatedSubsidyDto {
  @ApiProperty({ description: 'Whether subsidy is applicable', example: true })
  isApplicable!: boolean;

  @ApiPropertyOptional({ description: 'Scheme name', example: 'PM Surya Ghar' })
  schemeName?: string;

  @ApiPropertyOptional({ description: 'Eligible system size for subsidy in kW', example: 3 })
  eligibleKw?: number;

  @ApiProperty({ description: 'Total subsidy amount in INR', example: 78000 })
  amount!: number;

  @ApiPropertyOptional({ type: [SubsidyBreakdownDto], description: 'Breakdown by tier' })
  breakdown?: SubsidyBreakdownDto[];
}

/**
 * Pricing summary
 */
export class PricingSummaryDto {
  @ApiProperty({ description: 'Sum of all line items before tax in INR', example: 250000 })
  basePrice!: number;

  @ApiProperty({ description: 'GST at 12% on 70% of base in INR', example: 21000 })
  gst12Amount!: number;

  @ApiProperty({ description: 'GST at 18% on 30% of base in INR', example: 13500 })
  gst18Amount!: number;

  @ApiProperty({ description: 'Total GST in INR', example: 34500 })
  totalGst!: number;

  @ApiProperty({ description: 'Total price with GST in INR', example: 284500 })
  totalPrice!: number;

  @ApiProperty({ description: 'Discount amount in INR', example: 0 })
  discountAmount!: number;

  @ApiProperty({ description: 'Final price after discount in INR', example: 284500 })
  finalPrice!: number;
}

/**
 * Inventory status for a product
 */
export class InventoryStatusDto {
  @ApiProperty({ description: 'Product ID' })
  productId!: string;

  @ApiProperty({ description: 'Product name' })
  productName!: string;

  @ApiProperty({ description: 'Required quantity' })
  requiredQuantity!: number;

  @ApiProperty({ description: 'Available stock' })
  availableStock!: number;

  @ApiProperty({ description: 'Whether stock is sufficient' })
  isSufficient!: boolean;
}

/**
 * Complete quote calculation response
 */
export class CalculateQuoteResponseDto {
  @ApiProperty({ type: SystemConfigDto, description: 'System configuration' })
  systemConfig!: SystemConfigDto;

  @ApiProperty({
    type: [CalculatedPanelDto],
    description: 'Panel configurations (may have DCR + Non-DCR split)',
  })
  panels!: CalculatedPanelDto[];

  @ApiProperty({ type: CalculatedInverterDto, description: 'Inverter configuration' })
  inverters!: CalculatedInverterDto;

  @ApiProperty({ type: CalculatedStructureDto, description: 'Structure details' })
  structure!: CalculatedStructureDto;

  @ApiProperty({ type: CalculatedInstallationDto, description: 'Installation costs' })
  installation!: CalculatedInstallationDto;

  @ApiProperty({ type: PricingSummaryDto, description: 'Pricing summary' })
  pricing!: PricingSummaryDto;

  @ApiProperty({ type: CalculatedSubsidyDto, description: 'Subsidy calculation' })
  subsidy!: CalculatedSubsidyDto;

  @ApiProperty({ description: 'Effective price (final - subsidy) in INR', example: 206500 })
  effectivePrice!: number;

  @ApiProperty({ description: 'Estimated completion in weeks', example: 4 })
  completionWeeks!: number;

  @ApiPropertyOptional({ type: [InventoryStatusDto], description: 'Inventory status for products' })
  inventoryStatus?: InventoryStatusDto[];

  @ApiProperty({ description: 'Calculation timestamp' })
  calculatedAt!: string;
}
