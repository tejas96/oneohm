import { ApiProperty } from '@nestjs/swagger';
import { VendorStatus, VendorType } from '@oneohm-epc/shared-types';
import { Expose, Type } from 'class-transformer';

/**
 * Vendor Response DTO
 * Represents vendor data returned from API
 */
export class VendorResponseDto {
  // ==================== IDs ====================

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  organizationId!: string;

  // ==================== Basic Info ====================

  @ApiProperty({ example: 'Tata Power Solar' })
  @Expose()
  name!: string;

  @ApiProperty({ example: 'VEN-001' })
  @Expose()
  code!: string;

  // ==================== Vendor Type ====================

  @ApiProperty({
    enum: Object.values(VendorType),
    enumName: 'VendorType',
    example: VendorType.SUPPLIER,
  })
  @Expose()
  vendorType!: VendorType;

  // ==================== Contact ====================

  @ApiProperty({ example: 'Amit Sharma', required: false })
  @Expose()
  contactPerson?: string;

  @ApiProperty({ example: 'vendor@tata.com', required: false })
  @Expose()
  email?: string;

  @ApiProperty({ example: '+91-9876543210', required: false })
  @Expose()
  phone?: string;

  @ApiProperty({ example: '+91-9876543211', required: false })
  @Expose()
  alternatePhone?: string;

  // ==================== Address ====================

  @ApiProperty({ example: 'Plot 123, MIDC Industrial Area', required: false })
  @Expose()
  address?: string;

  @ApiProperty({ example: 'Mumbai', required: false })
  @Expose()
  city?: string;

  @ApiProperty({ example: 'Maharashtra', required: false })
  @Expose()
  state?: string;

  @ApiProperty({ example: 'India' })
  @Expose()
  country!: string;

  @ApiProperty({ example: '400069', required: false })
  @Expose()
  pincode?: string;

  // ==================== Tax Details ====================

  @ApiProperty({ example: '27AAACT1234A1Z5', required: false })
  @Expose()
  gstin?: string;

  @ApiProperty({ example: 'AAACT1234A', required: false })
  @Expose()
  pan?: string;

  // ==================== Payment Terms ====================

  @ApiProperty({ example: 'Net 30 days from invoice date', required: false })
  @Expose()
  paymentTerms?: string;

  @ApiProperty({ example: 30, required: false })
  @Expose()
  creditDays?: number;

  // ==================== Bank Details ====================

  @ApiProperty({ example: 'HDFC Bank', required: false })
  @Expose()
  bankName?: string;

  @ApiProperty({ example: '50100123456789', required: false })
  @Expose()
  accountNumber?: string;

  @ApiProperty({ example: 'HDFC0001234', required: false })
  @Expose()
  ifscCode?: string;

  // ==================== Status ====================

  @ApiProperty({
    enum: Object.values(VendorStatus),
    enumName: 'VendorStatus',
    example: VendorStatus.ACTIVE,
  })
  @Expose()
  status!: VendorStatus;

  // ==================== Rating ====================

  @ApiProperty({ example: 4.5, required: false })
  @Expose()
  rating?: number;

  // ==================== Notes ====================

  @ApiProperty({ example: 'Reliable supplier for solar panels', required: false })
  @Expose()
  notes?: string;

  // ==================== Audit ====================

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  @Expose()
  @Type(() => Date)
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  @Expose()
  @Type(() => Date)
  updatedAt!: Date;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', required: false })
  @Expose()
  createdBy?: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', required: false })
  @Expose()
  updatedBy?: string;
}
