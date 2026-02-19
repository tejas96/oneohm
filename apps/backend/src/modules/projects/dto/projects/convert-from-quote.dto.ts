import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectPriority } from '@oneohm-epc/shared-types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class ConvertTeamMemberDto {
  @ApiProperty({ description: 'User ID to assign as team member' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ description: 'Role name for this team member in the project' })
  @IsString()
  roleName!: string;

  @ApiPropertyOptional({ description: 'Whether this member is the project manager' })
  @IsOptional()
  @IsBoolean()
  isProjectManager?: boolean;
}

export class ConvertFromQuoteDto {
  @ApiPropertyOptional({ description: 'Project Manager user ID' })
  @IsOptional()
  @IsUUID()
  projectManagerId?: string;

  @ApiPropertyOptional({ description: 'Team members to assign', type: [ConvertTeamMemberDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConvertTeamMemberDto)
  teamMembers?: ConvertTeamMemberDto[];

  @ApiPropertyOptional({ description: 'Project start date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Project end date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Project priority', enum: ProjectPriority })
  @IsOptional()
  @IsEnum(ProjectPriority)
  priority?: ProjectPriority;
}
