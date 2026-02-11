import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ConnectionType,
  LeadTemperature,
  PropertyStatus,
  PropertyType,
} from '@oneohm-epc/shared-types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { PropertyDocumentDto } from './property-document.dto';

/**
 * DTO for updating a customer property (installation site)
 * All fields are optional for partial updates
 */
export class UpdateCustomerPropertyDto {
  // ==================== Property Details ====================
  @ApiPropertyOptional({
    example: 'Kumar Residence',
    description: 'Property/building name',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  propertyName?: string;

  @ApiPropertyOptional({
    enum: PropertyType,
    example: PropertyType.RESIDENTIAL,
    description: 'Type of property',
  })
  @IsEnum(PropertyType)
  @IsOptional()
  propertyType?: PropertyType;

  // ==================== Address ====================
  @ApiPropertyOptional({
    example: '123, MG Road, Koramangala',
    description: 'Site address',
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 'Bangalore', description: 'City' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'Karnataka', description: 'State' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ example: 'India', description: 'Country' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ example: '560095', description: 'PIN code' })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  pincode?: string;

  @ApiPropertyOptional({
    example: 'POINT(12.9352 77.6245)',
    description: 'GPS coordinates in POINT format',
  })
  @IsString()
  @IsOptional()
  locationCoordinates?: string;

  // ==================== Electricity/Consumer Details ====================
  @ApiPropertyOptional({
    example: 'CN123456789',
    description: 'Electricity consumer number',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  consumerNumber?: string;

  @ApiPropertyOptional({
    example: 'Rajesh Kumar',
    description: 'Name on electricity bill',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  consumerName?: string;

  @ApiPropertyOptional({
    example: '5 KW',
    description: 'Current sanctioned load',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  currentLoad?: string;

  @ApiPropertyOptional({
    example: 'MSEDCL',
    description: 'Electricity distribution company',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  discomName?: string;

  @ApiPropertyOptional({
    enum: ConnectionType,
    example: ConnectionType.SINGLE_PHASE,
    description: 'Electricity connection type',
  })
  @IsEnum(ConnectionType)
  @IsOptional()
  connectionType?: ConnectionType;

  @ApiPropertyOptional({
    example: 5.0,
    description: 'Sanctioned load in KW',
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  sanctionedLoad?: number;

  @ApiPropertyOptional({
    example: 'MTR123456',
    description: 'Electricity meter number',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  meterNumber?: string;

  // ==================== Site Details ====================
  @ApiPropertyOptional({
    example: 3500,
    description: 'Average monthly electricity bill in INR',
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  monthlyBill?: number;

  @ApiPropertyOptional({
    example: 500,
    description: 'Available roof area in square feet',
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  roofAreaSqft?: number;

  // ==================== Lead Tracking ====================
  @ApiPropertyOptional({
    enum: LeadTemperature,
    example: LeadTemperature.WARM,
    description: 'Lead temperature (hot/warm/cold)',
  })
  @IsEnum(LeadTemperature)
  @IsOptional()
  leadTemperature?: LeadTemperature;

  @ApiPropertyOptional({
    example: '2025-01-20',
    description: 'Next follow-up date',
  })
  @IsDateString()
  @IsOptional()
  nextFollowUpDate?: string;

  @ApiPropertyOptional({
    description: 'Notes for next follow-up',
  })
  @IsString()
  @IsOptional()
  followUpNotes?: string;

  // ==================== Flags ====================
  @ApiPropertyOptional({
    example: true,
    description: 'Is this the primary property for the customer',
  })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Customer wants loan financing for this property',
  })
  @IsBoolean()
  @IsOptional()
  wantsLoan?: boolean;

  // ==================== Documents ====================
  @ApiPropertyOptional({
    type: [PropertyDocumentDto],
    description: 'Property-level documents (identity docs, KYC, etc.)',
    example: [
      { url: 'https://storage.example.com/aadhaar.jpg', tag: 'aadhaar_card', fileName: 'aadhaar.jpg' },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PropertyDocumentDto)
  documents?: PropertyDocumentDto[];

  // ==================== Status ====================
  @ApiPropertyOptional({
    enum: PropertyStatus,
    example: PropertyStatus.ACTIVE,
    description: 'Property status',
  })
  @IsEnum(PropertyStatus)
  @IsOptional()
  status?: PropertyStatus;

  // ==================== Notes ====================
  @ApiPropertyOptional({
    description: 'Additional notes about the property',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
