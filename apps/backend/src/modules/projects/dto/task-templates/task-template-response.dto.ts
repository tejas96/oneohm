import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type MilestoneType, type TaskChecklist } from '@oneohm-epc/shared-types';
import { Expose } from 'class-transformer';

export class TaskTemplateResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  organizationId!: string;

  @ApiProperty({ example: 'Panel Installation' })
  @Expose()
  name!: string;

  @ApiProperty({ example: 'TPL-INSTALL-001' })
  @Expose()
  code!: string;

  @ApiPropertyOptional({ example: 'Standard panel installation template' })
  @Expose()
  description?: string;

  @ApiPropertyOptional({ example: 'installation' })
  @Expose()
  type?: string;

  @ApiPropertyOptional({ example: 'Installation' })
  @Expose()
  defaultDepartment?: string;

  @ApiPropertyOptional({ example: 'TECHNICIAN' })
  @Expose()
  defaultRoleCode?: string;

  @ApiPropertyOptional({ example: 'installation', description: 'Default milestone type for task-milestone linking' })
  @Expose()
  defaultMilestoneType?: MilestoneType | null;

  @ApiProperty({ example: 1 })
  @Expose()
  sequenceOrder!: number;

  @ApiProperty({ example: true })
  @Expose()
  isMandatory!: boolean;

  @ApiProperty({ example: false })
  @Expose()
  canRunParallel!: boolean;

  @ApiPropertyOptional({ type: [String] })
  @Expose()
  dependsOnTaskCodes?: string[];

  @ApiPropertyOptional({ example: 8 })
  @Expose()
  estimatedDurationHours?: number;

  @ApiPropertyOptional()
  @Expose()
  checklistTemplate?: TaskChecklist;

  @ApiProperty({ example: true })
  @Expose()
  isActive!: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  @Expose()
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  @Expose()
  updatedAt!: Date;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  createdBy?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  updatedBy?: string;
}
