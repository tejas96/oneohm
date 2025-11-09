import { ApiProperty } from '@nestjs/swagger';

import { OrganizationStatus } from '@oneohm-epc/shared-types';
import { IsEnum } from 'class-validator';

export class UpdateOrganizationStatusDto {
  @ApiProperty({
    enum: Object.values(OrganizationStatus),
    enumName: 'OrganizationStatus',
    example: OrganizationStatus.ACTIVE,
    description: 'New status for the organization',
  })
  @IsEnum(OrganizationStatus)
  status!: OrganizationStatus;
}
