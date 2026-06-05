import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsPhoneNumber, IsString, IsUUID, IsUrl, MaxLength } from 'class-validator';

export class ShareQuoteWhatsappDto {
  @ApiPropertyOptional({
    description: 'Document record ID for the quote PDF. Defaults to the latest PDF on the quote.',
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

  @ApiPropertyOptional({
    description: 'Override PDF URL. Must be a public HTTPS URL that Meta can fetch.',
  })
  @IsUrl({ require_protocol: true })
  @IsOptional()
  documentUrl?: string;

  @ApiPropertyOptional({
    description: 'Filename shown in WhatsApp.',
    example: 'QT-ONEOHM-2026-001.pdf',
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  filename?: string;

  @ApiPropertyOptional({
    description: 'Short caption sent with the PDF.',
    example: 'Your OneOhm solar quotation is attached.',
  })
  @IsString()
  @MaxLength(1024)
  @IsOptional()
  caption?: string;
}
