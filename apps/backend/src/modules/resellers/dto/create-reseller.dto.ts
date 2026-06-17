import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ResellerStatus } from '@tejas96/shared/types';
import {
  IsDecimal,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * DTO for creating a new reseller
 */
export class CreateResellerDto {
  // ==================== Company Details ====================
  @ApiProperty({
    example: 'SolarTech Partners',
    description: 'Company/firm name',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  companyName!: string;

  @ApiProperty({
    example: 'RESELLER-2024-001',
    description: 'Unique company code',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  companyCode!: string;

  // ==================== Contact Person ====================
  @ApiProperty({
    example: 'Amit Sharma',
    description: 'Primary contact person name',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  contactPersonName!: string;

  @ApiProperty({
    example: 'amit@solartech.com',
    description: 'Primary email address',
  })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email!: string;

  @ApiProperty({
    example: '+91-9876543210',
    description: 'Primary phone number',
  })
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

  // ==================== Status ====================
  @ApiPropertyOptional({
    enum: Object.values(ResellerStatus),
    enumName: 'ResellerStatus',
    example: ResellerStatus.ACTIVE,
    description: 'Reseller status',
  })
  @IsEnum(ResellerStatus)
  @IsOptional()
  status?: ResellerStatus;
}
