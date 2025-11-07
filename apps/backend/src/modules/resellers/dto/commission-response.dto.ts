import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { CommissionStatus } from '@oneohm-epc/shared-types';
import { Exclude, Expose } from 'class-transformer';

/**
 * DTO for commission response
 * Used in API responses to control what data is exposed
 */
@Exclude()
export class CommissionResponseDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  organizationId!: string;

  @ApiProperty()
  @Expose()
  resellerId!: string;

  @ApiPropertyOptional()
  @Expose()
  projectId?: string;

  // ==================== Commission Calculation ====================
  @ApiProperty()
  @Expose()
  projectValue!: number;

  @ApiProperty()
  @Expose()
  commissionPercentage!: number;

  @ApiProperty()
  @Expose()
  commissionAmount!: number;

  // ==================== Payment Status ====================
  @ApiProperty({ enum: CommissionStatus })
  @Expose()
  status!: CommissionStatus;

  // ==================== Approval ====================
  @ApiPropertyOptional()
  @Expose()
  approvedAt?: Date;

  @ApiPropertyOptional()
  @Expose()
  approvedBy?: string;

  // ==================== Payment Details ====================
  @ApiPropertyOptional()
  @Expose()
  paidAt?: Date;

  @ApiPropertyOptional()
  @Expose()
  paidBy?: string;

  @ApiPropertyOptional()
  @Expose()
  paymentMode?: string;

  @ApiPropertyOptional()
  @Expose()
  paymentReference?: string;

  // ==================== Invoice ====================
  @ApiPropertyOptional()
  @Expose()
  invoiceNumber?: string;

  @ApiPropertyOptional()
  @Expose()
  invoiceDate?: Date;

  @ApiPropertyOptional()
  @Expose()
  invoiceFilePath?: string;

  // ==================== Notes ====================
  @ApiPropertyOptional()
  @Expose()
  notes?: string;

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
