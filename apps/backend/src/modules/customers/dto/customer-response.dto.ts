import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerStatus } from '@tejas96/shared/types';
import { Exclude, Expose, Transform, Type } from 'class-transformer';

import { CustomerPropertyResponseDto } from './customer-property-response.dto';
import { NextFollowupDto } from './next-followup.dto';
import { JourneyStepsDto } from './site-journey.dto';
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
      'Total system size (kW) across each site’s DEAL quote (live accepted, else newest ' +
      'live, else newest voided — the quote the journey and the site panel show), at its ' +
      'current version. Prefers the modules actually selected during quote calculation ' +
      'over the quote’s declared size.',
    example: 27.5,
  })
  @Expose()
  @Transform(({ value }) => toNum(value) ?? 0)
  totalSystemSizeKw!: number;

  @ApiProperty({
    description:
      'What the customer’s sites are worth: a site with a live project at its contract, ' +
      'everything else at its DEAL quote (live accepted, else newest live, else newest ' +
      'voided) at its current version',
    example: 1845200,
  })
  @Expose()
  @Transform(({ value }) => toNum(value) ?? 0)
  totalPortfolioAmount!: number;
}

/**
 * A customer's sites rolled up onto the six-step journey (Lead captured →
 * Survey done → Quote drafted → Quote sent → Won → Commissioned).
 *
 * Rolled up from the per-site rows of the one SQL rule
 * (`sql/site-journey.sql.ts`), the same rows the customer's site list
 * publishes. Mirrors `CustomerJourney` in the shared types.
 */
@Exclude()
export class CustomerJourneyDto {
  @ApiProperty({ description: 'Non-deleted sites; 0 means no site yet' })
  @Expose()
  siteCount!: number;

  @ApiProperty({
    description:
      'Step reached, 0–5: the highest among sites still in play, or — when lost — ' +
      'the highest any site reached',
    minimum: 0,
    maximum: 5,
  })
  @Expose()
  stageIndex!: number;

  @ApiProperty({
    description: 'Every site is lost, or the customer is marked lost and has sites',
  })
  @Expose()
  lost!: boolean;

  @ApiProperty({
    type: [Number],
    description: 'Sites still in play at each of the six steps',
    example: [0, 1, 0, 2, 1, 0],
  })
  @Expose()
  stageCounts!: number[];

  @ApiProperty({ description: 'Sites that are lost' })
  @Expose()
  lostSites!: number;

  @ApiProperty({
    type: () => JourneyStepsDto,
    description:
      'Each step fact OR-ed over the sites the stage was read from: the sites in play, ' +
      'or every site when lost',
  })
  @Expose()
  @Type(() => JourneyStepsDto)
  steps!: JourneyStepsDto;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'The reason on the most recently lost site; null when none was recorded',
  })
  @Expose()
  lostReason!: string | null;
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
/**
 * One person attached to a customer's followups, as the CRM avatar column shows
 * them.
 *
 * `live` is the whole point of the field. Somebody who still owes a call and
 * somebody who merely closed the last one are both "assigned", and rendering
 * them identically would leave the column unable to answer which sites actually
 * need chasing.
 */
export class FollowupAssigneeDto {
  @ApiProperty()
  @Expose()
  userId!: string;

  @ApiProperty()
  @Expose()
  firstName!: string;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  lastName?: string | null;

  @ApiProperty({
    description: 'True while they still owe work; false when they only closed it last',
  })
  @Expose()
  live!: boolean;
}

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

  /**
   * Single-record reads/writes only (get by id, create, update, ...). Stripped
   * from the paginated list — see `groups: ['detail']` at the `toDto` call
   * sites in `CustomerController` vs. the group-less `toPaginatedResponse`
   * call in `findAll`.
   */
  @ApiPropertyOptional()
  @Expose({ groups: ['detail'] })
  aadhaarNumber?: string;

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

  @ApiPropertyOptional({
    description: 'The reseller (employee_profiles.id) who brought in this customer',
    nullable: true,
  })
  @Expose()
  resellerId?: string | null;

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

  /**
   * Everyone on the hook across this customer and all its sites, deduped, live
   * first. The collapsed CRM row shows these; expanding splits them back apart.
   */
  @ApiPropertyOptional({
    type: [FollowupAssigneeDto],
    description: 'Followup assignees across this customer and its sites (list responses only)',
  })
  @Expose()
  @Type(() => FollowupAssigneeDto)
  followupAssignees?: FollowupAssigneeDto[];

  /**
   * Only the customer's own followups. The expanded CRM row shows these, so the
   * parent stops claiming people who belong to one specific site.
   */
  @ApiPropertyOptional({
    type: [FollowupAssigneeDto],
    description: 'Followup assignees on the customer itself, excluding its sites',
  })
  @Expose()
  @Type(() => FollowupAssigneeDto)
  ownFollowupAssignees?: FollowupAssigneeDto[];

  /**
   * The four below are on list responses only, computed for the page's
   * customers in two queries. Single-customer reads omit them.
   */
  @ApiPropertyOptional({
    type: () => CustomerJourneyDto,
    description: 'Where this customer’s sites stand on the six-step journey (list responses only)',
  })
  @Expose()
  @Type(() => CustomerJourneyDto)
  journey?: CustomerJourneyDto;

  /**
   * The same predicate the list's "needs follow-up" filter applies, evaluated
   * for this row — so a row and the filter that returned it cannot disagree.
   */
  @ApiPropertyOptional({
    description:
      'An open site, or a site-less lead, with no pending followup (list responses only)',
  })
  @Expose()
  needsFollowup?: boolean;

  @ApiPropertyOptional({
    description:
      'Pending followups on this customer and its non-deleted sites (list responses only)',
  })
  @Expose()
  pendingFollowupCount?: number;

  @ApiPropertyOptional({
    type: () => NextFollowupDto,
    nullable: true,
    description: 'The earliest of those; null when nothing is pending (list responses only)',
  })
  @Expose()
  @Type(() => NextFollowupDto)
  nextFollowup?: NextFollowupDto | null;

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

  @ApiPropertyOptional({
    description:
      'Full name of the assigned user. Also set when that user is archived ' +
      '(see assigneeArchived) — the customer is still assigned.',
  })
  @Expose()
  @Transform(({ obj }) => {
    if (!obj.assigneeId) return undefined;
    // An archived user is left out of the join; the service supplies the name.
    if (!obj.assignee) return obj.archivedAssigneeName || undefined;
    const firstName = obj.assignee.firstName || '';
    const lastName = obj.assignee.lastName || '';
    return `${firstName} ${lastName}`.trim() || undefined;
  })
  assigneeName?: string;

  @ApiPropertyOptional({
    description:
      'The assigned user is archived. Show the name as archived; do not treat the ' +
      'customer as unassigned.',
  })
  @Expose()
  @Transform(({ obj }) => Boolean(obj.assigneeId && !obj.assignee && obj.archivedAssigneeName))
  assigneeArchived?: boolean;
}
