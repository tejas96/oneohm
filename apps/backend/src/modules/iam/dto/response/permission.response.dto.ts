import { ApiProperty } from '@nestjs/swagger';

/**
 * Permission Response DTO
 */
export class PermissionResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Read Customers' })
  name: string;

  @ApiProperty({ example: 'customers.view' })
  code: string;

  @ApiProperty({
    example: 'See the customer list and customer details',
    required: false,
    description: 'User-facing. Shown in the access dialog to whoever was refused.',
  })
  description?: string;

  @ApiProperty({
    example: 'customers',
    description: 'Groups the checkbox list in the role builder',
  })
  module: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;

  @ApiProperty({
    example: 3,
    required: false,
    description: 'Number of roles using this permission',
  })
  rolesCount?: number;
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
