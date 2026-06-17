import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FeedbackMethod } from '@tejas96/shared/types';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

/**
 * DTO for Creating Customer Feedback
 */
export class CreateCustomerFeedbackDto {
  @ApiProperty({
    description: 'Organization ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({
    description: 'Project ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({
    description: 'Customer ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsUUID()
  @IsNotEmpty()
  customerId: string;

  // ============================================
  // RATING FIELDS
  // ============================================

  @ApiPropertyOptional({
    description: 'Overall rating (1-5 stars)',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  overallRating?: number;

  @ApiPropertyOptional({
    description: 'Net Promoter Score (0-10)',
    example: 9,
    minimum: 0,
    maximum: 10,
  })
  @IsInt()
  @Min(0)
  @Max(10)
  @IsOptional()
  npsScore?: number;

  // ============================================
  // DEPARTMENT RATINGS
  // ============================================

  @ApiProperty({
    description: 'Department-wise ratings (JSONB)',
    example: {
      sales: 5,
      installation: 4,
      service: 5,
      documentation: 3,
    },
  })
  @IsObject()
  departmentRatings: Record<string, number>;

  // ============================================
  // FEEDBACK CONTENT
  // ============================================

  @ApiPropertyOptional({
    description: 'General comments from customer',
    example: 'Great experience overall. Team was very professional.',
  })
  @IsString()
  @IsOptional()
  generalComments?: string;

  @ApiPropertyOptional({
    description: 'Improvement suggestions from customer',
    example: 'Could improve response time for service requests.',
  })
  @IsString()
  @IsOptional()
  improvementSuggestions?: string;

  // ============================================
  // RECOMMENDATION
  // ============================================

  @ApiPropertyOptional({
    description: 'Would customer recommend our services',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  wouldRecommend?: boolean;

  // ============================================
  // FEEDBACK METHOD
  // ============================================

  @ApiPropertyOptional({
    description: 'Method used to collect feedback',
    enum: FeedbackMethod,
    example: FeedbackMethod.ONLINE_FORM,
  })
  @IsEnum(FeedbackMethod)
  @IsOptional()
  feedbackMethod?: FeedbackMethod;

  // ============================================
  // PUBLISHING
  // ============================================

  @ApiPropertyOptional({
    description: 'Is feedback published as testimonial',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  // ============================================
  // AUDIT
  // ============================================

  @ApiPropertyOptional({
    description: 'User who created this feedback',
    example: '123e4567-e89b-12d3-a456-426614174003',
  })
  @IsUUID()
  @IsOptional()
  createdBy?: string;
}
