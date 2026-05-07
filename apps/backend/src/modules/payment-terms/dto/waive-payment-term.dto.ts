import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * Mark a payment term as waived. Reason is mandatory for audit.
 */
export class WaivePaymentTermDto {
  @ApiProperty({ description: 'Reason for waiver (audit trail)', maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
