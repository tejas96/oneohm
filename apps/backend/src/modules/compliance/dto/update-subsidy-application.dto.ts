import { PartialType } from '@nestjs/swagger';

import { CreateSubsidyApplicationDto } from './create-subsidy-application.dto';

/**
 * DTO for updating a subsidy application
 */
export class UpdateSubsidyApplicationDto extends PartialType(CreateSubsidyApplicationDto) {}

