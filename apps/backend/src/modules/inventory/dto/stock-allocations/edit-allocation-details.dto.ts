import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

/**
 * DTO for editing non-quantity allocation metadata.
 * Quantity changes MUST go through domain methods (create/cancel/fulfill/return).
 */
export class EditAllocationDetailsDto {
  @ApiProperty({ example: 'Site access confirmed', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ example: '2024-12-15', required: false })
  @IsDateString()
  @IsOptional()
  expectedDispatchDate?: string;
}
