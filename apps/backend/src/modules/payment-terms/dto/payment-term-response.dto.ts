import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentTermSource, PaymentTermStatus } from '@tejas96/shared/types';
import { Expose, Transform, Type } from 'class-transformer';

import { toNum } from '../../../common/utils';

/**
 * Response DTO for a single payment term.
 */
export class PaymentTermResponseDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  organizationId!: string;

  @ApiProperty()
  @Expose()
  projectId!: string;

  @ApiPropertyOptional()
  @Expose()
  sourceQuoteVersionId?: string | null;

  @ApiProperty({ enum: PaymentTermSource })
  @Expose()
  source!: PaymentTermSource;

  @ApiProperty()
  @Expose()
  stage!: string;

  @ApiProperty()
  @Expose()
  name!: string;

  @ApiPropertyOptional()
  @Expose()
  description?: string | null;

  @ApiProperty()
  @Expose()
  displayOrder!: number;

  @ApiProperty()
  @Expose()
  @Transform(({ value }) => toNum(value))
  expectedAmount!: number;

  @ApiPropertyOptional()
  @Expose()
  @Transform(({ value }) => (value === null || value === undefined ? null : toNum(value)))
  expectedPercentage?: number | null;

  @ApiProperty()
  @Expose()
  currency!: string;

  @ApiPropertyOptional({ description: 'ISO date (YYYY-MM-DD)' })
  @Expose()
  dueDate?: string | null;

  @ApiProperty({ enum: PaymentTermStatus })
  @Expose()
  status!: PaymentTermStatus;

  @ApiProperty()
  @Expose()
  @Transform(({ value }) => toNum(value))
  paidAmount!: number;

  @ApiPropertyOptional({ type: Date })
  @Expose()
  @Type(() => Date)
  completedAt?: Date | null;

  @ApiPropertyOptional()
  @Expose()
  waivedReason?: string | null;

  @ApiPropertyOptional()
  @Expose()
  notes?: string | null;

  @ApiProperty()
  @Expose()
  version!: number;

  @ApiProperty({ type: Date })
  @Expose()
  @Type(() => Date)
  createdAt!: Date;

  @ApiProperty({ type: Date })
  @Expose()
  @Type(() => Date)
  updatedAt!: Date;

  @ApiPropertyOptional({ type: Date })
  @Expose()
  @Type(() => Date)
  deletedAt?: Date | null;

  @ApiPropertyOptional()
  @Expose()
  createdBy?: string | null;

  @ApiPropertyOptional()
  @Expose()
  updatedBy?: string | null;
}
