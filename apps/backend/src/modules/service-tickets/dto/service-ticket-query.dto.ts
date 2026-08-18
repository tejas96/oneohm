import { ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceTicketPriority, ServiceTicketStatus } from '@tejas96/shared/types';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

import { IsOptionalBoolean } from '../../../common/decorators';

/** Accepts both `?status=open&status=in_progress` and `?status=open,in_progress`. */
function toArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) return value as string[];
  // Anything that is neither a string nor an array is malformed input; let it
  // fall through as undefined rather than stringifying an object into a filter.
  if (typeof value !== 'string') return undefined;
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export class ServiceTicketQueryDto {
  @ApiPropertyOptional({ enum: ServiceTicketStatus, isArray: true })
  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsArray()
  @IsEnum(ServiceTicketStatus, { each: true })
  status?: ServiceTicketStatus[];

  @ApiPropertyOptional({ enum: ServiceTicketPriority, isArray: true })
  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsArray()
  @IsEnum(ServiceTicketPriority, { each: true })
  priority?: ServiceTicketPriority[];

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Filters via project.property_id' })
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Employee profile id' })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({ description: 'Only tickets with no assignee' })
  @IsOptionalBoolean()
  unassigned?: boolean;

  @ApiPropertyOptional({
    description: 'Only active tickets past their due date',
  })
  @IsOptionalBoolean()
  overdue?: boolean;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  createdBy?: string;

  @ApiPropertyOptional({ description: 'Matches title or ticket number, case-insensitive' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsString()
  fromDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsString()
  toDate?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({ default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy = 'createdAt';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsString()
  sortOrder: 'ASC' | 'DESC' = 'DESC';
}
