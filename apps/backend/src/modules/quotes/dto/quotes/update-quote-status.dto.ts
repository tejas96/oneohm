import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LossReason, QuoteStatus } from '@tejas96/shared/types';
import { IsEnum, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * DTO for updating quote status
 */

export class UpdateQuoteStatusDto {
  @ApiProperty({
    enum: Object.values(QuoteStatus),
    enumName: 'QuoteStatus',
    example: QuoteStatus.SENT,
    description: 'New status for the quote',
  })
  @IsEnum(QuoteStatus)
  @IsNotEmpty()
  status!: QuoteStatus;

  @ApiPropertyOptional({
    example: 'Customer asked for more time to review',
    description: 'Reason for rejection (required if status is rejected)',
  })
  @IsString()
  @IsOptional()
  rejectionReason?: string;

  @ApiPropertyOptional({
    example: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
    description: 'Customer signature (required if status is accepted)',
  })
  @IsString()
  @IsOptional()
  customerSignature?: string;

  @ApiPropertyOptional({
    enum: ['requote', 'close'],
    description:
      'What happens to the site. "requote" keeps it in the pipeline; "close" ' +
      'marks it lost. Required when status is rejected.',
  })
  @IsOptional()
  @IsIn(['requote', 'close'])
  rejectionOutcome?: 'requote' | 'close';

  @ApiPropertyOptional({ enum: LossReason })
  @IsOptional()
  @IsEnum(LossReason)
  lossReason?: LossReason;
}
