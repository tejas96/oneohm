import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '@tejas96/shared/types';
import { COMMISSION_STATE_LABEL, type CommissionState } from '@tejas96/shared/utils';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** Every displayed state; the label map is keyed by all of them. */
const COMMISSION_STATES = Object.keys(COMMISSION_STATE_LABEL) as CommissionState[];

export class CommissionListQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() resellerId?: string;
  @ApiPropertyOptional({ enum: COMMISSION_STATES })
  @IsOptional()
  @IsIn(COMMISSION_STATES)
  state?: CommissionState;
}

export class EditCommissionDto {
  @ApiPropertyOptional({ description: 'Rupees' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  baseAmount?: number;

  @ApiPropertyOptional({ description: 'Percent, e.g. 2.75' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  ratePercent?: number;

  @ApiProperty() @IsString() @MinLength(3) @MaxLength(500) reason!: string;
}

export class ReasonDto {
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(500) reason!: string;
}

export class RecordCommissionPaymentDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  commissionIds!: string[];

  @ApiProperty() @IsDateString() valueDate!: string;

  @ApiProperty({ enum: PaymentMethod })
  @IsIn(Object.values(PaymentMethod).filter((m) => m !== PaymentMethod.CREDIT))
  paymentMethod!: string;

  @ApiProperty() @IsString() @MinLength(3) @MaxLength(100) reference!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) invoiceNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() invoiceDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class CloseRecoveryDto {
  @ApiProperty({ description: 'Rupees received back; 0 writes it all off' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amountReceived!: number;

  @ApiProperty() @IsDateString() date!: string;
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(500) note!: string;
}

export class ResellerPeriodQueryDto {
  @ApiPropertyOptional({ enum: ['month', 'fy', 'all'] })
  @IsOptional()
  @IsIn(['month', 'fy', 'all'])
  period?: 'month' | 'fy' | 'all';
}

export class DismissMissingDto {
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(300) note!: string;
}
