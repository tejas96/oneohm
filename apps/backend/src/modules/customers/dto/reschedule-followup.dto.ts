import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

/**
 * Moves the date without completing. The escape valve that stops people
 * cancelling followups purely to clear them off today's list.
 */
export class RescheduleFollowupDto {
  @ApiProperty({ example: '2026-09-01T09:00:00.000Z' })
  @IsDateString()
  scheduledAt!: string;
}
