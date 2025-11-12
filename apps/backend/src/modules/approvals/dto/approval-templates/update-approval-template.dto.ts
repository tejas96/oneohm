import { PartialType } from '@nestjs/swagger';

import { CreateApprovalTemplateDto } from './create-approval-template.dto';

/**
 * DTO for updating an approval template
 */
export class UpdateApprovalTemplateDto extends PartialType(CreateApprovalTemplateDto) {}

