import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MaintenanceConfigStatus } from '@oneohm-epc/shared-types';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';


/**
 * DTO for Maintenance Interval Configuration
 */
export class MaintenanceIntervalDto {
  @ApiProperty({
    description: 'Interval number (sequence)',
    example: 1,
  })
  @IsInt()
  @Min(1)
  intervalNumber: number;

  @ApiProperty({
    description: 'Months after project completion',
    example: 3,
  })
  @IsInt()
  @Min(1)
  months: number;

  @ApiProperty({
    description: 'Task name for this interval',
    example: 'First Maintenance Checkup',
  })
  @IsString()
  @IsNotEmpty()
  taskName: string;

  @ApiPropertyOptional({
    description: 'Task description',
    example: 'Perform routine inspection and cleaning',
  })
  @IsString()
  @IsOptional()
  description?: string;
}

/**
 * DTO for Creating Maintenance Config
 */
export class CreateMaintenanceConfigDto {
  @ApiProperty({
    description: 'Organization ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({
    description: 'Project ID (unique)',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  // ============================================
  // MAINTENANCE SETTINGS
  // ============================================

  @ApiPropertyOptional({
    description: 'Is maintenance enabled for this project',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isMaintenanceEnabled?: boolean;

  @ApiProperty({
    description: 'Total maintenance years',
    example: 5,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  maintenanceYears: number;

  @ApiProperty({
    description: 'Array of maintenance intervals',
    type: [MaintenanceIntervalDto],
    example: [
      { intervalNumber: 1, months: 3, taskName: 'First Checkup' },
      { intervalNumber: 2, months: 6, taskName: 'Second Checkup' },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MaintenanceIntervalDto)
  intervals: MaintenanceIntervalDto[];

  // ============================================
  // TRACKING (OPTIONAL)
  // ============================================

  @ApiPropertyOptional({
    description: 'Project completion date',
    example: '2024-01-15',
  })
  @IsDateString()
  @IsOptional()
  projectCompletionDate?: string;

  @ApiPropertyOptional({
    description: 'Last maintenance date',
    example: '2024-04-15',
  })
  @IsDateString()
  @IsOptional()
  lastMaintenanceDate?: string;

  @ApiPropertyOptional({
    description: 'Next maintenance due date',
    example: '2024-07-15',
  })
  @IsDateString()
  @IsOptional()
  nextMaintenanceDueDate?: string;

  // ============================================
  // STATUS
  // ============================================

  @ApiPropertyOptional({
    description: 'Maintenance config status',
    enum: MaintenanceConfigStatus,
    example: MaintenanceConfigStatus.ACTIVE,
    default: MaintenanceConfigStatus.ACTIVE,
  })
  @IsEnum(MaintenanceConfigStatus)
  @IsOptional()
  status?: MaintenanceConfigStatus;

  // ============================================
  // AUDIT (OPTIONAL)
  // ============================================

  @ApiPropertyOptional({
    description: 'User who created this config',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsUUID()
  @IsOptional()
  createdBy?: string;
}

