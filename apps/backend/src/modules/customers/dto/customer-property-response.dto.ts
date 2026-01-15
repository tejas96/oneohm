import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ConnectionType,
  LeadTemperature,
  PropertyStatus,
  PropertyType,
} from '@oneohm-epc/shared-types';
import { Exclude, Expose } from 'class-transformer';

/**
 * DTO for customer property response
 * Used in API responses to control what data is exposed
 */
@Exclude()
export class CustomerPropertyResponseDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  customerId!: string;

  @ApiProperty()
  @Expose()
  organizationId!: string;

  // ==================== Property Details ====================
  @ApiPropertyOptional()
  @Expose()
  propertyName?: string;

  @ApiProperty({ enum: PropertyType })
  @Expose()
  propertyType!: PropertyType;

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

  // ==================== Electricity/Consumer Details ====================
  @ApiPropertyOptional()
  @Expose()
  consumerNumber?: string;

  @ApiPropertyOptional()
  @Expose()
  consumerName?: string;

  @ApiPropertyOptional()
  @Expose()
  currentLoad?: string;

  @ApiPropertyOptional()
  @Expose()
  discomName?: string;

  @ApiPropertyOptional({ enum: ConnectionType })
  @Expose()
  connectionType?: ConnectionType;

  @ApiPropertyOptional()
  @Expose()
  sanctionedLoad?: number;

  @ApiPropertyOptional()
  @Expose()
  meterNumber?: string;

  // ==================== Site Details ====================
  @ApiPropertyOptional()
  @Expose()
  monthlyBill?: number;

  @ApiPropertyOptional()
  @Expose()
  roofAreaSqft?: number;

  // ==================== Lead Tracking ====================
  @ApiProperty({ enum: LeadTemperature })
  @Expose()
  leadTemperature!: LeadTemperature;

  @ApiPropertyOptional()
  @Expose()
  nextFollowUpDate?: Date;

  @ApiPropertyOptional()
  @Expose()
  lastContactDate?: Date;

  @ApiPropertyOptional()
  @Expose()
  followUpNotes?: string;

  // ==================== Flags ====================
  @ApiProperty()
  @Expose()
  isPrimary!: boolean;

  @ApiProperty({ description: 'Customer wants loan financing for this property' })
  @Expose()
  wantsLoan!: boolean;

  // ==================== Status ====================
  @ApiProperty({ enum: PropertyStatus })
  @Expose()
  status!: PropertyStatus;

  // ==================== Notes ====================
  @ApiPropertyOptional()
  @Expose()
  notes?: string;

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
