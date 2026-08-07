import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Response DTO for user role assignment
 * Includes user and role details for API responses
 */
export class UserRoleResponseDto {
  @ApiProperty({
    example: '00000000-0000-0000-0000-000000000001',
    description: 'User role assignment ID',
  })
  id!: string;

  @ApiProperty({
    example: '00000000-0000-0000-0000-000000000001',
    description: 'User ID',
  })
  userId!: string;

  @ApiPropertyOptional({
    example: 'John Doe',
    description: 'Full name of the user',
  })
  userName?: string;

  @ApiPropertyOptional({
    example: 'john.doe@example.com',
    description: 'Email of the user',
  })
  userEmail?: string;

  @ApiProperty({
    example: '00000000-0000-0000-0000-000000000001',
    description: 'Role ID from IAM roles table',
  })
  roleId!: string;

  @ApiProperty({
    example: 'field_worker',
    description: 'Role code',
  })
  roleCode!: string;

  @ApiPropertyOptional({
    example: 'Field Worker',
    description: 'Role display name',
  })
  roleName?: string;

  @ApiPropertyOptional({
    example: '00000000-0000-0000-0000-000000000001',
    description: 'Organization ID',
  })

  @ApiProperty({
    example: '2024-01-15T10:30:00Z',
    description: 'When the role was assigned',
  })
  createdAt!: Date;
}

/**
 * Response DTO for bulk assignment operation
 */
export class BulkAssignResponseDto {
  @ApiProperty({
    example: 'Role assigned to 10 users (3 already had the role)',
    description: 'Summary message',
  })
  message!: string;

  @ApiProperty({
    example: 10,
    description: 'Number of users successfully assigned the role',
  })
  assigned!: number;

  @ApiProperty({
    example: 3,
    description: 'Number of users skipped (already had the role)',
  })
  skipped!: number;

  @ApiProperty({
    example: 0,
    description: 'Number of users that failed validation',
  })
  failed!: number;
}
