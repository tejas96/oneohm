import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { OrganizationStatus } from '@oneohm-epc/shared-types';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * DTO for creating a new organization
 */
export class CreateOrganizationDto {
  @ApiProperty({ description: 'Organization name', example: 'OneOhm Energy Solutions' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Unique organization code', example: 'ONEOHM' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'Code must contain only uppercase letters, numbers, hyphens, and underscores',
  })
  code: string;

  @ApiPropertyOptional({ description: 'Organization email', example: 'contact@oneohm.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ description: 'Organization phone', example: '+919876543210' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ description: 'Organization address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'City', example: 'Mumbai' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'State', example: 'Maharashtra' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ description: 'Country', example: 'India', default: 'India' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ description: 'Pincode', example: '400001' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  pincode?: string;

  @ApiPropertyOptional({ description: 'GSTIN', example: '27AABCU9603R1ZM' })
  @IsOptional()
  @IsString()
  @MaxLength(15)
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, {
    message: 'Invalid GSTIN format',
  })
  gstin?: string;

  @ApiPropertyOptional({ description: 'PAN', example: 'AABCU9603R' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, {
    message: 'Invalid PAN format',
  })
  pan?: string;

  @ApiPropertyOptional({
    description: 'Timezone',
    example: 'Asia/Kolkata',
    default: 'Asia/Kolkata',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({ description: 'Currency code', example: 'INR', default: 'INR' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ description: 'Date format', example: 'DD-MM-YYYY', default: 'DD-MM-YYYY' })
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
    description: 'Organization status',
    enum: Object.values(OrganizationStatus),
    enumName: 'OrganizationStatus',
    default: OrganizationStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(OrganizationStatus)
  status?: OrganizationStatus;

  @ApiPropertyOptional({ description: 'Subscription plan name', example: 'Enterprise' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  subscriptionPlan?: string;

  @ApiPropertyOptional({ description: 'Subscription expiration date' })
  @IsOptional()
  subscriptionExpiresAt?: Date;
}
