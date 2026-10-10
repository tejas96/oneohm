import { ApiPropertyOptional } from '@nestjs/swagger';
import type { DashboardFinancing, DashboardPeriod } from '@tejas96/shared/types';
import { IsIn, IsOptional, IsUUID, Matches } from 'class-validator';

import {
  DASHBOARD_FINANCING,
  DASHBOARD_PERIODS,
} from '../../../projects/dto/dashboard/projects-dashboard-query.dto';

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export class QuotesDashboardQueryDto {
  @ApiPropertyOptional({ enum: DASHBOARD_PERIODS, default: 'this_month' })
  @IsOptional()
  @IsIn(DASHBOARD_PERIODS)
  period?: DashboardPeriod;

  @ApiPropertyOptional({ example: '2026-09-01', description: 'Required when period=custom' })
  @IsOptional()
  @Matches(ISO_DAY)
  from?: string;

  @ApiPropertyOptional({ example: '2026-09-30', description: 'Required when period=custom' })
  @IsOptional()
  @Matches(ISO_DAY)
  to?: string;

  @ApiPropertyOptional({ description: 'Only deals whose quote this user made' })
  @IsOptional()
  @IsUUID()
  person?: string;

  @ApiPropertyOptional({ enum: DASHBOARD_FINANCING, default: 'all' })
  @IsOptional()
  @IsIn(DASHBOARD_FINANCING)
  financing?: DashboardFinancing;
}
