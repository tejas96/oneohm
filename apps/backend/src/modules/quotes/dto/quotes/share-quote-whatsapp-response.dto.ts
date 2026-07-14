import { ApiProperty } from '@nestjs/swagger';
import { IntegrationStatus, QuoteStatus } from '@tejas96/shared/types';

export class ShareQuoteWhatsappResponseDto {
  @ApiProperty({ description: 'Meta WhatsApp message ID (wamid)' })
  messageId!: string;

  @ApiProperty({ enum: IntegrationStatus })
  status!: IntegrationStatus;

  @ApiProperty({ description: 'Document record ID for the quote PDF' })
  documentId!: string;

  @ApiProperty({ enum: QuoteStatus, description: 'Quote status after the send attempt' })
  quoteStatus!: QuoteStatus;
}
