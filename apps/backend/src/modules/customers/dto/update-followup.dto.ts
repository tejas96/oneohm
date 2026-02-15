import { PartialType } from '@nestjs/swagger';

import { CreateFollowupDto } from './create-followup.dto';

/**
 * Update Followup DTO
 * All fields from CreateFollowupDto are optional
 */
export class UpdateFollowupDto extends PartialType(CreateFollowupDto) {}
