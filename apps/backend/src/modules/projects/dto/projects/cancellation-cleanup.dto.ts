import { ApiProperty } from '@nestjs/swagger';

/**
 * What a cancelled project still has hanging. Derived at read time from the
 * rows themselves — see `ProjectCancellationService.getCleanup` — never
 * stored, so it cannot fall out of step with what it describes.
 */
export class CancellationCleanupDto {
  @ApiProperty({ example: 4, description: 'Units still at site: dispatched minus returned' })
  unitsAtSite!: number;
  @ApiProperty({ example: 1 }) pendingReturns!: number;
  @ApiProperty({ example: 2 }) openPurchaseOrders!: number;
  @ApiProperty({ example: 0 }) unrecoveredCommissions!: number;
  @ApiProperty({ example: true }) settled!: boolean;
  @ApiProperty({ example: 'cleanup_pending', enum: ['cleanup_pending', 'settled'] })
  state!: 'cleanup_pending' | 'settled';
}
