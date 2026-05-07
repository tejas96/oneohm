import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

/**
 * DTO for creating a new payment term mid-project.
 *
 * Note: organizationId, projectId, source, and sequence-related fields are
 * supplied by the controller (org from @OrganizationContext, project from
 * the route param). They are deliberately not part of this DTO.
 */
export class CreatePaymentTermDto {
  @ApiProperty({ description: 'Stage identifier (e.g. "advance")', example: 'advance' })
  @IsString()
  @IsNotEmpty()
  stage!: string;

  @ApiProperty({ description: 'Display name shown in UI', example: 'Advance Payment' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'Long-form description / conditions' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Display order (1-based). Defaults to next.' })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  displayOrder?: number;

  @ApiProperty({
    description: 'Expected amount (must be > 0)',
    example: 50000,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  expectedAmount!: number;

  @ApiPropertyOptional({ description: 'Informational percentage of contract value' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  expectedPercentage?: number;

  @ApiPropertyOptional({ description: 'Due date (ISO date)' })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Free-text notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
