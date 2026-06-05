import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentTermStatus } from '@oneohm-epc/shared/types';
import { Expose, Transform, Type } from 'class-transformer';

import { toNum } from '../../../common/utils';

export class ConsumerPaymentTermDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  name!: string;

  @ApiProperty()
  @Expose()
  displayOrder!: number;

  @ApiProperty()
  @Expose()
  @Transform(({ value }) => toNum(value))
  expectedAmount!: number;

  @ApiProperty()
  @Expose()
  @Transform(({ value }) => toNum(value))
  paidAmount!: number;

  @ApiProperty({ enum: PaymentTermStatus })
  @Expose()
  status!: PaymentTermStatus;

  @ApiPropertyOptional({ description: 'ISO date (YYYY-MM-DD)' })
  @Expose()
  dueDate?: string | null;

  @ApiPropertyOptional()
  @Expose()
  @Transform(({ value }) => (value === null || value === undefined ? null : toNum(value)))
  expectedPercentage?: number | null;

  @ApiPropertyOptional({ type: [Object] }) // decorated with DTO schema type below
  @Expose()
  @Type(() => ConsumerPaymentDto)
  payments?: ConsumerPaymentDto[];
}

export class ConsumerPaymentDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  paymentNumber!: string;

  @ApiProperty()
  @Expose()
  @Transform(({ value }) => toNum(value))
  paidAmount!: number;

  @ApiProperty()
  @Expose()
  paymentMethod!: string;

  @ApiProperty()
  @Expose()
  status!: string;

  @ApiProperty()
  @Expose()
  createdAt!: string;
}

export class ConsumerProjectPaymentsResponseDto {
  @ApiProperty({ type: [ConsumerPaymentTermDto] })
  @Expose()
  @Type(() => ConsumerPaymentTermDto)
  terms!: ConsumerPaymentTermDto[];
}
