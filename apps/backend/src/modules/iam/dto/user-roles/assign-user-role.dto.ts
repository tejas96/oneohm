import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

/**
 * DTO for assigning a role to a user
 * Supports lookup by either roleId OR roleCode
 */
export class AssignUserRoleDto {
  @ApiProperty({
    example: '00000000-0000-0000-0000-000000000001',
    description: 'User ID to assign the role to',
  })
  @IsUUID()
  userId!: string;

  @ApiPropertyOptional({
    example: '00000000-0000-0000-0000-000000000001',
    description: 'Role ID to assign (from roles table). Either roleId or roleCode is required.',
  })
  @IsUUID()
  @IsOptional()
  @ValidateIf((o: AssignUserRoleDto) => !o.roleCode)
  roleId?: string;

  @ApiPropertyOptional({
    example: 'field_worker',
    description: 'Role code to assign. Either roleId or roleCode is required.',
  })
  @IsString()
  @IsOptional()
  @ValidateIf((o: AssignUserRoleDto) => !o.roleId)
  roleCode?: string;
}

/**
 * DTO for bulk assigning a role to multiple users
 */
export class BulkAssignUserRoleDto {
  @ApiProperty({
    type: [String],
    example: ['user-uuid-1', 'user-uuid-2'],
    description: 'Array of user IDs to assign the role to',
  })
  @IsUUID('4', { each: true })
  userIds!: string[];

  @ApiPropertyOptional({
    example: '00000000-0000-0000-0000-000000000001',
    description: 'Role ID to assign (from roles table). Either roleId or roleCode is required.',
  })
  @IsUUID()
  @IsOptional()
  @ValidateIf((o: BulkAssignUserRoleDto) => !o.roleCode)
  roleId?: string;

  @ApiPropertyOptional({
    example: 'field_worker',
    description: 'Role code to assign. Either roleId or roleCode is required.',
  })
  @IsString()
  @IsOptional()
  @ValidateIf((o: BulkAssignUserRoleDto) => !o.roleId)
  roleCode?: string;
}
