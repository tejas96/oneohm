import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Consumer accept quotation request body
 */
export class ConsumerAcceptQuotationDto {
  @ApiProperty({
    example: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
    description: 'Customer signature (required when accepting a quote)',
  })
  @IsString()
  @IsNotEmpty()
  customerSignature!: string;
}
