import { ApiProperty } from '@nestjs/swagger';
import { CommissionStatus } from '@tejas96/shared/types';
import { IsEnum } from 'class-validator';

/**
 * DTO for updating commission status
 */
export class UpdateCommissionStatusDto {
  @ApiProperty({
    enum: Object.values(CommissionStatus),
    enumName: 'CommissionStatus',
    example: CommissionStatus.APPROVED,
    description: 'New status for the commission',
  })
  @IsEnum(CommissionStatus)
  status!: CommissionStatus;
}
