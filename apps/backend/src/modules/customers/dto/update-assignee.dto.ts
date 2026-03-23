import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsUUID, ValidateIf } from 'class-validator';

/**
 * DTO for assigning or unassigning a customer to a user.
 * Send assigneeId as a valid UUID to assign, or null to unassign.
 *
 * The field MUST be present in the request body (not omitted). Sending
 * `{ "assigneeId": null }` is the explicit unassign signal. Omitting the
 * field entirely is a client error and returns 400.
 */
export class UpdateAssigneeDto {
  @ApiProperty({
    description: 'User ID to assign this customer to. Send null to unassign.',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  @IsDefined({ message: 'assigneeId must be present (use null to unassign)' })
  @ValidateIf((_, value) => value !== null)
  @IsUUID('4', { message: 'assigneeId must be a valid UUID v4' })
  assigneeId!: string | null;
}
