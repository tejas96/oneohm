import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LossReason } from '@tejas96/shared/types';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

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

  @ApiPropertyOptional({
    enum: LossReason,
    description:
      'Picklist reason. Optional so the current mobile build keeps working; ' +
      'missing values are stored as OTHER until the mobile picklist ships.',
  })
  @IsOptional()
  @IsEnum(LossReason)
  lossReason?: LossReason;
}
