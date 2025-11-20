import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IntegrationProvider, IntegrationCategory } from '@oneohm-epc/shared-types';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsObject,
  IsBoolean,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class CreateIntegrationDto {
  @ApiProperty({
    description: 'Human-readable name for this integration',
    example: 'WhatsApp Production',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    description: 'Integration provider',
    enum: IntegrationProvider,
    example: IntegrationProvider.WHATSAPP_BUSINESS,
  })
  @IsEnum(IntegrationProvider)
  @IsNotEmpty()
  provider!: IntegrationProvider;

  @ApiProperty({
    description: 'Integration category',
    enum: IntegrationCategory,
    example: IntegrationCategory.MESSAGING,
  })
  @IsEnum(IntegrationCategory)
  @IsNotEmpty()
  category!: IntegrationCategory;

  @ApiProperty({
    description: 'Authentication type',
    example: 'bearer_token',
    enum: ['bearer_token', 'api_key', 'oauth2', 'basic_auth', 'access_key'],
  })
  @IsString()
  @IsNotEmpty()
  authType!: string;

  @ApiProperty({
    description: 'Provider-specific credentials (will be encrypted)',
    example: {
      accessToken: 'your-access-token',
      phoneNumberId: '123456789',
      businessAccountId: '987654321',
    },
  })
  @IsObject()
  @IsNotEmpty()
  credentials!: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Additional provider configuration (non-sensitive)',
    example: {
      apiUrl: 'https://graph.facebook.com/v18.0',
      webhookVerifyToken: 'your-verify-token',
    },
  })
  @IsObject()
  @IsOptional()
  configuration?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Whether the integration is active',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

