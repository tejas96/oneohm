import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';

/**
 * DTO for updating customer profile information
 * All fields are optional for partial updates
 * Note: Property/site details are now in UpdateCustomerPropertyDto
 */
export class UpdateCustomerDto {
  // ==================== Personal Info ====================
  @ApiPropertyOptional({ example: 'Rajesh', description: 'Customer first name' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  firstName?: string;

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
    description: 'Customer email address. Send null to explicitly clear.',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '' && v !== undefined)
  @IsEmail()
  @MaxLength(255)
  email?: string | null;

  @ApiPropertyOptional({ example: '+919876543210', description: 'Primary phone number' })
  @IsString()
  @IsOptional()
  @Matches(/^\+91[6-9]\d{9}$/, {
    message: 'Phone must be a valid Indian mobile number in +91XXXXXXXXXX format',
  })
  @MaxLength(13)
  phone?: string;

  @ApiPropertyOptional({
    example: '+919876543211',
    description: 'Alternate phone number. Send null to explicitly clear.',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @Matches(/^\+91[6-9]\d{9}$/, {
    message: 'Alternate phone must be a valid Indian mobile number in +91XXXXXXXXXX format',
  })
  @MaxLength(13)
  alternatePhone?: string | null;

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
    description:
      'Group code to assign this customer to an existing group. Send null to remove from group.',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(20)
  groupCode?: string | null;

  @ApiPropertyOptional({
    example: 'Sunshine Apartments',
    description:
      'Group name. If provided without groupCode, a new group will be created. Send null to remove from group.',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(100)
  groupName?: string | null;
}
