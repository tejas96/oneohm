import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuoteStatus } from '@oneohm-epc/shared/types';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
}
