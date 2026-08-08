import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  FollowupOutcome,
  FollowupPriority,
  FollowupStatus,
  FollowupType,
  LeadTemperature,
} from '@tejas96/shared/types';
import { Exclude, Expose, Type } from 'class-transformer';

/**
 * Nested Customer Summary for followup response
 */
@Exclude()
class CustomerSummaryDto {
  @Expose()
  @ApiProperty()
  id!: string;

  @Expose()
  @ApiProperty()
  firstName!: string;

  @Expose()
  @ApiPropertyOptional()
  lastName?: string;

  @Expose()
  @ApiPropertyOptional()
  phone?: string;
}

/**
 * Nested Property Summary for followup response
 */
@Exclude()
class PropertySummaryDto {
  @Expose()
  @ApiProperty()
  id!: string;

  @Expose()
  @ApiPropertyOptional()
  propertyName?: string;

  @Expose()
  @ApiPropertyOptional()
  city?: string;

  /**
   * Drives the next-followup date prefill and the temperature chip.
   *
   * Without it the complete dialog cannot tell a COLD site from a HOT one and
   * silently prefills the customer-lead default, so every prefill on a
   * property-level followup would be wrong.
   */
  @Expose()
  @ApiPropertyOptional({ enum: LeadTemperature })
  leadTemperature?: LeadTemperature;
}

/**
 * Nested User Summary for assigned user
 */
@Exclude()
class UserSummaryDto {
  @Expose()
  @ApiProperty()
  id!: string;

  @Expose()
  @ApiProperty()
  firstName!: string;

  @Expose()
  @ApiPropertyOptional()
  lastName?: string;
}

/**
 * Followup Response DTO
 * Output format for followup API responses
 */
@Exclude()
export class FollowupResponseDto {
  @Expose()
  @ApiProperty({ description: 'Followup ID' })
  id!: string;

  @Expose()
  @ApiProperty({ description: 'Customer ID' })
  customerId!: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Property ID (null for customer-level followups)' })
  propertyId?: string;

  @Expose()
  @ApiProperty({ enum: FollowupType, description: 'Type of followup' })
  type!: FollowupType;

  @Expose()
  @ApiProperty({ description: 'Subject/title' })
  subject!: string;

  @Expose()
  @ApiProperty({ description: 'Scheduled date and time' })
  scheduledAt!: Date;

  @Expose()
  @ApiProperty({ description: 'Assigned user ID' })
  assignedToUserId!: string;

  @Expose()
  @ApiProperty({ enum: FollowupStatus, description: 'Current status' })
  status!: FollowupStatus;

  @Expose()
  @ApiProperty({ enum: FollowupPriority, description: 'Priority level' })
  priority!: FollowupPriority;

  @Expose()
  @ApiPropertyOptional({ description: 'Additional notes' })
  notes?: string;

  /**
   * What actually happened. Null while pending.
   *
   * This DTO is @Exclude()-by-default, so a field without @Expose() is silently
   * dropped from every response — which is what would leave the Outcome column
   * permanently showing a dash.
   */
  @Expose()
  @ApiPropertyOptional({ enum: FollowupOutcome, description: 'Outcome recorded at completion' })
  outcome?: FollowupOutcome;

  @Expose()
  @ApiPropertyOptional({ description: 'When the followup was completed' })
  completedAt?: Date;

  @Expose()
  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: Date;

  @Expose()
  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt!: Date;

  @Expose()
  @ApiPropertyOptional({ description: 'Created by user ID' })
  createdBy?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Updated by user ID' })
  updatedBy?: string;

  // Nested relations
  @Expose()
  @Type(() => CustomerSummaryDto)
  @ApiPropertyOptional({ type: CustomerSummaryDto, description: 'Customer summary' })
  customer?: CustomerSummaryDto;

  @Expose()
  @Type(() => PropertySummaryDto)
  @ApiPropertyOptional({ type: PropertySummaryDto, description: 'Property summary' })
  property?: PropertySummaryDto;

  @Expose()
  @Type(() => UserSummaryDto)
  @ApiPropertyOptional({ type: UserSummaryDto, description: 'Assigned user summary' })
  assignedToUser?: UserSummaryDto;
}
