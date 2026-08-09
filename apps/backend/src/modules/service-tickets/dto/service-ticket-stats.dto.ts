import { ApiProperty } from '@nestjs/swagger';

/**
 * Global counts for the stat tiles on /service. Deliberately unaffected by the
 * table's current filters — the tiles are a fixed frame of reference the user
 * filters *from*.
 */
export class ServiceTicketStatsDto {
  @ApiProperty({ example: 12 })
  open: number;

  @ApiProperty({ example: 5 })
  inProgress: number;

  @ApiProperty({ example: 31 })
  resolved: number;

  @ApiProperty({ example: 74 })
  closed: number;

  @ApiProperty({
    example: 3,
    description: 'Active (open or in progress) tickets at urgent priority',
  })
  urgent: number;
}
