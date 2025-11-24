// ============================================
// IMPORTS
// ============================================
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/**
 * DTO for reconciling a payment
 */
export class ReconcilePaymentDto {
  @ApiPropertyOptional({
    description: 'Notes about the reconciliation',
    example: 'Payment verified and matched with bank statement',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
