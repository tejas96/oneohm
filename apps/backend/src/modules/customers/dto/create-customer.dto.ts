import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerStatus } from '@oneohm-epc/shared/types';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

/**
 * DTO for creating a new customer profile
 * Note: Property/site details are now in CreateCustomerPropertyDto
 */
export class CreateCustomerDto {
  // ==================== Personal Info ====================
  @ApiProperty({ example: 'Rajesh', description: 'Customer first name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @ApiPropertyOptional({ example: 'Kumar', description: 'Customer middle name' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  middleName?: string;

  @ApiPropertyOptional({ example: 'Kumar', description: 'Customer last name' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({
    example: 'rajesh.kumar@example.com',
    description: 'Customer email address',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== '' && v !== null && v !== undefined)
  @IsEmail()
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

  // ==================== Address (Billing/Mailing) ====================
  @ApiPropertyOptional({
    example: '123, MG Road, Koramangala',
    description: 'Billing/mailing address',
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

  // ==================== Customer Group ====================
  @ApiPropertyOptional({
    example: 'GRP-0001',
    description: 'Group code to assign this customer to an existing group',
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  groupCode?: string;

  @ApiPropertyOptional({
    example: 'Sunshine Apartments',
    description: 'Group name. If provided without groupCode, a new group will be created.',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  groupName?: string;

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
