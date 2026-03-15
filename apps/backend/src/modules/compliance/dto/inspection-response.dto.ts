import { InspectionStatus } from '@oneohm-epc/shared/types';
import { Expose, Type } from 'class-transformer';

import { OrganizationResponseDto } from '../../organizations/dto/organization-response.dto';
import { ProjectResponseDto } from '../../projects/dto/projects/project-response.dto';
import { UserResponseDto } from '../../users/dto/user-response.dto';

/**
 * Response DTO for an inspection
 */
export class InspectionResponseDto {
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
  inspectionType: string;

  @Expose()
  inspectionNumber: string;

  @Expose()
  @Type(() => Date)
  scheduledDate: Date;

  @Expose()
  @Type(() => Date)
  actualDate: Date | null;

  @Expose()
  inspectorName: string | null;

  @Expose()
  inspectorOrganization: string | null;

  @Expose()
  inspectorContact: string | null;

  @Expose()
  status: InspectionStatus;

  @Expose()
  inspectionReport: string | null;

  @Expose()
  issuesFound: string | null;

  @Expose()
  correctiveActions: string | null;

  @Expose()
  reportFilePath: string | null;

  @Expose()
  photos: Record<string, unknown> | null;

  @Expose()
  notes: string | null;

  @Expose()
  @Type(() => Date)
  createdAt: Date;

  @Expose()
  @Type(() => Date)
  updatedAt: Date;

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
