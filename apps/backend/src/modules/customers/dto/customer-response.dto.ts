import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerStatus } from '@oneohm-epc/shared-types';
import { Exclude, Expose } from 'class-transformer';

/**
 * DTO for customer response
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

  // ==================== Consumer Details ====================
  @ApiPropertyOptional()
  @Expose()
  consumerNumber?: string;

  @ApiPropertyOptional()
  @Expose()
  consumerName?: string;

  @ApiPropertyOptional()
  @Expose()
  currentLoad?: string;

  // ==================== Address ====================
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

  @ApiPropertyOptional()
  @Expose()
  locationCoordinates?: string;

  // ==================== Property Details ====================
  @ApiPropertyOptional()
  @Expose()
  propertyName?: string;

  @ApiPropertyOptional()
  @Expose()
  propertyType?: string;

  // ==================== Source Tracking ====================
  @ApiPropertyOptional()
  @Expose()
  leadSource?: string;

  @ApiPropertyOptional()
  @Expose()
  referralCode?: string;

  @ApiPropertyOptional()
  @Expose()
  resellerId?: string;

  // ==================== Status ====================
  @ApiProperty({ enum: CustomerStatus })
  @Expose()
  status!: CustomerStatus;

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
