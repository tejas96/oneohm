import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * DTO for payment milestone
 */
export class PaymentMilestoneDto {
  @ApiProperty({
    example: 'advance',
    description: 'Milestone stage identifier (free-form string)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  stage!: string;

  @ApiProperty({
    example: 'Advance Payment',
    description: 'Milestone display name',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({
    example: 30,
    description: 'Percentage of total price',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  @IsNotEmpty()
  percentage!: number;

  @ApiProperty({
    example: 150000.0,
    description: 'Calculated amount in INR',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsNotEmpty()
  amount!: number;

  @ApiPropertyOptional({
    example: '2025-01-15',
    description: 'Expected/due date (ISO format)',
  })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({
    example: 'To be paid upon order confirmation',
    description: 'Description or conditions for this milestone',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 1,
    description: 'Display order',
  })
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  order!: number;
}
