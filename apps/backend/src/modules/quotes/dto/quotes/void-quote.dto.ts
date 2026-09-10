import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

/**
 * DTO for voiding a quote.
 *
 * The reason is required, not optional. A void is the only trace left of a
 * price we put in front of a customer and then took back, and the customer
 * still holds the PDF - so "why" is the whole value of the record. Six months
 * on, `voidReason` is what answers "we quoted them 4.2 lakh, what happened?".
 *
 * 500 is the column width on `quotes.void_reason`; the floor stops a reason of
 * "x" from passing for one.
 */
export class VoidQuoteDto {
  @ApiProperty({
    example: 'Wrong roof area used - customer re-measured at 42 sq m',
    description: 'Why this quote is being withdrawn. Stored on the quote as its permanent record.',
    minLength: 5,
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @Length(5, 500)
  reason!: string;
}
