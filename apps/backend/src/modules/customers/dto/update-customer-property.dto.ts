import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ConnectionType,
  LeadTemperature,
  PropertyType,
  type ShadingAnalysis,
  type SurveyData,
} from '@tejas96/shared/types';
import { CONSUMER_NUMBER_REGEX } from '@tejas96/shared/utils';
import { Type, Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import { GpsCoordinatesDto } from './gps-coordinates.dto';
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

  @ApiPropertyOptional({ description: 'GPS coordinates of the installation site' })
  @IsOptional()
  @ValidateNested()
  @Type(() => GpsCoordinatesDto)
  gpsCoordinates?: GpsCoordinatesDto;

  // ==================== Electricity/Consumer Details ====================
  @ApiPropertyOptional({
    example: '279692003475',
    description: 'Electricity consumer number (10–12 digits)',
  })
  @ValidateIf((o: UpdateCustomerPropertyDto) => o.consumerNumber !== undefined)
  @IsString()
  @IsNotEmpty()
  @Matches(CONSUMER_NUMBER_REGEX, { message: 'Consumer number must be 10–12 digits' })
  @MaxLength(50)
  consumerNumber?: string;

  @ApiPropertyOptional({
    example: 'Rajesh Kumar',
    description: 'Name on electricity bill',
  })
  @ValidateIf((o: UpdateCustomerPropertyDto) => o.consumerName !== undefined)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
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
  @ValidateIf((o: UpdateCustomerPropertyDto) => o.discomName !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  discomName?: string;

  @ApiPropertyOptional({
    enum: ConnectionType,
    example: ConnectionType.SINGLE_PHASE,
    description: 'Electricity connection type',
  })
  @ValidateIf((o: UpdateCustomerPropertyDto) => o.connectionType !== undefined)
  @IsEnum(ConnectionType)
  @IsNotEmpty()
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

  // ==================== Lead Tracking ====================
  @ApiPropertyOptional({
    enum: LeadTemperature,
    example: LeadTemperature.WARM,
    description: 'Lead temperature (hot/warm/cold)',
  })
  @IsEnum(LeadTemperature)
  @IsOptional()
  leadTemperature?: LeadTemperature;

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
      {
        url: 'https://storage.example.com/aadhaar.jpg',
        tag: 'aadhaar_card',
        fileName: 'aadhaar.jpg',
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PropertyDocumentDto)
  documents?: PropertyDocumentDto[];

  // ==================== Notes ====================
  @ApiPropertyOptional({
    description: 'Additional notes about the property',
  })
  @IsString()
  @IsOptional()
  notes?: string;

  // ==================== Site Visit / Survey ====================
  @ApiPropertyOptional({ description: 'Available roof area in sqft' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  availableRoofAreaSqft?: number;

  @ApiPropertyOptional({ description: 'Shading analysis data' })
  @IsObject()
  @IsOptional()
  shadingAnalysis?: ShadingAnalysis;

  @ApiPropertyOptional({ description: 'Site visit notes/observations' })
  @IsString()
  @IsOptional()
  siteNotes?: string;

  @ApiPropertyOptional({ description: 'Survey assessment data (JSONB)' })
  @IsObject()
  @IsOptional()
  surveyData?: SurveyData;

  @ApiPropertyOptional({ description: 'User assigned to site visit' })
  @IsUUID()
  @IsOptional()
  siteVisitAssignee?: string;

  @ApiPropertyOptional({ description: 'User assigned to site survey' })
  @IsUUID()
  @IsOptional()
  siteSurveyAssignee?: string;
}
