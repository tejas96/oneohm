import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuoteStatus } from '@tejas96/shared/types';
import { Exclude, Expose } from 'class-transformer';

/**
 * Which of the journey's steps are on record — for one site, or OR-ed over a
 * customer's sites. The stage says how far it got; these say what actually
 * happened on the way. Mirrors `JourneySteps` in the shared types.
 */
@Exclude()
export class JourneyStepsDto {
  @ApiProperty({ description: 'A survey or a site visit is marked done' })
  @Expose()
  surveyed!: boolean;

  @ApiProperty({ description: 'A live quote exists, or a quote went out' })
  @Expose()
  quoted!: boolean;

  @ApiProperty({
    description: 'The deal quote went out (sent, viewed, expired, rejected or accepted)',
  })
  @Expose()
  quoteSent!: boolean;

  @ApiProperty({ description: 'Converted, a live accepted quote, or a project that counts' })
  @Expose()
  won!: boolean;

  @ApiProperty({ description: 'Meter installed, or the project is completed' })
  @Expose()
  commissioned!: boolean;
}

/**
 * The quote a site's stage was read from — the quote list's pick for the site:
 * a live accepted quote, else the newest live quote, else the newest voided
 * one. Mirrors `SiteDealQuote` in the shared types.
 */
@Exclude()
export class SiteDealQuoteDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  number!: string;

  @ApiProperty({ enum: QuoteStatus })
  @Expose()
  status!: QuoteStatus;

  @ApiProperty({ description: 'Voided: history, not the current quote' })
  @Expose()
  voided!: boolean;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description: 'Final price of its latest version, in rupees',
  })
  @Expose()
  finalPrice!: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  @Expose()
  systemSizeKw!: number | null;
}
