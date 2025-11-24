import { PartialType } from '@nestjs/swagger';

import { CreateLoanApplicationDto } from './create-loan-application.dto';

/**
 * DTO for Updating Loan Application
 */
export class UpdateLoanApplicationDto extends PartialType(CreateLoanApplicationDto) {}
