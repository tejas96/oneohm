import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationStatus } from '@oneohm-epc/shared/types';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
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
  @MinLength(2)
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
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'Code must contain only uppercase letters, numbers, hyphens, and underscores',
  })
  code!: string;

  @ApiPropertyOptional({
    description: 'Organization email',
    example: 'contact@solarindia.com',
  })
  @IsEmail()
  @IsOptional()
  @MaxLength(255)
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
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({
    description: 'State',
    example: 'Maharashtra',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({
    description: 'Country',
    example: 'India',
    default: 'India',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({
    description: 'Pincode',
    example: '400001',
  })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  pincode?: string;

  @ApiPropertyOptional({
    description: 'GSTIN',
    example: '27AABCU9603R1ZM',
  })
  @IsString()
  @IsOptional()
  @MaxLength(15)
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, {
    message: 'Invalid GSTIN format',
  })
  gstin?: string;

  @ApiPropertyOptional({
    description: 'PAN',
    example: 'AABCU9603R',
  })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, {
    message: 'Invalid PAN format',
  })
  pan?: string;

  // ==================== Configuration ====================

  @ApiPropertyOptional({
    description: 'Timezone',
    example: 'Asia/Kolkata',
    default: 'Asia/Kolkata',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'INR',
    default: 'INR',
  })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({
    description: 'Date format',
    example: 'DD-MM-YYYY',
    default: 'DD-MM-YYYY',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  dateFormat?: string;

  @ApiPropertyOptional({
    description: 'Default project timeline in weeks',
    example: 4,
    default: 4,
    minimum: 1,
    maximum: 52,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(52)
  defaultProjectTimelineWeeks?: number;

  @ApiPropertyOptional({
    description: 'Default quote validity in days',
    example: 30,
    default: 30,
    minimum: 1,
    maximum: 365,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  defaultQuoteValidityDays?: number;

  @ApiPropertyOptional({
    description: 'Maximum quote versions allowed',
    example: 3,
    default: 3,
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxQuoteVersions?: number;

  @ApiPropertyOptional({
    description: 'Subscription plan name',
    example: 'Enterprise',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  subscriptionPlan?: string;

  @ApiPropertyOptional({
    description: 'Subscription expiration date',
  })
  @IsOptional()
  subscriptionExpiresAt?: Date;

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

  @ApiPropertyOptional({
    description:
      'Initial password for super admin (optional). If not provided, super admin will set password via invitation link.',
    example: 'SecurePassword123!',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(50)
  // @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
  //   message:
  //     'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  // })
  superAdminPassword?: string;
}

/**
 * DTO for updating organization
 * All fields from CreateOrganizationDto except super admin details
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
    description: 'Timezone',
    example: 'Asia/Kolkata',
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'INR',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Date format',
    example: 'DD-MM-YYYY',
  })
  @IsOptional()
  @IsString()
  dateFormat?: string;

  @ApiPropertyOptional({
    description: 'Default project timeline in weeks',
    example: 4,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(52)
  defaultProjectTimelineWeeks?: number;

  @ApiPropertyOptional({
    description: 'Default quote validity in days',
    example: 30,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  defaultQuoteValidityDays?: number;

  @ApiPropertyOptional({
    description: 'Maximum quote versions allowed',
    example: 3,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxQuoteVersions?: number;

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

  @ApiPropertyOptional({
    description: 'Subscription expiration date',
  })
  @IsOptional()
  subscriptionExpiresAt?: Date;
}

/**
 * DTO for updating organization status
 */
export class UpdateOrganizationStatusDto {
  @ApiProperty({
    enum: Object.values(OrganizationStatus),
    enumName: 'OrganizationStatus',
    example: OrganizationStatus.ACTIVE,
    description: 'New status for the organization',
  })
  @IsEnum(OrganizationStatus)
  status!: OrganizationStatus;
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
