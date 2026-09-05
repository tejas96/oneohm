import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

/**
 * One job in a field rep's site queue.
 *
 * Deliberately flat, and deliberately not a followup. The row is a sentence
 * assembled from both sides — the followup knows WHEN, the property knows
 * WHERE, whose and how big — and a phone should not have to fetch two
 * paginated endpoints and join them to draw one line of text, over the same
 * weak connection that is the reason the rep is standing outside.
 */
export class SiteWorkItemDto {
  @ApiProperty()
  @Expose()
  followupId!: string;

  @ApiProperty({ enum: ['visit', 'survey'] })
  @Expose()
  kind!: 'visit' | 'survey';

  @ApiProperty()
  @Expose()
  scheduledAt!: Date;

  @ApiProperty()
  @Expose()
  propertyId!: string;

  @ApiPropertyOptional()
  @Expose()
  propertyName?: string;

  @ApiPropertyOptional()
  @Expose()
  address?: string;

  @ApiPropertyOptional()
  @Expose()
  city?: string;

  @ApiProperty()
  @Expose()
  customerId!: string;

  @ApiPropertyOptional()
  @Expose()
  customerName?: string;

  @ApiPropertyOptional()
  @Expose()
  customerPhone?: string;

  /** From the latest quote version, so the rep knows the size before arriving. */
  @ApiPropertyOptional()
  @Expose()
  systemSizeKw?: number;

  /**
   * Lets a survey row say "site visit not marked done" without a second call.
   *
   * Context, never a block: completing a survey closes an open visit in the
   * same call, so the surveyor needs to know it will happen, not to be stopped.
   */
  @ApiProperty()
  @Expose()
  siteVisitDone!: boolean;

  @ApiProperty()
  @Expose()
  surveyDone!: boolean;

  @ApiPropertyOptional()
  @Expose()
  gpsCoordinates?: Record<string, unknown>;
}
