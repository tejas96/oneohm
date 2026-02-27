import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ConnectionType,
  LeadTemperature,
  PropertyStatus,
  PropertyType,
  QuoteStatus,
} from '@oneohm-epc/shared-types';
import { Exclude, Expose, Transform, Type } from 'class-transformer';

import { PropertyDocumentDto } from './property-document.dto';
import { toNum } from '../../../common/utils';

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

  @ApiPropertyOptional()
  @Expose()
  propertyCode?: string;

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
  @Transform(({ value }) => toNum(value))
  sanctionedLoad?: number;

  @ApiPropertyOptional()
  @Expose()
  meterNumber?: string;

  // ==================== Site Details ====================
  @ApiPropertyOptional()
  @Expose()
  @Transform(({ value }) => toNum(value))
  monthlyBill?: number;

  // ==================== Lead Tracking ====================
  @ApiProperty({ enum: LeadTemperature })
  @Expose()
  leadTemperature!: LeadTemperature;

  // ==================== Flags ====================
  @ApiProperty()
  @Expose()
  isPrimary!: boolean;

  @ApiProperty({ description: 'Customer wants loan financing for this property' })
  @Expose()
  wantsLoan!: boolean;

  // ==================== Documents ====================
  @ApiPropertyOptional({
    description: 'Property-level documents (identity docs, KYC, etc.)',
    type: [PropertyDocumentDto],
  })
  @Expose()
  @Type(() => PropertyDocumentDto)
  documents!: PropertyDocumentDto[];

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

  // ==================== Customer Info (populated from customer relation) ====================

  @ApiPropertyOptional({
    description: 'Customer full name (firstName + lastName from customer profile)',
    example: 'Rajesh Sharma',
  })
  @Expose()
  @Transform(({ obj }) => {
    if (!obj.customer) return undefined;
    const firstName = obj.customer.firstName || '';
    const lastName = obj.customer.lastName || '';
    return `${firstName} ${lastName}`.trim() || undefined;
  })
  customerName?: string;

  @ApiPropertyOptional({
    description: 'Customer phone number (from customer profile)',
    example: '+919876543210',
  })
  @Expose()
  @Transform(({ obj }) => obj.customer?.phone ?? undefined)
  customerPhone?: string;

  @ApiPropertyOptional({
    description: 'Customer email address (from customer profile)',
    example: 'rajesh@example.com',
  })
  @Expose()
  @Transform(({ obj }) => obj.customer?.email ?? undefined)
  customerEmail?: string;

  // ==================== Creator Info (populated from creator relation) ====================

  /**
   * Name of the user who created this property
   */
  @ApiPropertyOptional({
    description: 'Name of the user who created this property',
    example: 'Rahul Kumar',
  })
  @Expose()
  @Transform(({ obj }) => {
    if (!obj.createdBy) return undefined;
    if (!obj.creator) return undefined;
    const firstName = obj.creator.firstName || '';
    const lastName = obj.creator.lastName || '';
    return `${firstName} ${lastName}`.trim() || undefined;
  })
  creatorName?: string;

  // ==================== Quote Info (enriched from quotes table) ====================
  @ApiPropertyOptional({
    description: 'Latest quote number for this property',
    example: 'QT-ONEOHM-2026-0001',
  })
  @Expose()
  latestQuoteNumber?: string;

  @ApiPropertyOptional({
    enum: QuoteStatus,
    description: 'Status of the latest quote',
    example: 'sent',
  })
  @Expose()
  latestQuoteStatus?: QuoteStatus;

  @ApiPropertyOptional({
    description: 'Date of the latest quote (official quote date)',
    example: '2026-01-24',
  })
  @Expose()
  latestQuoteDate?: Date;
}
