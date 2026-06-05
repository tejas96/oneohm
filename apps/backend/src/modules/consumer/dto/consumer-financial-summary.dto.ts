import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';

import { toNum } from '../../../common/utils';

export class ConsumerFinancialSummaryResponseDto {
  @ApiProperty()
  @Expose()
  @Transform(({ value }) => toNum(value))
  totalExpected!: number;

  @ApiProperty()
  @Expose()
  @Transform(({ value }) => toNum(value))
  totalReceived!: number;

  @ApiProperty()
  @Expose()
  @Transform(({ value }) => toNum(value))
  pending!: number;

  @ApiProperty()
  @Expose()
  receiptCount!: number;

  @ApiProperty()
  @Expose()
  @Transform(({ value }) => toNum(value))
  contractValue!: number;

  @ApiProperty()
  @Expose()
  @Transform(({ value }) => toNum(value))
  subsidyAmount!: number;

  @ApiProperty()
  @Expose()
  @Transform(({ value }) => toNum(value))
  netCost!: number;

  @ApiPropertyOptional()
  @Expose()
  startDate?: string | null;

  @ApiPropertyOptional()
  @Expose()
  endDate?: string | null;
}
