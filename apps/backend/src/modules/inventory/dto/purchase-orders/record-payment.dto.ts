import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/**
 * Body for POST /purchase-orders/:id/record-payment
 * Records a payment against a PO. The service derives paymentStatus
 * (pending | partial | paid) from cumulative paid_amount vs total_amount.
 */
export class RecordPaymentDto {
  @ApiProperty({
    example: 50000.0,
    description: 'Payment amount in INR (must be > 0; cannot exceed remaining balance)',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  amount!: number;

  @ApiProperty({ example: 'UPI ref UTR123456', required: false, maxLength: 500 })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}
