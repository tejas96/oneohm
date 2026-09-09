import { ApiProperty } from '@nestjs/swagger';

/**
 * What a cancelled project still has hanging. Derived at read time from the
 * rows themselves — see `ProjectCancellationService.getCleanup` — never
 * stored, so it cannot fall out of step with what it describes.
 */
export class CancellationCleanupDto {
  @ApiProperty({ example: 4, description: 'Units still at site: dispatched minus returned' })
  unitsAtSite!: number;

  @ApiProperty({
    example: 6,
    description:
      'Units the warehouse still has reserved for this project: allocated minus ' +
      'dispatched, on allocations that were never cancelled. Non-zero means a ' +
      'release failed and the stock cannot be sold to anyone else.',
  })
  unitsReserved!: number;

  @ApiProperty({ example: 1 }) pendingReturns!: number;
  @ApiProperty({ example: 2 }) openPurchaseOrders!: number;

  @ApiProperty({
    example: 0,
    description:
      'Advisory only, and NOT part of `state`. Nothing writes ' +
      '`employee_commissions.recovered_at` yet, so gating on it would pin every ' +
      'project that ever paid a commission at cleanup_pending forever.',
  })
  unrecoveredCommissions!: number;
  @ApiProperty({ example: true }) settled!: boolean;
  @ApiProperty({ example: 'cleanup_pending', enum: ['cleanup_pending', 'settled'] })
  state!: 'cleanup_pending' | 'settled';
}
