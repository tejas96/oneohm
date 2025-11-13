import { PartialType } from '@nestjs/swagger';

import { CreateComplianceApplicationDto } from './create-compliance-application.dto';

/**
 * DTO for updating a compliance application
 */
export class UpdateComplianceApplicationDto extends PartialType(CreateComplianceApplicationDto) {}

