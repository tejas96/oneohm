import { Expose, Type } from 'class-transformer';

import { UserResponseDto } from '../../users/dto/user-response.dto';

/**
 * Response DTO for an audit log
 */
export class AuditLogResponseDto {
  @Expose()
  id: string;

  @Expose()
  @Expose()
  entityType: string;

  @Expose()
  entityId: string;

  @Expose()
  action: string;

  @Expose()
  oldValues: Record<string, unknown> | null;

  @Expose()
  newValues: Record<string, unknown> | null;

  @Expose()
  userId: string | null;

  @Expose()
  @Type(() => UserResponseDto)
  user?: UserResponseDto;

  @Expose()
  ipAddress: string | null;

  @Expose()
  userAgent: string | null;

  @Expose()
  metadata: Record<string, unknown> | null;

  @Expose()
  @Type(() => Date)
  createdAt: Date;
}
