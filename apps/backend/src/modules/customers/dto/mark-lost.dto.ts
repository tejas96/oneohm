import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * The reason is required, and captured at the moment someone knows it rather
 * than reconstructed later.
 */
export class MarkLostDto {
  @ApiProperty({ example: 'Competitor pricing' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
