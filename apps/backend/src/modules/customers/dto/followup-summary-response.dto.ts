import { ApiProperty } from '@nestjs/swagger';

export class FollowupSummaryResponseDto {
  @ApiProperty({ description: 'Pending followups scheduled before today' })
  overdue!: number;

  @ApiProperty({ description: 'Pending followups scheduled today' })
  today!: number;

  @ApiProperty({ description: 'Pending followups scheduled after today' })
  upcoming!: number;

  @ApiProperty({ description: 'Open lead units with no pending followup at all' })
  gaps!: number;
}
