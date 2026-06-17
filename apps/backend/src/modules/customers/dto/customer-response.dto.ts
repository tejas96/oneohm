import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerStatus } from '@tejas96/shared/types';
import { Exclude, Expose, Transform, Type } from 'class-transformer';

import { CustomerPropertyResponseDto } from './customer-property-response.dto';

/**
 * DTO for customer profile response
 * Used in API responses to control what data is exposed
 */
@Exclude()
export class CustomerResponseDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  organizationId!: string;

  @ApiPropertyOptional()
  @Expose()
  userId?: string;

  @ApiPropertyOptional()
  @Expose()
  customerCode?: string;

  // ==================== Personal Info ====================
  @ApiProperty()
  @Expose()
  firstName!: string;

  @ApiPropertyOptional()
  @Expose()
  middleName?: string;

  @ApiPropertyOptional()
  @Expose()
  lastName?: string;

  @ApiPropertyOptional()
  @Expose()
  email?: string;

  @ApiProperty()
  @Expose()
  phone!: string;

  @ApiPropertyOptional()
  @Expose()
  alternatePhone?: string;

  // ==================== Address (Billing/Mailing) ====================
  @ApiPropertyOptional()
  @Expose()
  address?: string;

  @ApiPropertyOptional()
  @Expose()
  city?: string;

  @ApiPropertyOptional()
  @Expose()
  state?: string;

  @ApiPropertyOptional()
  @Expose()
  country?: string;

  @ApiPropertyOptional()
  @Expose()
  pincode?: string;

  // ==================== Source Tracking ====================
  @ApiPropertyOptional()
  @Expose()
  leadSource?: string;

  @ApiPropertyOptional()
  @Expose()
  referralCode?: string;

  // ==================== Customer Group ====================
  @ApiPropertyOptional()
  @Expose()
  groupCode?: string;

  @ApiPropertyOptional()
  @Expose()
  groupName?: string;

  // ==================== Status ====================
  @ApiProperty({ enum: CustomerStatus })
  @Expose()
  status!: CustomerStatus;

  // ==================== Properties (One-to-Many) ====================
  @ApiPropertyOptional({ type: [CustomerPropertyResponseDto] })
  @Expose()
  @Type(() => CustomerPropertyResponseDto)
  properties?: CustomerPropertyResponseDto[];

  /**
   * Count of properties for this customer
   * Computed from properties array length
   */
  @ApiProperty({ description: 'Number of properties associated with this customer' })
  @Expose()
  @Transform(({ obj }) => obj.properties?.length ?? 0)
  propertyCount!: number;

  // ==================== Audit Fields ====================
  @ApiProperty()
  @Expose()
  createdAt!: Date;

  @ApiProperty()
  @Expose()
  updatedAt!: Date;

  @ApiPropertyOptional()
  @Expose()
  createdBy?: string;

  @ApiPropertyOptional()
  @Expose()
  updatedBy?: string;

  /**
   * Name of the user who created this customer
   * Returns 'Self' if customer self-registered (userId === createdBy)
   */
  @ApiPropertyOptional({
    description: 'Name of the user who created this customer, or "Self" if self-registered',
  })
  @Expose()
  @Transform(({ obj }) => {
    // If no createdBy (legacy data or system-created), return undefined
    if (!obj.createdBy) return undefined;

    // If customer self-registered (userId matches createdBy), return 'Self'
    // Both must be truthy for a valid comparison
    if (obj.userId && obj.createdBy && obj.userId === obj.createdBy) {
      return 'Self';
    }

    // If creator relation wasn't loaded or doesn't exist, return undefined
    if (!obj.creator) return undefined;

    // Return creator's full name
    const firstName = obj.creator.firstName || '';
    const lastName = obj.creator.lastName || '';
    return `${firstName} ${lastName}`.trim() || undefined;
  })
  creatorName?: string;

  // ==================== Assignee ====================

  @ApiPropertyOptional({ description: 'ID of the user this customer is assigned to' })
  @Expose()
  assigneeId?: string;

  @ApiPropertyOptional({ description: 'Full name of the assigned user' })
  @Expose()
  @Transform(({ obj }) => {
    if (!obj.assigneeId || !obj.assignee) return undefined;
    const firstName = obj.assignee.firstName || '';
    const lastName = obj.assignee.lastName || '';
    return `${firstName} ${lastName}`.trim() || undefined;
  })
  assigneeName?: string;
}
