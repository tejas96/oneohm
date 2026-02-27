import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FollowupPriority, FollowupStatus, FollowupType } from '@oneohm-epc/shared-types';
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
  @ApiProperty({ description: 'Organization ID' })
  organizationId!: string;

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
