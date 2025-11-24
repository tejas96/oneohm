import { SubsidyStatus } from '@oneohm-epc/shared-types';
import { Expose, Type } from 'class-transformer';

import { CustomerResponseDto } from '../../customers/dto/customer-response.dto';
import { OrganizationResponseDto } from '../../organizations/dto/organization-response.dto';
import { ProjectResponseDto } from '../../projects/dto/projects/project-response.dto';
import { UserResponseDto } from '../../users/dto/user-response.dto';

/**
 * Response DTO for a subsidy application
 */
export class SubsidyApplicationResponseDto {
  @Expose()
  id: string;

  @Expose()
  organizationId: string;

  @Expose()
  @Type(() => OrganizationResponseDto)
  organization?: OrganizationResponseDto;

  @Expose()
  projectId: string;

  @Expose()
  @Type(() => ProjectResponseDto)
  project?: ProjectResponseDto;

  @Expose()
  customerId: string;

  @Expose()
  @Type(() => CustomerResponseDto)
  customer?: CustomerResponseDto;

  @Expose()
  applicationNumber: string;

  @Expose()
  @Type(() => Date)
  applicationDate: Date;

  @Expose()
  subsidyScheme: string | null;

  @Expose()
  appliedAmount: number;

  @Expose()
  portalName: string | null;

  @Expose()
  portalApplicationId: string | null;

  @Expose()
  status: SubsidyStatus;

  @Expose()
  approvedAmount: number | null;

  @Expose()
  @Type(() => Date)
  approvedAt: Date | null;

  @Expose()
  @Type(() => Date)
  disbursementDate: Date | null;

  @Expose()
  disbursementAmount: number | null;

  @Expose()
  disbursementMode: string | null;

  @Expose()
  disbursementReference: string | null;

  @Expose()
  rejectionReason: string | null;

  @Expose()
  notes: string | null;

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
