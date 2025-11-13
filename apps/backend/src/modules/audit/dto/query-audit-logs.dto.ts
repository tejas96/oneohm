import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

import { AuditAction, AuditEntityType } from '@oneohm-epc/shared-types';

/**
 * DTO for querying audit logs with filters
 */
export class QueryAuditLogsDto {
  @IsUUID()
  @IsOptional()
  organizationId?: string;

  @IsEnum(AuditEntityType)
  @IsOptional()
  entityType?: AuditEntityType;

  @IsUUID()
  @IsOptional()
  entityId?: string;

  @IsEnum(AuditAction)
  @IsOptional()
  action?: AuditAction;

  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  startDate?: Date;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  endDate?: Date;

  @IsString()
  @IsOptional()
  ipAddress?: string;
}

