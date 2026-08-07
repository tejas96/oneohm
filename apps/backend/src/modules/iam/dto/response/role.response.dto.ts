import { ApiProperty } from '@nestjs/swagger';

/**
 * Role Response DTO
 */
export class RoleResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174001',
    nullable: true,
    description: 'Organization ID. NULL for platform-level roles (e.g., platform_admin)',
  })

  @ApiProperty({ example: 'Sales Manager' })
  name: string;

  @ApiProperty({ example: 'sales_manager' })
  code: string;

  @ApiProperty({ example: 'Manages sales team and customer relationships', required: false })
  description?: string;

  @ApiProperty({ example: 1 })
  level: number;

  @ApiProperty({ example: false })
  isSystemRole: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;

  @ApiProperty({ required: false })
  deletedAt?: Date;

  @ApiProperty({
    example: 12,
    required: false,
    description: 'Number of permissions assigned to this role',
  })
  permissionsCount?: number;

  @ApiProperty({
    example: 5,
    required: false,
    description: 'Number of users assigned to this role',
  })
  usersCount?: number;
}

/**
 * Role with Permissions Response DTO
 */
export class RoleWithPermissionsDto extends RoleResponseDto {
  @ApiProperty({
    type: [String],
    example: ['customers:read', 'customers:create', 'customers:update'],
  })
  permissions: string[];

  @ApiProperty({
    type: [String],
    description: 'Permission UUIDs for sync operations',
  })
  permissionIds: string[];
}

/**
 * Paginated Roles Response DTO
 */
export class PaginatedRolesDto {
  @ApiProperty({ type: [RoleResponseDto] })
  data: RoleResponseDto[];

  @ApiProperty({ example: 10 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  pageSize: number;
}
