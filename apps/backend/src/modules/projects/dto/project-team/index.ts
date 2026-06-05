import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
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
 * Nested user info exposed inside TeamMemberResponseDto.
 * Keeps the response lean — only name + email.
 */
class TeamMemberUserDto {
  @ApiProperty({ example: 'Vikram' })
  @Expose()
  firstName!: string;

  @ApiPropertyOptional({ example: 'Singh' })
  @Expose()
  lastName?: string;

  @ApiPropertyOptional({ example: 'vikram@example.com' })
  @Expose()
  email?: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @Expose()
  phone?: string;
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

  @ApiPropertyOptional({ example: 5 })
  @Expose()
  rating?: number;

  @ApiPropertyOptional({ example: 'Great customer service' })
  @Expose()
  comment?: string;

  @ApiPropertyOptional({ type: TeamMemberUserDto })
  @Expose()
  @Type(() => TeamMemberUserDto)
  @Transform(({ obj }) => {
    if (!obj.user) return undefined;
    return {
      firstName: obj.user.firstName ?? '',
      lastName: obj.user.lastName ?? undefined,
      email: obj.user.email ?? undefined,
      phone: obj.user.phone ?? undefined,
    };
  })
  user?: TeamMemberUserDto;

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

/**
 * DTO for customer submitting feedback for a team member
 */
export class SubmitTeamFeedbackDto {
  @ApiProperty({
    description: 'Team member assignment ID (project_team_members.id)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  memberId!: string;

  @ApiProperty({
    description: 'Star rating (1 to 5)',
    example: 5,
  })
  @Type(() => Number)
  @IsNotEmpty()
  rating!: number;

  @ApiProperty({
    description: 'Text review / comment',
    example: 'Very polite and helpful!',
  })
  @IsString()
  @IsNotEmpty()
  comment!: string;
}
