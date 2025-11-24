import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type TaskChecklist } from '@oneohm-epc/shared-types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTaskTemplateDto {
  @ApiProperty({ description: 'Organization ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  organizationId!: string;

  @ApiPropertyOptional({
    description: 'Milestone Template ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsOptional()
  milestoneTemplateId?: string;

  @ApiProperty({ description: 'Template name', example: 'Panel Installation', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ description: 'Template code', example: 'TPL-INSTALL-001', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  code!: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Task type', example: 'installation' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ description: 'Default department', example: 'Installation' })
  @IsString()
  @IsOptional()
  defaultDepartment?: string;

  @ApiPropertyOptional({ description: 'Default role code', example: 'TECHNICIAN' })
  @IsString()
  @IsOptional()
  defaultRoleCode?: string;

  @ApiProperty({ description: 'Sequence order', example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  @Type(() => Number)
  sequenceOrder!: number;

  @ApiPropertyOptional({ description: 'Is mandatory', example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isMandatory?: boolean;

  @ApiPropertyOptional({ description: 'Can run in parallel', example: false, default: false })
  @IsBoolean()
  @IsOptional()
  canRunParallel?: boolean;

  @ApiPropertyOptional({ description: 'Depends on task codes', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  dependsOnTaskCodes?: string[];

  @ApiPropertyOptional({ description: 'Estimated duration in hours', example: 8, minimum: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  estimatedDurationHours?: number;

  @ApiPropertyOptional({ description: 'Checklist template' })
  @IsObject()
  @IsOptional()
  checklistTemplate?: TaskChecklist;

  @ApiPropertyOptional({ description: 'Is active', example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
