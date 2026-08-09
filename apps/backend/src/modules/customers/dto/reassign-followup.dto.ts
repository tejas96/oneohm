import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

/**
 * Ownership of a lead IS the assignee of its pending followup, so reassigning
 * is how a lead changes hands. Deliberately unrestricted — no RBAC in this
 * feature; any user may reassign to any user.
 */
export class ReassignFollowupDto {
  @ApiProperty({ format: 'uuid', description: 'Any user with a role. No role restriction.' })
  @IsUUID()
  assignedToUserId!: string;
}

export class ReassignFollowupsBulkDto {
  @ApiProperty({ type: [String], format: 'uuid', description: 'Followups to move' })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  ids!: string[];

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  assignedToUserId!: string;
}
