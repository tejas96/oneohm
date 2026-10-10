import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FollowupType } from '@tejas96/shared/types';
import { Exclude, Expose } from 'class-transformer';

/**
 * The pending follow-up with the earliest scheduled time — on a site, or
 * across a customer and its sites. Mirrors `NextFollowup` in the shared types.
 */
@Exclude()
export class NextFollowupDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty({ enum: FollowupType })
  @Expose()
  type!: FollowupType;

  @ApiProperty()
  @Expose()
  subject!: string;

  @ApiProperty({
    description:
      'Overdue when its day is before today in India; due earlier today is "today", not overdue',
  })
  @Expose()
  scheduledAt!: Date;

  @ApiPropertyOptional({ type: String, nullable: true, description: 'Full name of the assignee' })
  @Expose()
  assigneeName!: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'The site it is on; null for a follow-up on the customer itself',
  })
  @Expose()
  propertyId!: string | null;
}
