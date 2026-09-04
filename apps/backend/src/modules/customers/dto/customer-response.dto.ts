import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerStatus } from '@tejas96/shared/types';
import { Exclude, Expose, Transform, Type } from 'class-transformer';

import { CustomerPropertyResponseDto } from './customer-property-response.dto';
import { toNum } from '../../../common/utils';

/**
 * Aggregate view of a customer's installation sites.
 *
 * Computed server-side (`CustomerProfileRepository.getSitePortfolioSummaries`)
 * so the CRM list can render the "Site portfolio" column — count, capacity,
 * status distribution and quoted value — from the page payload alone, instead
 * of firing one properties request per visible row.
 */
@Exclude()
export class SitePortfolioDto {
  @ApiProperty({ description: 'Non-deleted sites belonging to this customer' })
  @Expose()
  siteCount!: number;

  @ApiProperty({
    description: 'Site counts keyed by PropertyStatus — drives the distribution bar',
    example: { active: 3, converted: 4 },
  })
  @Expose()
  statusCounts!: Record<string, number>;

  @ApiProperty({ description: 'Sites with status = converted' })
  @Expose()
  convertedCount!: number;

  @ApiProperty({ description: 'Sites that have at least one quote' })
  @Expose()
  quotedSiteCount!: number;

  @ApiProperty({
    description:
      'Total system size (kW) across each site’s current quote version. Prefers the ' +
      'modules actually selected during quote calculation over the quote’s declared size.',
    example: 27.5,
  })
  @Expose()
  @Transform(({ value }) => toNum(value) ?? 0)
  totalSystemSizeKw!: number;

  @ApiProperty({
    description:
      'What the customer’s sites are worth: a converted site at its contract, ' +
      'everything else at its current quote version',
    example: 1845200,
  })
  @Expose()
  @Transform(({ value }) => toNum(value) ?? 0)
  totalPortfolioAmount!: number;
}

/**
 * Company-wide CRM roll-up for the customer list's KPI cards.
 */
export class CustomerOverviewStatsDto {
  @ApiProperty()
  customers!: number;

  @ApiProperty({ description: 'Customers created since the start of the current month' })
  customersThisMonth!: number;

  @ApiProperty()
  sites!: number;

  @ApiProperty({ description: 'Sites created since the start of the current month' })
  sitesThisMonth!: number;

  @ApiProperty({
    description: 'Quoted value of sites still in play — quote sent/viewed and not yet converted',
  })
  pipelineValue!: number;

  @ApiProperty({ description: 'Sites whose latest quote is sent/viewed and unanswered' })
  awaitingReply!: number;

  @ApiProperty({ description: 'Of those, unanswered for more than 7 days' })
  awaitingAgeing!: number;
}

/**
 * DTO for customer profile response
 * Used in API responses to control what data is exposed
 */
@Exclude()
export class CustomerResponseDto {
  @ApiProperty()
  @Expose()
  id!: string;

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
  @Transform(({ obj }) => obj.propertyCount ?? obj.properties?.length ?? 0)
  propertyCount!: number;

  /**
   * Open or in-progress service tickets. Drives the active-tickets chip on the
   * customers list; 0 on single-customer reads, which do not compute it.
   */
  @ApiProperty({ description: 'Number of open or in-progress service tickets' })
  @Expose()
  @Transform(({ obj }) => obj.activeTicketCount ?? 0)
  activeTicketCount!: number;

  /**
   * Present on list responses; omitted on single-customer reads, which have no
   * portfolio column to fill and would pay for the aggregate for nothing.
   */
  @ApiPropertyOptional({
    type: () => SitePortfolioDto,
    description: 'Aggregate of this customer’s sites (list responses only)',
  })
  @Expose()
  @Type(() => SitePortfolioDto)
  sitePortfolio?: SitePortfolioDto;

  @ApiPropertyOptional({
    type: [String],
    description: 'Reasons this customer cannot be permanently deleted (empty when deletable)',
  })
  @Expose()
  deleteBlockReasons?: string[];

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
