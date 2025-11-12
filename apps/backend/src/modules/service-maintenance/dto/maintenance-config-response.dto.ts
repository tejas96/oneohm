import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MaintenanceConfigStatus } from '@oneohm-epc/shared-types';
import { Expose, Type } from 'class-transformer';


import { OrganizationResponseDto } from '../../organizations/dto/organization-response.dto';
import { UserResponseDto } from '../../users/dto/user-response.dto';

/**
 * DTO for Maintenance Interval Response
 */
export class MaintenanceIntervalResponseDto {
  @ApiProperty({ description: 'Interval number', example: 1 })
  @Expose()
  intervalNumber: number;

  @ApiProperty({ description: 'Months after completion', example: 3 })
  @Expose()
  months: number;

  @ApiProperty({ description: 'Task name', example: 'First Checkup' })
  @Expose()
  taskName: string;

  @ApiPropertyOptional({ description: 'Task description' })
  @Expose()
  description?: string;
}

/**
 * Response DTO for Maintenance Config
 */
export class MaintenanceConfigResponseDto {
  @ApiProperty({ description: 'Config ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Organization ID', example: '123e4567-e89b-12d3-a456-426614174001' })
  @Expose()
  organizationId: string;

  @ApiProperty({ description: 'Project ID', example: '123e4567-e89b-12d3-a456-426614174002' })
  @Expose()
  projectId: string;

  @ApiProperty({ description: 'Is maintenance enabled', example: true })
  @Expose()
  isMaintenanceEnabled: boolean;

  @ApiProperty({ description: 'Maintenance years', example: 5 })
  @Expose()
  maintenanceYears: number;

  @ApiProperty({
    description: 'Maintenance intervals',
    type: [MaintenanceIntervalResponseDto],
  })
  @Expose()
  @Type(() => MaintenanceIntervalResponseDto)
  intervals: MaintenanceIntervalResponseDto[];

  @ApiPropertyOptional({ description: 'Project completion date', example: '2024-01-15' })
  @Expose()
  projectCompletionDate?: Date;

  @ApiPropertyOptional({ description: 'Last maintenance date', example: '2024-04-15' })
  @Expose()
  lastMaintenanceDate?: Date;

  @ApiPropertyOptional({ description: 'Next maintenance due date', example: '2024-07-15' })
  @Expose()
  nextMaintenanceDueDate?: Date;

  @ApiProperty({
    description: 'Config status',
    enum: MaintenanceConfigStatus,
    example: MaintenanceConfigStatus.ACTIVE,
  })
  @Expose()
  status: MaintenanceConfigStatus;

  @ApiProperty({ description: 'Created at timestamp' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  @Expose()
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Created by user ID' })
  @Expose()
  createdBy?: string;

  @ApiPropertyOptional({ description: 'Updated by user ID' })
  @Expose()
  updatedBy?: string;

  // Relations
  @ApiPropertyOptional({ description: 'Organization details', type: OrganizationResponseDto })
  @Expose()
  @Type(() => OrganizationResponseDto)
  organization?: OrganizationResponseDto;

  @ApiPropertyOptional({ description: 'Created by user details', type: UserResponseDto })
  @Expose()
  @Type(() => UserResponseDto)
  createdByUser?: UserResponseDto;

  @ApiPropertyOptional({ description: 'Updated by user details', type: UserResponseDto })
  @Expose()
  @Type(() => UserResponseDto)
  updatedByUser?: UserResponseDto;
}

