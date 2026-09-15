import { ApiProperty } from '@nestjs/swagger';
import { VendorStatus, VendorType } from '@tejas96/shared/types';
import {
  GSTIN_FORMAT_MESSAGE,
  GSTIN_REGEX,
  IFSC_FORMAT_MESSAGE,
  IFSC_REGEX,
  PAN_FORMAT_MESSAGE,
  PAN_REGEX,
} from '@tejas96/shared/utils';
import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { upperCaseIdentifier, VENDOR_PHONE_CHARACTERS } from './vendor-field-rules';

/**
 * DTO for creating a vendor
 */
export class CreateVendorDto {
  // ==================== Basic Info ====================

  @ApiProperty({ example: 'Tata Power Solar', description: 'Vendor name' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({
    example: 'VEN-001',
    description: 'Unique vendor code. Generated as VEN-0001, VEN-0002, … when omitted.',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Length(1, 50)
  code?: string;

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
  @Matches(VENDOR_PHONE_CHARACTERS, {
    message: 'Phone must contain only numbers, spaces, and +()-',
  })
  phone?: string;

  @ApiProperty({ example: '+91-9876543211', required: false })
  @IsString()
  @IsOptional()
  @Length(10, 20)
  @Matches(VENDOR_PHONE_CHARACTERS, {
    message: 'Alternate phone must contain only numbers, spaces, and +()-',
  })
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
  @Matches(/^\d+$/, { message: 'PIN code must contain only digits' })
  pincode?: string;

  // ==================== Tax Details ====================

  @ApiProperty({ example: '27AAACT1234A1Z5', description: 'GST Number', required: false })
  @Transform(upperCaseIdentifier)
  @IsString()
  @IsOptional()
  @Length(15, 15)
  @Matches(GSTIN_REGEX, { message: GSTIN_FORMAT_MESSAGE })
  gstin?: string;

  @ApiProperty({ example: 'AAACT1234A', description: 'PAN Number', required: false })
  @Transform(upperCaseIdentifier)
  @IsString()
  @IsOptional()
  @Length(10, 10)
  @Matches(PAN_REGEX, { message: PAN_FORMAT_MESSAGE })
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
  @Transform(upperCaseIdentifier)
  @IsString()
  @IsOptional()
  @Length(11, 11)
  @Matches(IFSC_REGEX, { message: IFSC_FORMAT_MESSAGE })
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
