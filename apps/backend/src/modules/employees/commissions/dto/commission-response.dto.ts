import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommissionStatus } from '@tejas96/shared/types';
import { Exclude, Expose, Transform } from 'class-transformer';

import { toNum } from '../../../../common/utils';

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
  employeeId!: string;

  @ApiPropertyOptional()
  @Expose()
  projectId?: string;

  // ==================== Commission Calculation ====================
  @ApiProperty()
  @Expose()
  @Transform(({ value }) => toNum(value))
  projectValue!: number;

  @ApiProperty()
  @Expose()
  @Transform(({ value }) => toNum(value))
  commissionPercentage!: number;

  @ApiProperty()
  @Expose()
  @Transform(({ value }) => toNum(value))
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
