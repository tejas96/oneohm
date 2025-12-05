import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectType, PhaseType, DcrPreference, StructureType } from '@oneohm-epc/shared-types';
import {
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
} from 'class-validator';

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
    description: 'Preferred inverter brand (optional)',
    example: 'Sungrow',
  })
  @IsString()
  @IsOptional()
  preferredInverterBrand?: string;

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
}

/**
 * DTO for creating a quote from calculated result
 */
export class CreateQuoteFromCalculationDto extends CalculateQuoteDto {
  @ApiPropertyOptional({
    description: 'Discount percentage to apply',
    example: 5,
    minimum: 0,
    maximum: 50,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(50)
  discountPercent?: number;

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
}
