import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType } from '@tejas96/shared/types';
import {
  IsString,
  IsNotEmpty,
  IsPhoneNumber,
  IsOptional,
  IsEnum,
  IsObject,
  IsNumber,
  IsUrl,
  ValidateIf,
  Min,
  Max,
  Length,
} from 'class-validator';

/**
 * Unified Send Message DTO
 * Handles all message types with conditional validation
 */
export class SendMessageDto {
  @ApiProperty({
    description: 'Message type',
    enum: MessageType,
    example: MessageType.TEXT,
  })
  @IsEnum(MessageType)
  @IsNotEmpty()
  type!: MessageType;

  @ApiProperty({
    description: 'Recipient phone number in E.164 format',
    example: '+919876543210',
  })
  @IsPhoneNumber(undefined, {
    message: 'Phone number must be in valid E.164 format (e.g., +919876543210)',
  })
  @IsNotEmpty()
  to!: string;

  // ===== TEXT & ALERT =====
  @ApiPropertyOptional({
    description: 'Message body (required for text/alert messages)',
    example: 'Hello! This is a test message.',
  })
  @ValidateIf((o: SendMessageDto) => o.type === MessageType.TEXT || o.type === MessageType.ALERT)
  @IsString()
  @IsNotEmpty()
  body?: string;

  @ApiPropertyOptional({
    description: 'Alert title (optional for alert messages)',
    example: 'Important Update',
  })
  @ValidateIf((o: SendMessageDto) => o.type === MessageType.ALERT)
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description: 'Alert priority (for alert messages)',
    example: 'high',
    enum: ['low', 'medium', 'high', 'critical'],
  })
  @ValidateIf((o: SendMessageDto) => o.type === MessageType.ALERT)
  @IsString()
  @IsOptional()
  priority?: 'low' | 'medium' | 'high' | 'critical';

  // ===== OTP =====
  @ApiPropertyOptional({
    description: 'OTP code (required for OTP messages, 4-8 digits)',
    example: '123456',
  })
  @ValidateIf((o: SendMessageDto) => o.type === MessageType.OTP)
  @IsString()
  @IsNotEmpty()
  @Length(4, 8, { message: 'OTP must be between 4 and 8 characters' })
  otp?: string;

  @ApiPropertyOptional({
    description: 'OTP expiry time in minutes',
    example: 5,
    default: 10,
  })
  @ValidateIf((o: SendMessageDto) => o.type === MessageType.OTP)
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(60)
  expiryMinutes?: number;

  // ===== TEMPLATE =====
  @ApiPropertyOptional({
    description: 'Template name (required for template messages)',
    example: 'order_confirmation',
  })
  @ValidateIf((o: SendMessageDto) => o.type === MessageType.TEMPLATE)
  @IsString()
  @IsNotEmpty()
  templateName?: string;

  @ApiPropertyOptional({
    description: 'Template language code',
    example: 'en',
    default: 'en',
  })
  @ValidateIf((o: SendMessageDto) => o.type === MessageType.TEMPLATE)
  @IsString()
  @IsOptional()
  templateLanguage?: string;

  @ApiPropertyOptional({
    description: 'Template parameters',
    example: { body: ['John', 'Order #123'] },
  })
  @ValidateIf((o: SendMessageDto) => o.type === MessageType.TEMPLATE)
  @IsObject()
  @IsOptional()
  templateParameters?: Record<string, unknown>;

  // ===== MEDIA =====
  @ApiPropertyOptional({
    description: 'Media URL (for media messages)',
    example: 'https://example.com/document.pdf',
  })
  @ValidateIf((o: SendMessageDto) =>
    [MessageType.IMAGE, MessageType.DOCUMENT, MessageType.VIDEO, MessageType.AUDIO].includes(
      o.type,
    ),
  )
  @IsUrl()
  @IsOptional()
  mediaUrl?: string;

  @ApiPropertyOptional({
    description: 'Media ID (alternative to URL)',
    example: 'media_abc123',
  })
  @ValidateIf((o: SendMessageDto) =>
    [MessageType.IMAGE, MessageType.DOCUMENT, MessageType.VIDEO, MessageType.AUDIO].includes(
      o.type,
    ),
  )
  @IsString()
  @IsOptional()
  mediaId?: string;

  @ApiPropertyOptional({
    description: 'Media caption',
    example: 'Check out this document',
  })
  @ValidateIf((o: SendMessageDto) =>
    [MessageType.IMAGE, MessageType.DOCUMENT, MessageType.VIDEO].includes(o.type),
  )
  @IsString()
  @IsOptional()
  caption?: string;

  @ApiPropertyOptional({
    description: 'Filename (for document messages)',
    example: 'invoice_2025.pdf',
  })
  @ValidateIf((o: SendMessageDto) => o.type === MessageType.DOCUMENT)
  @IsString()
  @IsOptional()
  filename?: string;

  // ===== COMMON =====
  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { source: 'api', campaignId: '123' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
