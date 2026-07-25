import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ConnectionType,
  LeadTemperature,
  PropertyStatus,
  PropertyType,
} from '@tejas96/shared/types';
import { CONSUMER_NUMBER_REGEX } from '@tejas96/shared/utils';
import { Type, Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { ChangeRequestItemDto } from './change-request.dto';
import { GpsCoordinatesDto } from './gps-coordinates.dto';
import { PropertyDocumentDto } from './property-document.dto';
import {
  HasUniqueChangeRequestTypes,
  IsValidChangeRequestArray,
} from '../validators/change-request.validator';

/**
 * DTO for creating a new customer property (installation site)
 */
export class CreateCustomerPropertyDto {
  // ==================== Customer Reference ====================
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Customer profile ID',
  })
  @IsUUID()
  @IsNotEmpty()
  customerId!: string;

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
  @ApiProperty({
    example: '279692003475',
    description: 'Electricity consumer number (10–12 digits)',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(CONSUMER_NUMBER_REGEX, { message: 'Consumer number must be 10–12 digits' })
  @MaxLength(50)
  consumerNumber!: string;

  @ApiProperty({
    example: 'Rajesh Kumar',
    description: 'Name on electricity bill',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  consumerName!: string;

  @ApiPropertyOptional({
    example: '5 KW',
    description: 'Current sanctioned load',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  currentLoad?: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'DISCOM hierarchy entry ID',
  })
  @IsUUID()
  @IsNotEmpty()
  discomId!: string;

  @ApiProperty({
    enum: ConnectionType,
    example: ConnectionType.SINGLE_PHASE,
    description: 'Electricity connection type',
  })
  @IsEnum(ConnectionType)
  @IsNotEmpty()
  connectionType!: ConnectionType;

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

  // ==================== Change of Request ====================
  @ApiPropertyOptional({
    type: [ChangeRequestItemDto],
    description: 'Change-of-request items captured at property creation',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6, { message: 'Too many change requests' })
  @ValidateNested({ each: true })
  @Type(() => ChangeRequestItemDto)
  @IsValidChangeRequestArray()
  @HasUniqueChangeRequestTypes()
  changeRequests?: ChangeRequestItemDto[];
}
