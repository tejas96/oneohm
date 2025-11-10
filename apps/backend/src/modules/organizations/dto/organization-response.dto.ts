import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationStatus } from '@oneohm-epc/shared-types';
import { Exclude, Expose, Type } from 'class-transformer';

/**
 * DTO for organization response
 * Used to transform and serialize organization data in API responses
 */
@Exclude()
export class OrganizationResponseDto {
  @Expose()
  @ApiProperty({ description: 'Organization ID' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'Organization name' })
  name: string;

  @Expose()
  @ApiProperty({ description: 'Organization code' })
  code: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Organization email' })
  email: string | null;

  @Expose()
  @ApiPropertyOptional({ description: 'Organization phone' })
  phone: string | null;

  @Expose()
  @ApiPropertyOptional({ description: 'Address' })
  address: string | null;

  @Expose()
  @ApiPropertyOptional({ description: 'City' })
  city: string | null;

  @Expose()
  @ApiPropertyOptional({ description: 'State' })
  state: string | null;

  @Expose()
  @ApiProperty({ description: 'Country' })
  country: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Pincode' })
  pincode: string | null;

  @Expose()
  @ApiPropertyOptional({ description: 'GSTIN' })
  gstin: string | null;

  @Expose()
  @ApiPropertyOptional({ description: 'PAN' })
  pan: string | null;

  @Expose()
  @ApiProperty({ description: 'Timezone' })
  timezone: string;

  @Expose()
  @ApiProperty({ description: 'Currency' })
  currency: string;

  @Expose()
  @ApiProperty({ description: 'Date format' })
  dateFormat: string;

  @Expose()
  @ApiProperty({ description: 'Default project timeline in weeks' })
  defaultProjectTimelineWeeks: number;

  @Expose()
  @ApiProperty({ description: 'Default quote validity in days' })
  defaultQuoteValidityDays: number;

  @Expose()
  @ApiProperty({ description: 'Maximum quote versions' })
  maxQuoteVersions: number;

  @Expose()
  @ApiProperty({ description: 'Organization status', enum: OrganizationStatus })
  status: OrganizationStatus;

  @Expose()
  @ApiPropertyOptional({ description: 'Subscription plan' })
  subscriptionPlan: string | null;

  @Expose()
  @ApiPropertyOptional({ description: 'Subscription expiration date' })
  subscriptionExpiresAt: Date | null;

  @Expose()
  @ApiProperty({ description: 'Created at timestamp' })
  @Type(() => Date)
  createdAt: Date;

  @Expose()
  @ApiProperty({ description: 'Updated at timestamp' })
  @Type(() => Date)
  updatedAt: Date;

  @Expose()
  @ApiPropertyOptional({ description: 'Created by user ID' })
  createdBy: string | null;

  @Expose()
  @ApiPropertyOptional({ description: 'Updated by user ID' })
  updatedBy: string | null;
}
