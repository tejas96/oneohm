import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ConnectionType,
  LeadTemperature,
  type GpsCoordinates,
  type StoredChangeRequest,
  PropertyStatus,
  PropertyType,
  QuoteStatus,
  type ShadingAnalysis,
  SiteStatus,
  type SurveyData,
} from '@tejas96/shared/types';
import { Exclude, Expose, Transform, Type } from 'class-transformer';

import { PropertyDocumentDto } from './property-document.dto';
import { toNum } from '../../../common/utils';
import { DiscomResponseDto } from '../../discoms/dto/discom-response.dto';
import { ProjectResponseDto } from '../../projects/dto/projects/project-response.dto';
import { QuoteResponseDto } from '../../quotes/dto/quotes/quote-response.dto';

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

  @ApiPropertyOptional({ description: 'GPS coordinates of the installation site' })
  @Expose()
  @Transform(({ obj }) => obj.gpsCoordinates)
  gpsCoordinates?: GpsCoordinates;

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
  discomId?: string;

  @ApiPropertyOptional({ type: () => DiscomResponseDto })
  @Expose()
  @Type(() => DiscomResponseDto)
  discom?: DiscomResponseDto;

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

  @ApiPropertyOptional({
    description: 'Change-of-request items captured at property creation',
    type: 'array',
  })
  @Expose()
  @Transform(({ key, obj }) => (obj as Record<string, unknown>)[key])
  changeRequests?: StoredChangeRequest[];

  // ==================== Site Visit / Survey ====================
  @ApiProperty({ enum: SiteStatus })
  @Expose()
  siteStatus!: SiteStatus;

  @ApiProperty()
  @Expose()
  siteVisitDone!: boolean;

  @ApiPropertyOptional()
  @Expose()
  @Transform(({ value }) => toNum(value))
  availableRoofAreaSqft?: number;

  @ApiPropertyOptional()
  @Expose()
  @Transform(({ key, obj }) => (obj as Record<string, unknown>)[key])
  shadingAnalysis?: ShadingAnalysis;

  @ApiPropertyOptional()
  @Expose()
  siteNotes?: string;

  @ApiProperty()
  @Expose()
  surveyDone!: boolean;

  @ApiPropertyOptional()
  @Expose()
  @Transform(({ key, obj }) => (obj as Record<string, unknown>)[key])
  surveyData?: SurveyData;

  @ApiPropertyOptional()
  @Expose()
  siteVisitAssignee?: string;

  @ApiPropertyOptional()
  @Expose()
  siteSurveyAssignee?: string;

  @ApiPropertyOptional()
  @Expose()
  siteVisitCompletedAt?: Date;

  @ApiPropertyOptional()
  @Expose()
  siteSurveyCompletedAt?: Date;

  @ApiPropertyOptional()
  @Expose()
  @Transform(({ obj }) => obj.projectId ?? obj.project?.id ?? undefined)
  projectId?: string;

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

  // ==================== Assignee Names ====================
  @ApiPropertyOptional({
    description: 'Name of the user assigned to the site visit',
    example: 'John Doe',
  })
  @Expose()
  @Transform(({ obj }) => {
    if (!obj.siteVisitAssignee) return undefined;
    if (!obj.siteVisitAssigneeUser) return undefined;
    const firstName = obj.siteVisitAssigneeUser.firstName || '';
    const lastName = obj.siteVisitAssigneeUser.lastName || '';
    return `${firstName} ${lastName}`.trim() || undefined;
  })
  siteVisitAssigneeName?: string;

  @ApiPropertyOptional({
    description: 'Name of the user assigned to the site survey',
    example: 'Jane Smith',
  })
  @Expose()
  @Transform(({ obj }) => {
    if (!obj.siteSurveyAssignee) return undefined;
    if (!obj.siteSurveyAssigneeUser) return undefined;
    const firstName = obj.siteSurveyAssigneeUser.firstName || '';
    const lastName = obj.siteSurveyAssigneeUser.lastName || '';
    return `${firstName} ${lastName}`.trim() || undefined;
  })
  siteSurveyAssigneeName?: string;

  // ==================== Quote Info (enriched from quotes table) ====================
  @ApiPropertyOptional({
    description: 'Latest quote ID for this property',
  })
  @Expose()
  latestQuoteId?: string;

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

  @ApiPropertyOptional({
    description: 'Final price from the current version of the latest quote (before subsidy)',
    example: 450000,
  })
  @Expose()
  @Transform(({ value }) => toNum(value))
  latestQuoteFinalPrice?: number;

  @ApiPropertyOptional({
    description: 'System size in kW from the current version of the latest quote',
    example: 4.08,
  })
  @Expose()
  @Transform(({ value }) => toNum(value))
  latestQuoteSystemSizeKw?: number;

  @ApiPropertyOptional({
    description: 'Whether the property has an active (initiated/applied) loan application',
  })
  @Expose()
  hasActiveLoan?: boolean;

  @ApiPropertyOptional({ type: () => ProjectResponseDto })
  @Expose()
  @Type(() => ProjectResponseDto)
  project?: ProjectResponseDto;

  @ApiPropertyOptional({ type: () => [QuoteResponseDto] })
  @Expose()
  @Type(() => QuoteResponseDto)
  quotes?: QuoteResponseDto[];
}
