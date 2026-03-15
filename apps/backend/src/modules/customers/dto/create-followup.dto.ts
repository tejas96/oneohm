import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FollowupPriority, FollowupStatus, FollowupType } from '@oneohm-epc/shared/types';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/**
 * Create Followup DTO
 * Input validation for creating a new followup
 */
export class CreateFollowupDto {
  @ApiProperty({
    description: 'Customer ID for this followup',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  customerId!: string;

  @ApiPropertyOptional({
    description: 'Property ID (optional - for property-level followups)',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiProperty({
    description: 'Type of followup',
    enum: FollowupType,
    example: FollowupType.VISIT,
  })
  @IsEnum(FollowupType)
  @IsNotEmpty()
  type!: FollowupType;

  @ApiProperty({
    description: 'Subject/title of the followup',
    example: 'Site measurement visit',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  subject!: string;

  @ApiProperty({
    description: 'Scheduled date and time (ISO 8601 format)',
    example: '2026-02-20T10:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  scheduledAt!: string;

  @ApiProperty({
    description: 'User ID assigned to this followup',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsUUID()
  @IsNotEmpty()
  assignedToUserId!: string;

  @ApiPropertyOptional({
    description: 'Priority level',
    enum: FollowupPriority,
    default: FollowupPriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(FollowupPriority)
  priority?: FollowupPriority;

  @ApiPropertyOptional({
    description: 'Initial status (defaults to pending)',
    enum: FollowupStatus,
    default: FollowupStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(FollowupStatus)
  status?: FollowupStatus;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Customer requested morning visit',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
