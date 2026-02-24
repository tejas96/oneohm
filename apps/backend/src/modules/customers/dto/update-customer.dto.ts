import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

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

  @ApiPropertyOptional({ example: '+91-9876543210', description: 'Primary phone number' })
  @IsString()
  @IsOptional()
  @Matches(/^[\d\s\-+()]+$/, {
    message: 'Phone must contain only digits, spaces, and +-() characters',
  })
  @MaxLength(20)
  phone?: string;

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

}
