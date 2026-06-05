import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Consumer reject quotation request body
 */
export class ConsumerRejectQuotationDto {
  @ApiProperty({
    example: 'Need revised pricing before proceeding',
    description: 'Reason for rejecting the quote (required)',
  })
  @IsString()
  @IsNotEmpty()
  rejectionReason!: string;
}
