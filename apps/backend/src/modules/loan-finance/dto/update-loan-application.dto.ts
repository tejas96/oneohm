import { OmitType, PartialType } from '@nestjs/swagger';
import { LoanStatus } from '@tejas96/shared/types';
import { IsEnum, IsNotEmpty } from 'class-validator';

import { CreateLoanApplicationDto } from './create-loan-application.dto';

/**
 * DTO for Updating Loan Application fields (excludes status — use UpdateLoanStatusDto)
 */
export class UpdateLoanApplicationDto extends PartialType(
  OmitType(CreateLoanApplicationDto, ['status'] as const),
) {}

/**
 * DTO for updating loan application status through validated FSM transitions
 */
export class UpdateLoanStatusDto {
  @IsEnum(LoanStatus)
  @IsNotEmpty()
  status: LoanStatus;
}
