import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

import type { PendingKind, PendingStatus } from '../entities';

/**
 * Every accepted filter must be declared here: `forbidNonWhitelisted` is global,
 * so an undeclared parameter fails the request rather than being silently
 * ignored.
 */
export class QueryApprovalsDto {
  @ApiPropertyOptional({ enum: ['pending', 'approved', 'rejected', 'cancelled'] })
  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected', 'cancelled'])
  status?: PendingStatus;

  @ApiPropertyOptional({ enum: ['receipt', 'expense', 'reversal'] })
  @IsOptional()
  @IsIn(['receipt', 'expense', 'reversal'])
  kind?: PendingKind;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Filters on value_date, inclusive.' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filters on value_date, inclusive.' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Matches request_no, reference or counterparty.' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
