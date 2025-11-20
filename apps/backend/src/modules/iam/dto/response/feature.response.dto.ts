import { ApiProperty } from '@nestjs/swagger';

/**
 * Feature Response DTO
 */
export class FeatureResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Customers' })
  name: string;

  @ApiProperty({ example: 'customers' })
  code: string;

  @ApiProperty({ example: 'Customer management module', required: false })
  description?: string;

  @ApiProperty({ example: 'users', required: false })
  icon?: string;

  @ApiProperty({ example: 1 })
  displayOrder: number;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001', required: false })
  parentFeatureId?: string;

  @ApiProperty({ example: 'module', enum: ['module', 'sub_feature', 'component', 'workflow'] })
  featureType: string;

  @ApiProperty({ example: false })
  requiresLicense: boolean;

  @ApiProperty({ example: 'premium', required: false })
  licenseTier?: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: true })
  isSystemFeature: boolean;

  @ApiProperty({ 
    example: { color: '#007bff', category: 'core' }, 
    required: false,
    description: 'Additional metadata for UI customization'
  })
  metadata?: Record<string, unknown>;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

/**
 * Feature with Permissions Response DTO
 */
export class FeatureWithPermissionsDto extends FeatureResponseDto {
  @ApiProperty({ 
    type: [Object],
    example: [{
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Read Customers',
      code: 'customers:read',
      action: 'read',
      scope: 'all'
    }]
  })
  permissions: Array<{
    id: string;
    name: string;
    code: string;
    action: string;
    scope: string;
  }>;
}

/**
 * Paginated Features Response DTO
 */
export class PaginatedFeaturesDto {
  @ApiProperty({ type: [FeatureResponseDto] })
  data: FeatureResponseDto[];

  @ApiProperty({ example: 10 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  pageSize: number;
}


