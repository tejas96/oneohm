import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationStatus } from '@oneohm-epc/shared-types';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * DTO for creating a new organization via Platform Admin
 * Includes super admin user details for initial setup
 */
export class CreateOrganizationDto {
  // ==================== Organization Details ====================

  @ApiProperty({
    description: 'Organization name',
    example: 'Solar Power India Pvt Ltd',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({
    description: 'Unique organization code (uppercase, no spaces)',
    example: 'SOLAR_INDIA',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  code!: string;

  @ApiPropertyOptional({
    description: 'Organization email',
    example: 'contact@solarindia.com',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Organization phone number',
    example: '+919876543210',
  })
  @IsPhoneNumber()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Organization address',
    example: '123 Green Energy Street',
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    description: 'City',
    example: 'Mumbai',
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({
    description: 'State',
    example: 'Maharashtra',
  })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({
    description: 'Country',
    example: 'India',
    default: 'India',
  })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({
    description: 'Pincode',
    example: '400001',
  })
  @IsString()
  @IsOptional()
  pincode?: string;

  @ApiPropertyOptional({
    description: 'GSTIN',
    example: '27AABCU9603R1ZM',
  })
  @IsString()
  @IsOptional()
  gstin?: string;

  @ApiPropertyOptional({
    description: 'PAN',
    example: 'AABCU9603R',
  })
  @IsString()
  @IsOptional()
  pan?: string;

  // ==================== Super Admin Details ====================

  @ApiProperty({
    description: 'Super admin email address',
    example: 'admin@solarindia.com',
  })
  @IsEmail()
  @IsNotEmpty()
  superAdminEmail!: string;

  @ApiProperty({
    description: 'Super admin first name',
    example: 'Rajesh',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  superAdminFirstName!: string;

  @ApiProperty({
    description: 'Super admin last name',
    example: 'Kumar',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  superAdminLastName!: string;

  @ApiPropertyOptional({
    description: 'Super admin phone number',
    example: '+919876543210',
  })
  @IsPhoneNumber()
  @IsOptional()
  superAdminPhone?: string;
}

/**
 * DTO for updating organization
 */
export class UpdateOrganizationDto {
  @ApiPropertyOptional({
    description: 'Organization name',
    example: 'Solar Power India Pvt Ltd',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description: 'Organization email',
    example: 'contact@solarindia.com',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Organization phone number',
    example: '+919876543210',
  })
  @IsPhoneNumber()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Organization address',
    example: '123 Green Energy Street',
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    description: 'City',
    example: 'Mumbai',
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({
    description: 'State',
    example: 'Maharashtra',
  })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({
    description: 'Pincode',
    example: '400001',
  })
  @IsString()
  @IsOptional()
  pincode?: string;

  @ApiPropertyOptional({
    description: 'GSTIN',
    example: '27AABCU9603R1ZM',
  })
  @IsString()
  @IsOptional()
  gstin?: string;

  @ApiPropertyOptional({
    description: 'PAN',
    example: 'AABCU9603R',
  })
  @IsString()
  @IsOptional()
  pan?: string;

  @ApiPropertyOptional({
    description: 'Organization status',
    enum: OrganizationStatus,
    example: OrganizationStatus.ACTIVE,
  })
  @IsEnum(OrganizationStatus)
  @IsOptional()
  status?: OrganizationStatus;

  @ApiPropertyOptional({
    description: 'Subscription plan',
    example: 'premium',
  })
  @IsString()
  @IsOptional()
  subscriptionPlan?: string;
}

/**
 * DTO for assigning super admin to organization
 */
export class AssignSuperAdminDto {
  @ApiProperty({
    description: 'Super admin email address',
    example: 'admin@solarindia.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: 'Super admin first name',
    example: 'Rajesh',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({
    description: 'Super admin last name',
    example: 'Kumar',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string;

  @ApiPropertyOptional({
    description: 'Super admin phone number',
    example: '+919876543210',
  })
  @IsPhoneNumber()
  @IsOptional()
  phone?: string;
}
