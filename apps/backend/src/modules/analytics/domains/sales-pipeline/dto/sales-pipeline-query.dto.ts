import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';

import { AnalyticsDateRangeQueryDto } from '../../../common/dto/analytics-date-range.dto';

export class SalesPipelineQueryDto extends AnalyticsDateRangeQueryDto {
  @ApiPropertyOptional({ description: 'Filter by salesperson user id' })
  @IsOptional()
  @IsUUID()
  salesPersonId?: string;
}

export class SalesPipelineTrendQueryDto extends SalesPipelineQueryDto {
  @ApiPropertyOptional({ enum: ['week', 'month'], default: 'week' })
  @IsOptional()
  @IsIn(['week', 'month'])
  granularity?: 'week' | 'month';
}
