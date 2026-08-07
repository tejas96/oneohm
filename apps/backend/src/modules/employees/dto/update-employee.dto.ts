import { OmitType, PartialType } from '@nestjs/swagger';

import { CreateEmployeeDto } from './create-employee.dto';

/**
 * DTO for updating an employee profile
 * Excludes userId, and companyCode as they cannot be changed
 * (companyCode is immutable after creation, same as the original reseller module)
 */
export class UpdateEmployeeDto extends PartialType(
  OmitType(CreateEmployeeDto, ['userId', 'companyCode'] as const),
) {}
