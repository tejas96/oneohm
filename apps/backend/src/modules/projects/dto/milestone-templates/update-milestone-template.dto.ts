import { PartialType } from '@nestjs/swagger';

import { CreateMilestoneTemplateDto } from './create-milestone-template.dto';

/**
 * DTO for updating a milestone template
 */
export class UpdateMilestoneTemplateDto extends PartialType(CreateMilestoneTemplateDto) {
  updatedBy?: string;
}
