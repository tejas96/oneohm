import { ApiProperty } from '@nestjs/swagger';

import { UserStatus } from '@oneohm-epc/shared-types';
import { IsEnum } from 'class-validator';

export class UpdateUserStatusDto {
  @ApiProperty({
    enum: UserStatus,
    example: UserStatus.ACTIVE,
    description: 'New status for the user',
  })
  @IsEnum(UserStatus)
  status!: UserStatus;
}
