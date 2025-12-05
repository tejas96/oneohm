import { ApiProperty } from '@nestjs/swagger';
import { UserStatus } from '@oneohm-epc/shared-types';
import { IsEnum } from 'class-validator';

/**
 * DTO for updating employee status
 */
export class UpdateEmployeeStatusDto {
  @ApiProperty({
    enum: Object.values(UserStatus),
    enumName: 'UserStatus',
    example: UserStatus.ACTIVE,
    description: 'New status for the employee',
  })
  @IsEnum(UserStatus)
  status!: UserStatus;
}
