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

  /**
   * The three below are present only for a site that has become a project, and
   * describe that project as it stands today rather than as it was quoted.
   *
   * `latestQuoteFinalPrice` above is the quote's own value and does not move
   * when material is added on site and billed; the contract does. A screen
   * showing a converted site should read `contractValue` and explain the gap
   * with the other two, the way the projects list does.
   */
  @ApiPropertyOptional({
    description: "The project's contract as it stands: quoted plus every change order",
    example: 1232225.94,
  })
  @Expose()
  @Transform(({ value }) => toNum(value))
  contractValue?: number;

  @ApiPropertyOptional({
    description: 'The part of the contract that came from the signed quote',
    example: 1048738.47,
  })
  @Expose()
  @Transform(({ value }) => toNum(value))
  quotedValue?: number;

  @ApiPropertyOptional({
    description: 'Agreed after signing. quotedValue + changeOrderValue === contractValue',
    example: 183487.47,
  })
  @Expose()
  @Transform(({ value }) => toNum(value))
  changeOrderValue?: number;

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

  // ==================== Follow-up Info (enriched via shared predicate) ====================

  /**
   * Earliest pending followup, or absent when nothing is scheduled.
   *
   * This DTO is @Exclude()-by-default, so a field without @Expose() is silently
   * dropped from every response.
   */
  @Expose()
  @ApiPropertyOptional({ description: 'Earliest pending followup for this site' })
  nextFollowupAt?: Date;

  /**
   * True when this open site has nobody owing it an action.
   *
   * Computed server-side with the shared predicate so the dot cannot disagree
   * with the chip count or the gaps tab.
   *
   * Optional, not required: only endpoints that enrich via the shared batch
   * lookup (findAll, findByCustomer, findById) populate this. Endpoints that
   * return the bare entity (create, update, updateTemperature, markLost,
   * findMyProperties, findByTemperature) leave it undefined, and this DTO is
   * @Exclude()-by-default so an absent value is simply dropped rather than
   * serialized as a lie.
   */
  @Expose()
  @ApiPropertyOptional({ description: 'Open site with no pending followup' })
  needsFollowup?: boolean;
}
