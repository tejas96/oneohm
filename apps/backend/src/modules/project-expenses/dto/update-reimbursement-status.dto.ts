import { ApiProperty } from '@nestjs/swagger';
import { ReimbursementStatus } from '@oneohm-epc/shared/types';
import { IsEnum } from 'class-validator';

/**
 * FSM body for `PATCH /expenses/:id/reimbursement-status`. The service
 * enforces that the only allowed transition in v1 is
 *   `pending → reimbursed`
 * (mark-reimbursed action). All other transitions are rejected.
 */
export class UpdateReimbursementStatusDto {
  @ApiProperty({ enum: ReimbursementStatus })
  @IsEnum(ReimbursementStatus)
  status!: ReimbursementStatus;
}
