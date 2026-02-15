import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { FollowupPriority, FollowupStatus, FollowupType } from '@oneohm-epc/shared-types';
import { Expose } from 'class-transformer';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * DTO for property followup validation
 * Used in CreateCustomerPropertyDto, UpdateCustomerPropertyDto, and responses
 * Matches PropertyFollowup interface from @oneohm-epc/shared-types
 */
export class PropertyFollowupDto {
  @ApiPropertyOptional({ description: 'UUID - auto-generated if not provided' })
  @IsOptional()
  @IsUUID()
  @Expose()
  id?: string;

  @ApiProperty({ enum: FollowupType, example: FollowupType.VISIT })
  @IsEnum(FollowupType)
  @IsNotEmpty()
  @Expose()
  type!: FollowupType;

  @ApiProperty({ example: 'Site visit for measurement' })
  @IsString()
  @IsNotEmpty()
  @Expose()
  subject!: string;

  @ApiProperty({ example: '2026-02-15T10:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  @Expose()
  scheduledAt!: string;

  @ApiProperty({ description: 'User ID responsible for this followup' })
  @IsUUID()
  @IsNotEmpty()
  @Expose()
  assignedToUserId!: string;

  @ApiPropertyOptional({ enum: FollowupStatus, default: FollowupStatus.PENDING })
  @IsOptional()
  @IsEnum(FollowupStatus)
  @Expose()
  status?: FollowupStatus;

  @ApiPropertyOptional({ enum: FollowupPriority, default: FollowupPriority.NORMAL })
  @IsOptional()
  @IsEnum(FollowupPriority)
  @Expose()
  priority?: FollowupPriority;

  @ApiPropertyOptional({ example: 'Customer requested morning visit' })
  @IsOptional()
  @IsString()
  @Expose()
  notes?: string;

  // Read-only field (populated by service)
  @ApiPropertyOptional({ description: 'Set on create and update (also serves as completion timestamp)' })
  @IsOptional()
  @IsDateString()
  @Expose()
  lastUpdatedAt?: string;
}

/**
 * DTO for updating a followup (all fields optional)
 */
export class UpdatePropertyFollowupDto extends PartialType(PropertyFollowupDto) {}
