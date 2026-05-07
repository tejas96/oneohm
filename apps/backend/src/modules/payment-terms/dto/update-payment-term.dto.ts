import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

/**
 * DTO for editing a payment term. Status is intentionally absent — see the
 * dedicated /:id/waive and /:id/cancel actions and the receipts service
 * which manages status transitions via aggregation.
 */
export class UpdatePaymentTermDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  displayOrder?: number;

  @ApiPropertyOptional({ description: 'Expected amount (must be > 0)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @IsOptional()
  @Type(() => Number)
  expectedAmount?: number;

  @ApiPropertyOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  expectedPercentage?: number;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    description:
      'Optimistic concurrency token. Send the version returned by the last GET; the server will reject mismatches with 409.',
  })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  version?: number;
}
