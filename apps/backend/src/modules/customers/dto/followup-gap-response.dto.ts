import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * An open lead unit that nobody currently owes an action.
 *
 * A `property` row is a site still in play; a `customer` row is an enquiry that
 * never got a site — usually an onboarding wizard abandoned partway.
 */
export class FollowupGapResponseDto {
  @ApiProperty({ enum: ['customer', 'property'] })
  kind!: 'customer' | 'property';

  @ApiProperty({ format: 'uuid' })
  customerId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  propertyId!: string | null;

  @ApiProperty({ description: 'Property name, or the customer full name' })
  name!: string;

  @ApiPropertyOptional({ nullable: true, description: 'Null for customer lead units' })
  leadTemperature!: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Last completed assignee, else the record creator',
  })
  attributedUserId!: string | null;
}
