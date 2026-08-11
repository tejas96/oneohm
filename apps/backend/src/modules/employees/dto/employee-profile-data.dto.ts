import { OmitType } from '@nestjs/swagger';

import { CreateEmployeeDto } from './create-employee.dto';

/**
 * Inline employee/reseller profile payload (no userId).
 * Used to validate profileData on user onboarding flows.
 */
export class EmployeeProfileDataDto extends OmitType(CreateEmployeeDto, ['userId'] as const) {}
