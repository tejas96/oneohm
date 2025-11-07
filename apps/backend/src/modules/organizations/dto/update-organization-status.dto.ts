import { ApiProperty } from '@nestjs/swagger';

import { OrganizationStatus } from '@oneohm-epc/shared-types';
import { IsEnum } from 'class-validator';

export class UpdateOrganizationStatusDto {
  @ApiProperty({
    enum: OrganizationStatus,
    example: OrganizationStatus.ACTIVE,
    description: 'New status for the organization',
  })
  @IsEnum(OrganizationStatus)
  status!: OrganizationStatus;
}
