import { ApiProperty } from '@nestjs/swagger';

/**
 * Permission Response DTO
 */
export class PermissionResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001' })
  featureId: string;

  @ApiProperty({ example: 'Read Customers' })
  name: string;

  @ApiProperty({ example: 'customers:read' })
  code: string;

  @ApiProperty({ example: 'Allows viewing customer records', required: false })
  description?: string;

  @ApiProperty({ example: 'read' })
  action: string;

  @ApiProperty({ example: 'all', enum: ['all', 'own', 'department', 'assigned', 'custom'] })
  scope: string;

  @ApiProperty({ example: 'standard', enum: ['basic', 'standard', 'advanced', 'admin'] })
  permissionLevel: string;

  @ApiProperty({ example: true })
  showInMenu: boolean;

  @ApiProperty({ example: 'View Customers', required: false })
  menuLabel?: string;

  @ApiProperty({
    example: { department: 'sales', region: 'north' },
    required: false,
    description: 'Conditional access rules (ABAC support)',
  })
  conditions?: Record<string, unknown>;

  @ApiProperty({ example: ['uuid1', 'uuid2'], required: false, type: [String] })
  dependsOnPermissionIds?: string[];

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: true })
  isSystemPermission: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

/**
 * Paginated Permissions Response DTO
 */
export class PaginatedPermissionsDto {
  @ApiProperty({ type: [PermissionResponseDto] })
  data: PermissionResponseDto[];

  @ApiProperty({ example: 10 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  pageSize: number;
}
