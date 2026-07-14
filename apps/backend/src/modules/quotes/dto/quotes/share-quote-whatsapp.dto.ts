import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsPhoneNumber, IsUUID } from 'class-validator';

export class ShareQuoteWhatsappDto {
  @ApiPropertyOptional({
    description: 'Document record ID for an existing quote PDF (resend without re-upload).',
  })
  @IsUUID()
  @IsOptional()
  documentId?: string;

  @ApiPropertyOptional({
    description:
      'Override recipient phone number in E.164 format. Defaults to quote customer phone.',
    example: '+919876543210',
  })
  @IsPhoneNumber(undefined, {
    message: 'Phone number must be in valid E.164 format (e.g., +919876543210)',
  })
  @IsOptional()
  to?: string;
}
