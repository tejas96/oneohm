import { ComplianceStatus } from '@oneohm-epc/shared-types';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/**
 * DTO for creating a compliance application
 */
export class CreateComplianceApplicationDto {
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  applicationType: string;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  applicationDate?: Date;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  authorityName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  authorityReferenceNumber?: string;

  @IsEnum(ComplianceStatus)
  @IsOptional()
  status?: ComplianceStatus;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsUUID()
  @IsOptional()
  createdBy?: string;
}
