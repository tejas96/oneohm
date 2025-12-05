import { OmitType, PartialType } from '@nestjs/swagger';

import { CreateEmployeeDto } from './create-employee.dto';

/**
 * DTO for updating an employee profile
 * Excludes userId and organizationId as they cannot be changed
 */
export class UpdateEmployeeDto extends PartialType(
  OmitType(CreateEmployeeDto, ['userId', 'organizationId'] as const),
) {}
