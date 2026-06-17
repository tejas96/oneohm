import { ApiProperty } from '@nestjs/swagger';
import { VendorStatus, VendorType } from '@tejas96/shared/types';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * DTO for creating a vendor
 */
export class CreateVendorDto {
  // ==================== Basic Info ====================

  @ApiProperty({ example: 'Tata Power Solar', description: 'Vendor name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ example: 'VEN-001', description: 'Unique vendor code' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  code!: string;

  // ==================== Vendor Type ====================

  @ApiProperty({
    enum: Object.values(VendorType),
    enumName: 'VendorType',
    example: VendorType.SUPPLIER,
    default: VendorType.SUPPLIER,
  })
  @IsEnum(VendorType)
  @IsOptional()
  vendorType?: VendorType;

  // ==================== Contact ====================

  @ApiProperty({ example: 'Amit Sharma', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  contactPerson?: string;

  @ApiProperty({ example: 'vendor@tata.com', required: false })
  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @ApiProperty({ example: '+91-9876543210', required: false })
  @IsString()
  @IsOptional()
  @Length(10, 20)
  phone?: string;

  @ApiProperty({ example: '+91-9876543211', required: false })
  @IsString()
  @IsOptional()
  @Length(10, 20)
  alternatePhone?: string;

  // ==================== Address ====================

  @ApiProperty({ example: 'Plot 123, MIDC Industrial Area', required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ example: 'Mumbai', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @ApiProperty({ example: 'Maharashtra', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  state?: string;

  @ApiProperty({ example: 'India', default: 'India', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  country?: string;

  @ApiProperty({ example: '400069', required: false })
  @IsString()
  @IsOptional()
  @Length(6, 10)
  pincode?: string;

  // ==================== Tax Details ====================

  @ApiProperty({ example: '27AAACT1234A1Z5', description: 'GST Number', required: false })
  @IsString()
  @IsOptional()
  @Length(15, 15)
  gstin?: string;

  @ApiProperty({ example: 'AAACT1234A', description: 'PAN Number', required: false })
  @IsString()
  @IsOptional()
  @Length(10, 10)
  pan?: string;

  // ==================== Payment Terms ====================

  @ApiProperty({ example: 'Net 30 days from invoice date', required: false })
  @IsString()
  @IsOptional()
  paymentTerms?: string;

  @ApiProperty({ example: 30, description: 'Credit days', required: false })
  @IsInt()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  creditDays?: number;

  // ==================== Bank Details ====================

  @ApiProperty({ example: 'HDFC Bank', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  bankName?: string;

  @ApiProperty({ example: '50100123456789', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  accountNumber?: string;

  @ApiProperty({ example: 'HDFC0001234', required: false })
  @IsString()
  @IsOptional()
  @Length(11, 11)
  ifscCode?: string;

  // ==================== Status ====================

  @ApiProperty({
    enum: Object.values(VendorStatus),
    enumName: 'VendorStatus',
    example: VendorStatus.ACTIVE,
    default: VendorStatus.ACTIVE,
  })
  @IsEnum(VendorStatus)
  @IsOptional()
  status?: VendorStatus;

  // ==================== Rating ====================

  @ApiProperty({ example: 4.5, description: 'Vendor rating (0-5)', required: false })
  @IsNumber({ maxDecimalPlaces: 1 })
  @IsOptional()
  @Min(0)
  @Max(5)
  @Type(() => Number)
  rating?: number;

  // ==================== Notes ====================

  @ApiProperty({ example: 'Reliable supplier for solar panels', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
