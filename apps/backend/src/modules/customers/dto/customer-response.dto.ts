import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerStatus } from '@oneohm-epc/shared-types';
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

  // ==================== Personal Info ====================
  @ApiProperty()
  @Expose()
  firstName!: string;

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
}
