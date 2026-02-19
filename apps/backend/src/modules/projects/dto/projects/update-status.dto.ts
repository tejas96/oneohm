import { ApiProperty } from '@nestjs/swagger';
import { ProjectStatus } from '@oneohm-epc/shared-types';
import { IsEnum } from 'class-validator';

export class UpdateProjectStatusDto {
  @ApiProperty({
    description: 'New project status',
    enum: ProjectStatus,
  })
  @IsEnum(ProjectStatus)
  status!: ProjectStatus;
}
