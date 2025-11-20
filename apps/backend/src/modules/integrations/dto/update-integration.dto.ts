import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsObject,
  IsBoolean,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class UpdateIntegrationDto {
  @ApiPropertyOptional({
    description: 'Human-readable name for this integration',
    example: 'WhatsApp Production',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Authentication type',
    example: 'bearer_token',
    enum: ['bearer_token', 'api_key', 'oauth2', 'basic_auth', 'access_key'],
  })
  @IsString()
  @IsOptional()
  authType?: string;

  @ApiPropertyOptional({
    description: 'Provider-specific credentials (will be encrypted)',
    example: {
      accessToken: 'your-new-access-token',
      phoneNumberId: '123456789',
    },
  })
  @IsObject()
  @IsOptional()
  credentials?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Additional provider configuration (non-sensitive)',
    example: {
      apiUrl: 'https://graph.facebook.com/v18.0',
    },
  })
  @IsObject()
  @IsOptional()
  configuration?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Whether the integration is active',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

