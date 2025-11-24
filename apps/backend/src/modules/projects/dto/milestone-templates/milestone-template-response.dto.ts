import { Expose, Type } from 'class-transformer';

import { OrganizationResponseDto } from '../../../organizations/dto/organization-response.dto';
import { UserResponseDto } from '../../../users/dto/user-response.dto';

/**
 * Response DTO for a milestone template
 */
export class MilestoneTemplateResponseDto {
  @Expose()
  id: string;

  @Expose()
  organizationId: string;

  @Expose()
  @Type(() => OrganizationResponseDto)
  organization?: OrganizationResponseDto;

  @Expose()
  name: string;

  @Expose()
  code: string;

  @Expose()
  description: string | null;

  @Expose()
  type: string;

  @Expose()
  requiresPayment: boolean;

  @Expose()
  defaultPaymentPercentage: number | null;

  @Expose()
  sequenceOrder: number;

  @Expose()
  isMandatory: boolean;

  @Expose()
  canSkip: boolean;

  @Expose()
  dependsOnMilestoneCodes: string[] | null;

  @Expose()
  estimatedDurationDays: number | null;

  @Expose()
  isActive: boolean;

  @Expose()
  @Type(() => Date)
  createdAt: Date;

  @Expose()
  @Type(() => Date)
  updatedAt: Date;

  @Expose()
  @Type(() => Date)
  deletedAt: Date | null;

  @Expose()
  createdBy: string | null;

  @Expose()
  @Type(() => UserResponseDto)
  createdByUser?: UserResponseDto;

  @Expose()
  updatedBy: string | null;

  @Expose()
  @Type(() => UserResponseDto)
  updatedByUser?: UserResponseDto;
}
