import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentTransactionStatus } from '@tejas96/shared/types';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * FSM body for `PATCH /receipts/:id/status`. The service enforces valid
 * transitions (plan §3.2 — `pending → received → verified → cleared`,
 * `received → bounced`, `cleared → refunded`) and re-aggregates the
 * linked term in the same transaction.
 */
export class UpdateReceiptStatusDto {
  @ApiProperty({ enum: PaymentTransactionStatus })
  @IsEnum(PaymentTransactionStatus)
  status!: PaymentTransactionStatus;

  @ApiPropertyOptional({
    description: 'Optional reason / note appended to the receipt notes field.',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}
