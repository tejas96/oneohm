import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerStatus } from '@tejas96/shared/types';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

// A pasted name can carry a tab or a run of spaces, and WhatsApp templates
// refuse both. Store names with single spaces only.
export const cleanName = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : value;

/**
 * DTO for creating a new customer profile
 * Note: Property/site details are now in CreateCustomerPropertyDto
 */
export class CreateCustomerDto {
  // ==================== Personal Info ====================
  @ApiProperty({ example: 'Rajesh', description: 'Customer first name' })
  @IsString()
  @IsNotEmpty()
  @Transform(cleanName)
  @MaxLength(100)
  firstName!: string;

  @ApiPropertyOptional({ example: 'Kumar', description: 'Customer middle name' })
  @IsString()
  @IsOptional()
  @Transform(cleanName)
  @MaxLength(100)
  middleName?: string;

  @ApiPropertyOptional({ example: 'Kumar', description: 'Customer last name' })
  @IsString()
  @IsOptional()
  @Transform(cleanName)
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

  @ApiProperty({ example: '+919876543210', description: 'Primary phone number' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+91[6-9]\d{9}$/, {
    message: 'Phone must be a valid Indian mobile number in +91XXXXXXXXXX format',
  })
  @MaxLength(13)
  phone!: string;

  @ApiPropertyOptional({
    example: '+919876543211',
    description: 'Alternate phone number',
  })
  @IsString()
  @IsOptional()
  @Matches(/^\+91[6-9]\d{9}$/, {
    message: 'Alternate phone must be a valid Indian mobile number in +91XXXXXXXXXX format',
  })
  @MaxLength(13)
  alternatePhone?: string;

  @ApiPropertyOptional({ example: '123412341234', description: 'Aadhaar number, 12 digits' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{12}$/, { message: 'Aadhaar number must be exactly 12 digits' })
  aadhaarNumber?: string;

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

  // ==================== Reseller Attribution ====================
  @ApiPropertyOptional({
    description: 'The reseller (employee_profiles.id) who brought in this customer',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((o: CreateCustomerDto) => o.resellerId !== null)
  @IsUUID()
  resellerId?: string | null;

  @ApiPropertyOptional({
    description: 'Reason for changing the reseller attributed to this customer',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  resellerChangeReason?: string;
}
