import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IntegrationProvider, IntegrationCategory } from '@tejas96/shared/types';

export class IntegrationResponseDto {
  @ApiProperty({
    description: 'Integration ID',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  id!: string;

  @ApiProperty({
    description: 'Organization ID',
    example: 'b1ffcd99-8d1c-5fg9-cc7e-7cc0ce491b22',
  })

  @ApiProperty({
    description: 'Integration name',
    example: 'WhatsApp Production',
  })
  name!: string;

  @ApiProperty({
    description: 'Provider',
    enum: IntegrationProvider,
    example: IntegrationProvider.WHATSAPP_BUSINESS,
  })
  provider!: IntegrationProvider;

  @ApiProperty({
    description: 'Category',
    enum: IntegrationCategory,
    example: IntegrationCategory.MESSAGING,
  })
  category!: IntegrationCategory;

  @ApiProperty({
    description: 'Authentication type',
    example: 'bearer_token',
  })
  authType!: string;

  @ApiPropertyOptional({
    description: 'Non-sensitive configuration',
    example: {
      apiUrl: 'https://graph.facebook.com/v18.0',
    },
  })
  configuration?: Record<string, any>;

  @ApiProperty({
    description: 'Whether the integration is active',
    example: true,
  })
  isActive!: boolean;

  @ApiPropertyOptional({
    description: 'Last validation timestamp',
    example: '2025-11-18T10:30:00Z',
  })
  lastValidatedAt?: Date;

  @ApiPropertyOptional({
    description: 'Validation error if any',
    example: null,
  })
  validationError?: string;

  @ApiProperty({
    description: 'Created at timestamp',
    example: '2025-11-01T08:00:00Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Updated at timestamp',
    example: '2025-11-18T10:30:00Z',
  })
  updatedAt!: Date;

  @ApiPropertyOptional({
    description: 'Created by user ID',
    example: 'c2ggde99-9e2d-6hg0-dd8f-8dd1df502c33',
  })
  createdBy?: string;

  @ApiPropertyOptional({
    description: 'Updated by user ID',
    example: 'c2ggde99-9e2d-6hg0-dd8f-8dd1df502c33',
  })
  updatedBy?: string;
}
