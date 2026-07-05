import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

/**
 * Shared date-range query params for all analytics domain endpoints.
 * Cohort/window semantics are defined per domain (e.g. property created_at for sales pipeline).
 */
export class AnalyticsDateRangeQueryDto {
  @ApiPropertyOptional({ description: 'Start date (YYYY-MM-DD)' })
  @IsOptional()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD)' })
  @IsOptional()
  toDate?: string;
}
