import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ConnectionType,
  LeadTemperature,
  PropertyStatus,
  PropertyType,
  QuoteStatus,
} from '@oneohm-epc/shared-types';
import { Exclude, Expose, Type } from 'class-transformer';

import { PropertyDocumentDto } from './property-document.dto';

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
