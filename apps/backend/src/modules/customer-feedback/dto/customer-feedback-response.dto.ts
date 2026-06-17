import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FeedbackMethod, NPSCategory } from '@tejas96/shared/types';
import { Expose, Type } from 'class-transformer';

import { CustomerResponseDto } from '../../customers/dto/customer-response.dto';
import { OrganizationResponseDto } from '../../organizations/dto/organization-response.dto';
import { UserResponseDto } from '../../users/dto/user-response.dto';

/**
 * Response DTO for Customer Feedback
 */
export class CustomerFeedbackResponseDto {
  @ApiProperty({ description: 'Feedback ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Organization ID', example: '123e4567-e89b-12d3-a456-426614174001' })
  @Expose()
  organizationId: string;

  @ApiProperty({ description: 'Project ID', example: '123e4567-e89b-12d3-a456-426614174002' })
  @Expose()
  projectId: string;

  @ApiProperty({ description: 'Customer ID', example: '123e4567-e89b-12d3-a456-426614174003' })
  @Expose()
  customerId: string;

  @ApiPropertyOptional({ description: 'Overall rating (1-5)', example: 5 })
  @Expose()
  overallRating?: number;

  @ApiPropertyOptional({ description: 'NPS score (0-10)', example: 9 })
  @Expose()
  npsScore?: number;

  @ApiPropertyOptional({
    description: 'NPS category',
    enum: NPSCategory,
    example: NPSCategory.PROMOTER,
  })
  @Expose()
  npsCategory?: NPSCategory;

  @ApiProperty({
    description: 'Department ratings',
    example: { sales: 5, installation: 4, service: 5 },
  })
  @Expose()
  departmentRatings: Record<string, number>;

  @ApiPropertyOptional({ description: 'General comments' })
  @Expose()
  generalComments?: string;

  @ApiPropertyOptional({ description: 'Improvement suggestions' })
  @Expose()
  improvementSuggestions?: string;

  @ApiPropertyOptional({ description: 'Would recommend', example: true })
  @Expose()
  wouldRecommend?: boolean;

  @ApiPropertyOptional({
    description: 'Feedback method',
    enum: FeedbackMethod,
    example: FeedbackMethod.ONLINE_FORM,
  })
  @Expose()
  feedbackMethod?: FeedbackMethod;

  @ApiProperty({ description: 'Is published', example: false })
  @Expose()
  isPublished: boolean;

  @ApiPropertyOptional({ description: 'Company response' })
  @Expose()
  companyResponse?: string;

  @ApiPropertyOptional({ description: 'Responded by user ID' })
  @Expose()
  respondedBy?: string;

  @ApiPropertyOptional({ description: 'Responded at timestamp' })
  @Expose()
  respondedAt?: Date;

  @ApiProperty({ description: 'Created at timestamp' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  @Expose()
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Deleted at timestamp' })
  @Expose()
  deletedAt?: Date;

  @ApiPropertyOptional({ description: 'Created by user ID' })
  @Expose()
  createdBy?: string;

  @ApiPropertyOptional({ description: 'Updated by user ID' })
  @Expose()
  updatedBy?: string;

  // Relations
  @ApiPropertyOptional({ description: 'Organization details', type: OrganizationResponseDto })
  @Expose()
  @Type(() => OrganizationResponseDto)
  organization?: OrganizationResponseDto;

  @ApiPropertyOptional({ description: 'Customer details', type: CustomerResponseDto })
  @Expose()
  @Type(() => CustomerResponseDto)
  customer?: CustomerResponseDto;

  @ApiPropertyOptional({ description: 'Responded by user details', type: UserResponseDto })
  @Expose()
  @Type(() => UserResponseDto)
  respondedByUser?: UserResponseDto;

  @ApiPropertyOptional({ description: 'Created by user details', type: UserResponseDto })
  @Expose()
  @Type(() => UserResponseDto)
  createdByUser?: UserResponseDto;

  @ApiPropertyOptional({ description: 'Updated by user details', type: UserResponseDto })
  @Expose()
  @Type(() => UserResponseDto)
  updatedByUser?: UserResponseDto;
}
