import { ApiProperty } from '@nestjs/swagger';
import { ProjectStatus } from '@tejas96/shared/types';
import { IsEnum } from 'class-validator';

export class UpdateProjectStatusDto {
  @ApiProperty({
    description: 'New project status',
    enum: ProjectStatus,
  })
  @IsEnum(ProjectStatus)
  status!: ProjectStatus;
}
