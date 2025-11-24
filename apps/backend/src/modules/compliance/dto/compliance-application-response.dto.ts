import { ComplianceStatus } from '@oneohm-epc/shared-types';
import { Expose, Type } from 'class-transformer';

import { OrganizationResponseDto } from '../../organizations/dto/organization-response.dto';
import { ProjectResponseDto } from '../../projects/dto/projects/project-response.dto';
import { UserResponseDto } from '../../users/dto/user-response.dto';

/**
 * Response DTO for a compliance application
 */
export class ComplianceApplicationResponseDto {
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
  applicationType: string;

  @Expose()
  applicationNumber: string;

  @Expose()
  @Type(() => Date)
  applicationDate: Date;

  @Expose()
  authorityName: string | null;

  @Expose()
  authorityReferenceNumber: string | null;

  @Expose()
  status: ComplianceStatus;

  @Expose()
  @Type(() => Date)
  submittedAt: Date | null;

  @Expose()
  submittedBy: string | null;

  @Expose()
  @Type(() => UserResponseDto)
  submittedByUser?: UserResponseDto;

  @Expose()
  @Type(() => Date)
  approvedAt: Date | null;

  @Expose()
  approvalDocumentPath: string | null;

  @Expose()
  rejectionReason: string | null;

  @Expose()
  @Type(() => Date)
  rejectedAt: Date | null;

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
