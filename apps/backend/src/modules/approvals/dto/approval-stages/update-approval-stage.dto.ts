import { PartialType } from '@nestjs/swagger';

import { CreateApprovalStageDto } from './create-approval-stage.dto';

/**
 * DTO for updating an approval stage
 */
export class UpdateApprovalStageDto extends PartialType(CreateApprovalStageDto) {}
