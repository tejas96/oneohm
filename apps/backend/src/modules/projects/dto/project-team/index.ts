import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/**
 * DTO for adding a team member to a project
 */
export class AddTeamMemberDto {
  @ApiProperty({
    description: 'User ID to add to the team',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({
    description: 'Role name for the team member',
    example: 'Technician',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  roleName!: string;

  @ApiPropertyOptional({
    description: 'Whether this user is the project manager',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isProjectManager?: boolean;
}

/**
 * DTO for updating a team member
 */
export class UpdateTeamMemberDto {
  @ApiPropertyOptional({
    description: 'Role name for the team member',
    example: 'Lead Technician',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  roleName?: string;

  @ApiPropertyOptional({
    description: 'Whether this user is the project manager',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isProjectManager?: boolean;
}

/**
 * Response DTO for team member
 */
export class TeamMemberResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  projectId!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  userId!: string;

  @ApiProperty({ example: 'Technician' })
  @Expose()
  roleName!: string;

  @ApiProperty({ example: false })
  @Expose()
  isProjectManager!: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  @Expose()
  joinedAt!: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  @Expose()
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  @Expose()
  updatedAt!: Date;
}
