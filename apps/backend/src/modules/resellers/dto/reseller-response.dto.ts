import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ResellerStatus } from '@oneohm-epc/shared-types';
import { Exclude, Expose } from 'class-transformer';

/**
 * DTO for reseller response
 * Used in API responses to control what data is exposed
 */
@Exclude()
export class ResellerResponseDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  organizationId!: string;

  // ==================== Company Details ====================
  @ApiProperty()
  @Expose()
  companyName!: string;

  @ApiProperty()
  @Expose()
  companyCode!: string;

  // ==================== Contact Person ====================
  @ApiProperty()
  @Expose()
  contactPersonName!: string;

  @ApiProperty()
  @Expose()
  email!: string;

  @ApiProperty()
  @Expose()
  phone!: string;

  @ApiPropertyOptional()
  @Expose()
  alternatePhone?: string;

  // ==================== Address ====================
  @ApiPropertyOptional()
  @Expose()
  address?: string;

  @ApiPropertyOptional()
  @Expose()
  city?: string;

  @ApiPropertyOptional()
  @Expose()
  state?: string;

  @ApiPropertyOptional()
  @Expose()
  country?: string;

  @ApiPropertyOptional()
  @Expose()
  pincode?: string;

  // ==================== Business Details ====================
  @ApiPropertyOptional()
  @Expose()
  gstin?: string;

  @ApiPropertyOptional()
  @Expose()
  pan?: string;

  // ==================== Commission Structure ====================
  @ApiProperty()
  @Expose()
  commissionPercentage!: number;

  @ApiProperty()
  @Expose()
  commissionMinPercentage!: number;

  @ApiProperty()
  @Expose()
  commissionMaxPercentage!: number;

  // ==================== Bank Details ====================
  @ApiPropertyOptional()
  @Expose()
  bankName?: string;

  @ApiPropertyOptional()
  @Expose()
  accountNumber?: string;

  @ApiPropertyOptional()
  @Expose()
  ifscCode?: string;

  @ApiPropertyOptional()
  @Expose()
  accountHolderName?: string;

  // ==================== Performance Tracking ====================
  @ApiProperty()
  @Expose()
  totalLeadsGenerated!: number;

  @ApiProperty()
  @Expose()
  totalProjectsConverted!: number;

  @ApiProperty()
  @Expose()
  totalRevenueGenerated!: number;

  @ApiProperty()
  @Expose()
  totalCommissionEarned!: number;

  // ==================== Status ====================
  @ApiProperty({ enum: ResellerStatus })
  @Expose()
  status!: ResellerStatus;

  // ==================== Audit Fields ====================
  @ApiProperty()
  @Expose()
  createdAt!: Date;

  @ApiProperty()
  @Expose()
  updatedAt!: Date;

  @ApiPropertyOptional()
  @Expose()
  createdBy?: string;

  @ApiPropertyOptional()
  @Expose()
  updatedBy?: string;
}
