import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

/**
 * Query for `GET /quote-calculator/config`.
 *
 * The endpoint took no query parameters at all until the payment schedule
 * needed resolving per property, so this DTO exists for one field. Note that
 * declaring it also starts validating the query string: with
 * `forbidNonWhitelisted`, anything other than `propertyId` is now a 400 rather
 * than being ignored.
 */
export class QuoteConfigQueryDto {
  @ApiPropertyOptional({
    description:
      'Resolve the payment schedule for this property. A financed property returns the loan schedule ' +
      'in `paymentMilestones` and sets `isLoanSchedule`. Omit it and the self-financed default is returned.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsOptional()
  propertyId?: string;
}
