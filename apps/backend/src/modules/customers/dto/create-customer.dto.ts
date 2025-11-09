import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { CustomerStatus } from '@oneohm-epc/shared-types';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

/**
 * DTO for creating a new customer
 */
export class CreateCustomerDto {
  // ==================== Personal Info ====================
  @ApiProperty({ example: 'Rajesh', description: 'Customer first name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @ApiPropertyOptional({ example: 'Kumar', description: 'Customer last name' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({
    example: 'rajesh.kumar@example.com',
    description: 'Customer email address',
  })
  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @ApiProperty({ example: '+91-9876543210', description: 'Primary phone number' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[\d\s\-+()]+$/, {
    message: 'Phone must contain only digits, spaces, and +-() characters',
  })
  @MaxLength(20)
  phone!: string;

  @ApiPropertyOptional({
    example: '+91-9876543211',
    description: 'Alternate phone number',
  })
  @IsString()
  @IsOptional()
  @Matches(/^[\d\s\-+()]+$/, {
    message: 'Phone must contain only digits, spaces, and +-() characters',
  })
  @MaxLength(20)
  alternatePhone?: string;

  // ==================== Consumer Details ====================
  @ApiPropertyOptional({
    example: 'CN123456789',
    description: 'Electricity consumer number',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  consumerNumber?: string;

  @ApiPropertyOptional({
    example: 'Rajesh Kumar House',
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

  // ==================== Address ====================
  @ApiPropertyOptional({
    example: '123, MG Road, Koramangala',
    description: 'Complete address',
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
    description: 'Geographic coordinates in POINT format',
  })
  @IsString()
  @IsOptional()
  locationCoordinates?: string;

  // ==================== Property Details ====================
  @ApiPropertyOptional({
    example: 'Kumar Residence',
    description: 'Property name',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  propertyName?: string;

  @ApiPropertyOptional({
    example: 'residential',
    description: 'Type of property (residential, commercial, etc.)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  propertyType?: string;

  // ==================== Source Tracking ====================
  @ApiPropertyOptional({
    example: 'website',
    description: 'How the customer found us',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  leadSource?: string;

  @ApiPropertyOptional({
    example: 'REF2024001',
    description: 'Referral code if applicable',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  referralCode?: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Reseller ID if customer came through reseller',
  })
  @IsUUID()
  @IsOptional()
  resellerId?: string;

  // ==================== Status ====================
  @ApiPropertyOptional({
    enum: Object.values(CustomerStatus),
    enumName: 'CustomerStatus',
    example: CustomerStatus.LEAD,
    description: 'Customer status',
  })
  @IsEnum(CustomerStatus)
  @IsOptional()
  status?: CustomerStatus;
}
