import { PartialType } from '@nestjs/swagger';

import { CreateInspectionDto } from './create-inspection.dto';

/**
 * DTO for updating an inspection
 */
export class UpdateInspectionDto extends PartialType(CreateInspectionDto) {}

