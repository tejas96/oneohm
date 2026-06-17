import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IntegrationProvider, IntegrationStatus } from '@tejas96/shared/types';

/**
 * Message Response DTO
 */
export class MessageResponseDto {
  @ApiProperty({
    description: 'Message ID from the provider',
    example: 'wamid.HBgLOTE5ODc2NTQzMjEwFQIAERgSQzg5MkU1RTlGRDk5QjREOEMxAA==',
  })
  messageId!: string;

  @ApiProperty({
    description: 'Message delivery status',
    enum: IntegrationStatus,
    example: IntegrationStatus.SENT,
  })
  status!: IntegrationStatus;

  @ApiProperty({
    description: 'Integration provider used',
    enum: IntegrationProvider,
    example: IntegrationProvider.WHATSAPP_BUSINESS,
  })
  provider!: IntegrationProvider;

  @ApiProperty({
    description: 'Timestamp of the response',
    example: '2025-11-18T10:30:00.000Z',
  })
  timestamp!: Date;

  @ApiPropertyOptional({
    description: 'Additional metadata from the provider',
    example: {
      whatsappMessageId: 'wamid.HBgLOTE5ODc2NTQzMjEwFQIAERgSQzg5MkU1RTlGRDk5QjREOEMxAA==',
      contactId: '919876543210',
    },
  })
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Error details if the message failed',
    example: {
      code: 'INVALID_PARAMETER',
      message: 'Invalid phone number format',
      details: {},
    },
  })
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
