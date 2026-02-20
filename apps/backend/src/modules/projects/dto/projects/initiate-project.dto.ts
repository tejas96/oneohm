import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectPriority } from '@oneohm-epc/shared-types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { ConvertTeamMemberDto } from './convert-from-quote.dto';

export class InitiateProjectDto {
  @ApiProperty({ description: 'Property ID to create project for' })
  @IsUUID()
  @IsNotEmpty()
  propertyId!: string;

  @ApiProperty({ description: 'Project name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ description: 'System size in kW' })
  @IsNumber()
  @Min(0.1)
  systemSizeKw!: number;

  @ApiProperty({ description: 'Project type (e.g. residential, commercial)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  projectType!: string;

  @ApiPropertyOptional({ description: 'Project description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Estimated cost' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  estimatedCost?: number;

  @ApiPropertyOptional({ description: 'Project priority', enum: ProjectPriority })
  @IsEnum(ProjectPriority)
  @IsOptional()
  priority?: ProjectPriority;

  @ApiPropertyOptional({ description: 'Start date (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Project Manager user ID' })
  @IsUUID()
  @IsOptional()
  projectManagerId?: string;

  @ApiPropertyOptional({ description: 'Team members to assign', type: [ConvertTeamMemberDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConvertTeamMemberDto)
  teamMembers?: ConvertTeamMemberDto[];

  @ApiPropertyOptional({ description: 'Task template IDs to exclude from auto-creation' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  excludedTaskTemplateIds?: string[];
}
