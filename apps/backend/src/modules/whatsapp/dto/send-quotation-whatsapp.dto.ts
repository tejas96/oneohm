import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, IsUrl, Matches } from 'class-validator';

export class SendQuotationWhatsAppDto {
  @ApiProperty({
    example: '919876543210',
    description: 'Customer phone number in international format without + prefix',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{10,15}$/, { message: 'Phone must be 10–15 digits without spaces or + prefix' })
  phone!: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID of the quotation',
  })
  @IsUUID()
  @IsNotEmpty()
  quotationId!: string;

  @ApiProperty({
    example: 'https://proud-feather-6833.fly.storage.tigris.dev/quote/abc.pdf',
    description: 'Publicly accessible PDF URL (generated and uploaded by the client)',
  })
  @IsUrl({ protocols: ['https'], require_tld: true }, { message: 'pdfUrl must be a valid HTTPS URL' })
  @IsNotEmpty()
  pdfUrl!: string;

  @ApiProperty({
    example: 'QT-ONEOHM-2025-0001',
    description: 'Quote number shown in the WhatsApp caption',
  })
  @IsString()
  @IsNotEmpty()
  quoteNumber!: string;

  @ApiProperty({
    example: 'Rajesh Sharma',
    description: 'Customer name for the WhatsApp caption',
  })
  @IsString()
  @IsNotEmpty()
  customerName!: string;

  @ApiProperty({
    example: '2025-02-15',
    description: 'Quote validity date string for the WhatsApp caption',
  })
  @IsString()
  @IsNotEmpty()
  validUntil!: string;
}
