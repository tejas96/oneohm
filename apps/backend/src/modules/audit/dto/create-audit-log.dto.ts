import { AuditAction, AuditEntityType } from '@oneohm-epc/shared-types';
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';


/**
 * DTO for creating an audit log entry
 */
export class CreateAuditLogDto {
  @IsUUID()
  @IsOptional()
  organizationId?: string;

  @IsEnum(AuditEntityType)
  @IsNotEmpty()
  entityType: AuditEntityType;

  @IsUUID()
  @IsNotEmpty()
  entityId: string;

  @IsEnum(AuditAction)
  @IsNotEmpty()
  action: AuditAction;

  @IsObject()
  @IsOptional()
  oldValues?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  newValues?: Record<string, unknown>;

  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsString()
  @IsOptional()
  userAgent?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

