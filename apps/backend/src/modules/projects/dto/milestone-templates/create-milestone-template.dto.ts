import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * DTO for creating a milestone template
 */
export class CreateMilestoneTemplateDto {
  @ApiProperty({ description: 'Organization ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({ description: 'Template name', example: 'Design & Engineering', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Template code', example: 'MS-DESIGN-001', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  code: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Milestone type', example: 'design', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  type: string;

  @ApiPropertyOptional({ description: 'Requires payment', example: true, default: false })
  @IsBoolean()
  @IsOptional()
  requiresPayment?: boolean;

  @ApiPropertyOptional({
    description: 'Default payment percentage (0-100)',
    example: 25.5,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  defaultPaymentPercentage?: number;

  @ApiProperty({ description: 'Sequence order', example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  @Type(() => Number)
  sequenceOrder: number;

  @ApiPropertyOptional({ description: 'Is mandatory', example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isMandatory?: boolean;

  @ApiPropertyOptional({ description: 'Can skip', example: false, default: false })
  @IsBoolean()
  @IsOptional()
  canSkip?: boolean;

  @ApiPropertyOptional({ description: 'Depends on milestone codes', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  dependsOnMilestoneCodes?: string[];

  @ApiPropertyOptional({ description: 'Estimated duration in days', example: 30, minimum: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  estimatedDurationDays?: number;

  @ApiPropertyOptional({ description: 'Is active', example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Created by user ID' })
  @IsUUID()
  @IsOptional()
  createdBy?: string;
}
