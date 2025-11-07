import { ApiPropertyOptional } from '@nestjs/swagger';

import { IsDecimal, IsEmail, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

/**
 * DTO for updating reseller information
 * All fields are optional for partial updates
 */
export class UpdateResellerDto {
  // ==================== Company Details ====================
  @ApiPropertyOptional({
    example: 'SolarTech Partners',
    description: 'Company/firm name',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  companyName?: string;

  // Note: company_code should not be updatable after creation
  // Removed from update DTO

  // ==================== Contact Person ====================
  @ApiPropertyOptional({
    example: 'Amit Sharma',
    description: 'Primary contact person name',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  contactPersonName?: string;

  @ApiPropertyOptional({
    example: 'amit@solartech.com',
    description: 'Primary email address',
  })
  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({
    example: '+91-9876543210',
    description: 'Primary phone number',
  })
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

  // ==================== Address ====================
  @ApiPropertyOptional({
    example: '456, Solar Avenue, Green Park',
    description: 'Complete address',
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 'Mumbai', description: 'City' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'Maharashtra', description: 'State' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ example: 'India', description: 'Country' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ example: '400001', description: 'PIN code' })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  pincode?: string;

  // ==================== Business Details ====================
  @ApiPropertyOptional({
    example: '29ABCDE1234F1Z5',
    description: 'GST identification number',
  })
  @IsString()
  @IsOptional()
  @MaxLength(15)
  gstin?: string;

  @ApiPropertyOptional({
    example: 'ABCDE1234F',
    description: 'PAN card number',
  })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  pan?: string;

  // ==================== Commission Structure ====================
  @ApiPropertyOptional({
    example: 4.0,
    description: 'Default commission percentage',
  })
  @IsDecimal({ decimal_digits: '2' })
  @IsOptional()
  @Min(0)
  commissionPercentage?: number;

  @ApiPropertyOptional({
    example: 2.0,
    description: 'Minimum commission percentage',
  })
  @IsDecimal({ decimal_digits: '2' })
  @IsOptional()
  @Min(0)
  commissionMinPercentage?: number;

  @ApiPropertyOptional({
    example: 10.0,
    description: 'Maximum commission percentage',
  })
  @IsDecimal({ decimal_digits: '2' })
  @IsOptional()
  @Min(0)
  commissionMaxPercentage?: number;

  // ==================== Bank Details ====================
  @ApiPropertyOptional({
    example: 'HDFC Bank',
    description: 'Bank name',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  bankName?: string;

  @ApiPropertyOptional({
    example: '12345678901234',
    description: 'Bank account number',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  accountNumber?: string;

  @ApiPropertyOptional({
    example: 'HDFC0001234',
    description: 'IFSC code',
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  ifscCode?: string;

  @ApiPropertyOptional({
    example: 'SolarTech Partners',
    description: 'Name as per bank account',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  accountHolderName?: string;
}
