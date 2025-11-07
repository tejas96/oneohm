import { ApiProperty } from '@nestjs/swagger';

import { CustomerStatus } from '@oneohm-epc/shared-types';
import { IsEnum } from 'class-validator';

/**
 * DTO for updating customer status
 */
export class UpdateCustomerStatusDto {
  @ApiProperty({
    enum: CustomerStatus,
    example: CustomerStatus.ACTIVE,
    description: 'New status for the customer',
  })
  @IsEnum(CustomerStatus)
  status!: CustomerStatus;
}
