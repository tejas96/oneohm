import { ApiProperty } from '@nestjs/swagger';
import { ResellerStatus } from '@tejas96/shared/types';
import { IsEnum } from 'class-validator';

/**
 * DTO for updating reseller status
 */
export class UpdateResellerStatusDto {
  @ApiProperty({
    enum: Object.values(ResellerStatus),
    enumName: 'ResellerStatus',
    example: ResellerStatus.ACTIVE,
    description: 'New status for the reseller',
  })
  @IsEnum(ResellerStatus)
  status!: ResellerStatus;
}
